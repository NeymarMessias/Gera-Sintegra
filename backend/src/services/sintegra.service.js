import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { createExtractorFromFile } from 'node-unrar-js'
import { prisma } from '../lib/prisma.js'
import { parseXml, parseXmlContent } from '../engine/xmlReaderV2.js'
import { GeradorSintegra } from '../engine/index.js'
import { UPLOAD_DIR } from '../config/env.js'
import { normalizarUF } from '../utils/stringUtils.js'

/**
 * Classifica e salva um buffer XML já extraído do arquivo compactado.
 * Reutilizado tanto pelo extrator ZIP quanto RAR.
 */
function _isXmlFileName(fileName) {
  const n = String(fileName || '').replace(/\\/g, '/').trim().toLowerCase()
  return n.endsWith('.xml')
}

function _safeStoredName(fileName) {
  const normalized = String(fileName || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('__')
  // evita caracteres problemáticos em nome de arquivo no Windows
  return normalized.replace(/[<>:"|?*]/g, '_')
}

async function _classificarXmlBuffer(
  generationId,
  nomeArquivo,
  xmlBuffer,
  resultado,
  cnpjEmpresa = '',
  originalName = nomeArquivo
) {
  try {
    const xmlContent = Buffer.isBuffer(xmlBuffer) ? xmlBuffer.toString('utf8') : String(xmlBuffer || '')
    const nfe = await parseXmlContent(xmlContent, originalName)
    if (!nfe) {
      // Loga os primeiros 300 chars para diagnóstico
      try {
        const preview = xmlContent.slice(0, 300)
        console.warn(`[archive] parseXml null para '${nomeArquivo}'. Início do conteúdo:\n${preview}`)
      } catch {}
      resultado.ignorados.push(nomeArquivo)
      return
    }

    const cnpjEmit = String(nfe.emit?.CNPJ || '').replace(/\D/g, '')
    const cnpjDest = String(nfe.dest?.CNPJ || '').replace(/\D/g, '')
    const cnpjEmpresaLimpo = String(cnpjEmpresa || '').replace(/\D/g, '')

    let isSaida
    if (cnpjEmpresaLimpo && cnpjEmit) {
      isSaida = cnpjEmit === cnpjEmpresaLimpo
    } else if (cnpjEmpresaLimpo && cnpjDest && !cnpjEmit) {
      isSaida = cnpjDest !== cnpjEmpresaLimpo
    } else {
      isSaida = nfe.tpNF === '1'
    }

    let fileType
    if (nfe.modelo === '65') {
      fileType = isSaida ? 'saida_65' : 'entrada_65'
    } else if (nfe.modelo === '57' || nfe.modelo === '67') {
      fileType = isSaida ? 'saida_57_67' : 'entrada_57_67'
    } else {
      fileType = isSaida ? 'saida_55' : 'entrada_55'
    }

    const destDir = path.join(UPLOAD_DIR, generationId, fileType)
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

    let destPath = path.join(destDir, nomeArquivo)
    if (fs.existsSync(destPath)) {
      const ext = path.extname(nomeArquivo)
      const base = path.basename(nomeArquivo, ext)
      destPath = path.join(destDir, `${base}_${Date.now()}${ext}`)
    }

    fs.writeFileSync(destPath, xmlBuffer)

    await prisma.generationFile.create({
      data: {
        originalName,
        storedPath: destPath,
        fileType,
        generationId,
      },
    })

    resultado[fileType].push(originalName)
  } catch (err) {
    console.error(`[archive] Erro ao processar '${originalName}':`, err.message)
    resultado.ignorados.push(originalName)
  }
}

/**
 * Extrai um arquivo .zip ou .rar, identifica automaticamente o tipo de cada XML
 * (entrada_55 / saida_55 / entrada_65 / saida_65 / entrada_57_67 / saida_57_67)
 * e salva os arquivos na geração.
 *
 * @param {string} generationId
 * @param {string} archivePath  Caminho do arquivo .zip ou .rar no disco
 * @returns {{ entrada_55: string[], saida_55: string[], entrada_65: string[], saida_65: string[], entrada_57_67: string[], saida_57_67: string[], ignorados: string[] }}
 */
export async function extractAndClassifyArchive(generationId, archivePath) {
  const resultado = {
    entrada_55: [],
    saida_55: [],
    entrada_65: [],
    saida_65: [],
    entrada_57_67: [],
    saida_57_67: [],
    ignorados: [],
  }
  const ext = path.extname(archivePath).toLowerCase()
  const generation = await prisma.generation.findUnique({
    where: { id: generationId },
    include: { company: true },
  })
  const cnpjEmpresa = generation?.company?.cnpj || ''

  if (ext === '.zip') {
    const zip = new AdmZip(archivePath)
    const entries = zip.getEntries().filter(
      (e) => !e.isDirectory && _isXmlFileName(e.entryName)
    )
    for (const entry of entries) {
      const originalName = String(entry.entryName || '').replace(/\\/g, '/')
      const nomeArquivo = _safeStoredName(originalName)
      await _classificarXmlBuffer(
        generationId,
        nomeArquivo,
        entry.getData(),
        resultado,
        cnpjEmpresa,
        originalName
      )
    }
  } else if (ext === '.rar') {
    const absolutePath = path.resolve(archivePath)
    console.log('[archive:rar] Extraindo:', absolutePath)

    // Diretório temporário para extração no disco
    const extractDir = path.join(UPLOAD_DIR, 'tmp', `rar_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    fs.mkdirSync(extractDir, { recursive: true })

    try {
      const extractor = await createExtractorFromFile({
        filepath: absolutePath,
        targetPath: extractDir,
      })

      let extracted
      try {
        extracted = extractor.extract()
      } catch (err) {
        throw new Error(`Não foi possível abrir o arquivo RAR: ${err.message}`)
      }

      // Itera os headers para obter os nomes dos arquivos extraídos
      for (const file of extracted.files) {
        const name = file?.fileHeader?.name || ''
        if (file?.fileHeader?.flags?.directory || !_isXmlFileName(name)) continue

        const originalName = String(name).replace(/\\/g, '/')
        const nomeArquivo = _safeStoredName(originalName)
        // O arquivo foi extraído em extractDir mantendo a estrutura interna do RAR
        const extractedPath = path.join(extractDir, name)

        if (!fs.existsSync(extractedPath)) {
          console.warn(`[archive:rar] Arquivo extraído não encontrado: ${extractedPath}`)
          resultado.ignorados.push(nomeArquivo)
          continue
        }

        const xmlBuffer = fs.readFileSync(extractedPath)
        console.log(`[archive:rar] Lido '${nomeArquivo}' - ${xmlBuffer.length} bytes`)

        try {
          await _classificarXmlBuffer(
            generationId,
            nomeArquivo,
            xmlBuffer,
            resultado,
            cnpjEmpresa,
            originalName
          )
        } catch (err) {
          console.error(`[archive:rar] Erro ao processar '${originalName}':`, err.message)
          resultado.ignorados.push(originalName)
        }
      }
    } finally {
      // Remove diretório temporário de extração
      try { fs.rmSync(extractDir, { recursive: true, force: true }) } catch {}
    }
  } else {
    throw new Error(`Formato não suportado: ${ext}. Use .zip ou .rar.`)
  }

  console.log('[extractAndClassifyArchive] Resultado:', {
    formato: ext,
    entrada_55: resultado.entrada_55.length,
    saida_55: resultado.saida_55.length,
    entrada_65: resultado.entrada_65.length,
    saida_65: resultado.saida_65.length,
    entrada_57_67: resultado.entrada_57_67.length,
    saida_57_67: resultado.saida_57_67.length,
    ignorados: resultado.ignorados.length,
  })

  return resultado
}

// Mantém o nome antigo para retrocompatibilidade
export const extractAndClassifyZip = extractAndClassifyArchive

/**
 * Executa a geração do arquivo SINTEGRA para uma determinada geração.
 *
 * @param {string} generationId
 * @param {string} userId  (para log / auditoria)
 * @returns {object} Geração atualizada com stats
 */
export async function run(generationId, userId, { codFinalidade = '1', codConvenio = '3', codNatureza = '3' } = {}) {
  // Busca a geração com arquivos e empresa
  const generation = await prisma.generation.findUnique({
    where: { id: generationId },
    include: {
      files: true,
      company: true,
    },
  })

  if (!generation) {
    const err = new Error('Geração não encontrada.')
    err.status = 404
    throw err
  }

  if (generation.status === 'RUNNING') {
    const err = new Error('Esta geração já está em execução.')
    err.status = 409
    throw err
  }

  // Marca como RUNNING
  await prisma.generation.update({
    where: { id: generationId },
    data: { status: 'RUNNING', errorMsg: null },
  })

  try {
    // Lê e parseia todos os arquivos XML
    const notas = []
    const errosXml = []
    for (const file of generation.files) {
      const nfe = await parseXml(file.storedPath)
      if (nfe) {
        notas.push(nfe)
      } else {
        errosXml.push(file.originalName)
      }
    }

    if (errosXml.length > 0 && notas.length === 0) {
      throw new Error(
        `Nenhum XML válido encontrado. Arquivos com erro ou formato inválido: ${errosXml.join(', ')}. ` +
        `Verifique se os arquivos são NF-e/NFC-e/CT-e válidos (modelos 55, 65, 57 ou 67).`
      )
    }

    if (errosXml.length > 0) {
      console.warn(`[sintegra.service] ${errosXml.length} arquivo(s) ignorado(s) por erro de leitura: ${errosXml.join(', ')}`)
    }

    // Separa por modelo
    const notas55 = notas.filter((n) => n.modelo === '55')
    const notas65 = notas.filter((n) => n.modelo === '65')
    const notas57e67 = notas.filter((n) => n.modelo === '57' || n.modelo === '67')

    // Valida CNPJ do emitente nas notas de saída: deve bater com o CNPJ da empresa
    const cnpjEmpresa = (generation.company.cnpj || '').replace(/\D/g, '')
    const alertasCnpj = []

    for (const nfe of notas) {
      const cnpjEmit = (nfe.emit?.CNPJ || '').replace(/\D/g, '')
      const isSaida = cnpjEmit && cnpjEmpresa ? cnpjEmit === cnpjEmpresa : nfe.tpNF === '1'
      if (isSaida) {
        if (cnpjEmit && cnpjEmit !== cnpjEmpresa) {
          alertasCnpj.push({
            nNF: nfe.nNF,
            serie: nfe.serie,
            modelo: nfe.modelo,
            cnpjXml: cnpjEmit,
            cnpjEmpresa,
          })
        }
      }
    }

    if (alertasCnpj.length > 0) {
      console.warn(
        '[sintegra.service] XMLs de saída com CNPJ emitente diferente da empresa cadastrada:',
        alertasCnpj.map((a) => `NF ${a.nNF}/${a.serie} mod${a.modelo} (XML:${a.cnpjXml} != Empresa:${a.cnpjEmpresa})`).join('; ')
      )
    }

    // Registros 10 e 11 sempre usam os dados cadastrados da empresa (não do XML)
    const company = generation.company
    const emitente = {
      CNPJ: company.cnpj,
      xNome: company.name,
      xFant: company.name,
      IE: company.ie,
      CRT: '',
      enderEmit: {
        xLgr: company.logradouro,
        nro: company.numero,
        xCpl: company.complemento,
        xBairro: company.bairro,
        cMun: '',
        xMun: company.municipio,
        UF: normalizarUF(company.uf),
        CEP: company.cep,
        fone: company.fone,
      },
    }

    console.log('[sintegra.service] Emitente (dados da empresa):', {
      CNPJ: emitente.CNPJ,
      IE: emitente.IE,
      xNome: emitente.xNome,
      xMun: emitente.enderEmit.xMun,
      UF: emitente.enderEmit.UF,
    })

    // Define caminho de saída
    const outputDir = path.join(UPLOAD_DIR, generationId, 'output')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const dtIni = new Date(generation.periodStart)
    const dtFin = new Date(generation.periodEnd)

    // Nome do arquivo: SINTEGRA_YYYYMMDD_YYYYMMDD.txt (usa UTC para evitar shift de timezone)
    const fmtDate = (d) => {
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${y}${m}${day}`
    }
    const fileName = `SINTEGRA_${fmtDate(dtIni)}_${fmtDate(dtFin)}.txt`
    const outputPath = path.join(outputDir, fileName)

    const gerador = new GeradorSintegra(emitente, dtIni, dtFin, {
      codFinalidade,
      codConvenio,
      codNatureza,
    })
    const stats = await gerador.gerar(notas55, notas65, notas57e67, outputPath)

    // Atualiza geração com status DONE
    const updated = await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'DONE',
        outputFile: outputPath,
        stats: JSON.stringify(stats),
        errorMsg: null,
      },
    })

    return { generation: updated, stats, alertasCnpj }
  } catch (err) {
    console.error('[sintegra.service] Erro ao gerar:', err)

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'ERROR',
        errorMsg: err.message || 'Erro desconhecido.',
      },
    })

    throw err
  }
}

/**
 * Retorna estatísticas agregadas para o dashboard.
 * @param {string|null} companyId  Se informado, filtra por empresa.
 */
export async function stats(companyId = null) {
  const where = companyId ? { companyId } : {}

  const [total, done, error, pending, running, companies, files] = await Promise.all([
    prisma.generation.count({ where }),
    prisma.generation.count({ where: { ...where, status: 'DONE' } }),
    prisma.generation.count({ where: { ...where, status: 'ERROR' } }),
    prisma.generation.count({ where: { ...where, status: 'PENDING' } }),
    prisma.generation.count({ where: { ...where, status: 'RUNNING' } }),
    companyId ? Promise.resolve(1) : prisma.company.count({ where: { active: true } }),
    prisma.generationFile.count({
      where: companyId ? { generation: { companyId } } : {},
    }),
  ])

  return {
    generations: { total, done, error, pending, running },
    companies,
    files,
  }
}
