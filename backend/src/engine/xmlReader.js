import fs from 'fs'
import path from 'path'
import xml2js from 'xml2js'
import {
  createNFe,
  createEmitente,
  createDestinatario,
  createEndereco,
  createItem,
  createTotal,
  createImpostoICMS,
  createImpostoIPI,
  createImpostoPIS,
  createImpostoCOFINS,
} from './models.js'

const parseOptions = {
  explicitArray: false,
  tagNameProcessors: [xml2js.processors.stripPrefix],
  attrNameProcessors: [xml2js.processors.stripPrefix],
}

/**
 * Retorna texto de um campo aninhado ou string vazia.
 * @param {object} obj
 * @param {string[]} keys
 * @returns {string}
 */
function _get(obj, ...keys) {
  let cur = obj
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return ''
    cur = cur[k]
  }
  if (cur == null) return ''
  return String(cur).trim()
}

/**
 * Converte string "YYYY-MM-DDTHH:MM:SS..." para objeto Date.
 * Ignora o fuso horário e usa os primeiros 19 chars.
 */
function _parseDate(valor) {
  if (!valor) return null
  const s = String(valor).trim().slice(0, 19)
  // "YYYY-MM-DDTHH:MM:SS"
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d
}

function _parseEndereco(endObj) {
  if (!endObj) return createEndereco()
  return {
    xLgr: _get(endObj, 'xLgr'),
    nro: _get(endObj, 'nro'),
    xCpl: _get(endObj, 'xCpl'),
    xBairro: _get(endObj, 'xBairro'),
    cMun: _get(endObj, 'cMun'),
    xMun: _get(endObj, 'xMun'),
    UF: _get(endObj, 'UF'),
    CEP: _get(endObj, 'CEP'),
    fone: _get(endObj, 'fone'),
  }
}

function _parseEmitente(emitObj) {
  if (!emitObj) return createEmitente()
  return {
    CNPJ: _get(emitObj, 'CNPJ'),
    xNome: _get(emitObj, 'xNome'),
    xFant: _get(emitObj, 'xFant'),
    IE: _get(emitObj, 'IE'),
    CRT: _get(emitObj, 'CRT'),
    enderEmit: _parseEndereco(emitObj.enderEmit),
  }
}

function _parseDestinatario(destObj) {
  if (!destObj) return createDestinatario()
  return {
    CNPJ: _get(destObj, 'CNPJ'),
    CPF: _get(destObj, 'CPF'),
    xNome: _get(destObj, 'xNome'),
    IE: _get(destObj, 'IE'),
    indIEDest: _get(destObj, 'indIEDest'),
    enderDest: _parseEndereco(destObj.enderDest),
  }
}

function _parseICMS(impostoObj) {
  if (!impostoObj) return createImpostoICMS()
  const icmsContainer = impostoObj.ICMS
  if (!icmsContainer) return createImpostoICMS()

  // Pega o primeiro filho do objeto ICMS (ICMS00, ICMS10, ICMS20, ICMS40, ICMS41, ICMS60, ICMS70, ICMS90, ICMSSN...)
  const childKeys = Object.keys(icmsContainer).filter(k => k !== '$')
  if (childKeys.length === 0) return createImpostoICMS()

  const child = icmsContainer[childKeys[0]]
  if (!child) return createImpostoICMS()

  return {
    orig: _get(child, 'orig'),
    cst: _get(child, 'CST') || _get(child, 'CSOSN'),
    modBC: _get(child, 'modBC'),
    vBC: _get(child, 'vBC') || '0',
    pICMS: _get(child, 'pICMS') || '0',
    vICMS: _get(child, 'vICMS') || '0',
    modBCST: _get(child, 'modBCST'),
    vBCST: _get(child, 'vBCST') || '0',
    vICMSST: _get(child, 'vICMSST') || '0',
  }
}

function _parseIPI(impostoObj) {
  if (!impostoObj) return createImpostoIPI()
  const ipiContainer = impostoObj.IPI
  if (!ipiContainer) return createImpostoIPI()

  // IPI pode estar em IPITrib ou IPINT
  const childKeys = Object.keys(ipiContainer).filter(k => k !== '$')
  if (childKeys.length === 0) return createImpostoIPI()

  const child = ipiContainer[childKeys[0]]
  if (!child) return createImpostoIPI()

  return {
    cst: _get(child, 'CST'),
    vIPI: _get(child, 'vIPI') || '0',
    pIPI: _get(child, 'pIPI') || '0',
  }
}

function _parsePIS(impostoObj) {
  if (!impostoObj) return createImpostoPIS()
  const pisContainer = impostoObj.PIS
  if (!pisContainer) return createImpostoPIS()

  const childKeys = Object.keys(pisContainer).filter(k => k !== '$')
  if (childKeys.length === 0) return createImpostoPIS()

  const child = pisContainer[childKeys[0]]
  if (!child) return createImpostoPIS()

  return {
    cst: _get(child, 'CST'),
    vBC: _get(child, 'vBC') || '0',
    pPIS: _get(child, 'pPIS') || '0',
    vPIS: _get(child, 'vPIS') || '0',
  }
}

function _parseCOFINS(impostoObj) {
  if (!impostoObj) return createImpostoCOFINS()
  const cofinsContainer = impostoObj.COFINS
  if (!cofinsContainer) return createImpostoCOFINS()

  const childKeys = Object.keys(cofinsContainer).filter(k => k !== '$')
  if (childKeys.length === 0) return createImpostoCOFINS()

  const child = cofinsContainer[childKeys[0]]
  if (!child) return createImpostoCOFINS()

  return {
    cst: _get(child, 'CST'),
    vBC: _get(child, 'vBC') || '0',
    pCOFINS: _get(child, 'pCOFINS') || '0',
    vCOFINS: _get(child, 'vCOFINS') || '0',
  }
}

function _parseItem(detObj) {
  if (!detObj) return createItem()

  const prod = detObj.prod || {}
  const imposto = detObj.imposto || {}

  const nItemAttr = detObj.$ ? _get(detObj.$, 'nItem') : ''
  const nItem = parseInt(_get(prod, 'nItem') || nItemAttr || '0', 10)

  return {
    nItem,
    cProd: _get(prod, 'cProd'),
    cEAN: _get(prod, 'cEAN'),
    xProd: _get(prod, 'xProd'),
    NCM: _get(prod, 'NCM'),
    CFOP: _get(prod, 'CFOP'),
    uCom: _get(prod, 'uCom'),
    qCom: _get(prod, 'qCom') || '0',
    vUnCom: _get(prod, 'vUnCom') || '0',
    vProd: _get(prod, 'vProd') || '0',
    vDesc: _get(prod, 'vDesc') || '0',
    icms: _parseICMS(imposto),
    ipi: _parseIPI(imposto),
    pis: _parsePIS(imposto),
    cofins: _parseCOFINS(imposto),
  }
}

function _parseTotal(totalObj) {
  if (!totalObj) return createTotal()
  const icmsTot = totalObj.ICMSTot || {}
  return {
    vBC: _get(icmsTot, 'vBC') || '0',
    vICMS: _get(icmsTot, 'vICMS') || '0',
    vICMSDeson: _get(icmsTot, 'vICMSDeson') || '0',
    vBCST: _get(icmsTot, 'vBCST') || '0',
    vST: _get(icmsTot, 'vST') || '0',
    vProd: _get(icmsTot, 'vProd') || '0',
    vFrete: _get(icmsTot, 'vFrete') || '0',
    vSeg: _get(icmsTot, 'vSeg') || '0',
    vDesc: _get(icmsTot, 'vDesc') || '0',
    vIPI: _get(icmsTot, 'vIPI') || '0',
    vPIS: _get(icmsTot, 'vPIS') || '0',
    vCOFINS: _get(icmsTot, 'vCOFINS') || '0',
    vOutro: _get(icmsTot, 'vOutro') || '0',
    vNF: _get(icmsTot, 'vNF') || '0',
  }
}

/**
 * Faz o parse de um arquivo XML de NF-e ou NFC-e.
 * Retorna objeto NFe ou null em caso de erro.
 * @param {string} filePath
 * @returns {Promise<object|null>}
 */
export async function parseXml(filePath) {
  try {
    const xmlContent = fs.readFileSync(filePath, 'utf8')
    const parsed = await xml2js.parseStringPromise(xmlContent, parseOptions)

    // O root pode ser nfeProc (nota processada) ou NFe (nota avulsa)
    const root = parsed

    // Localiza infNFe: pode estar em nfeProc.NFe.infNFe ou NFe.infNFe
    let infNFe = null
    if (root.nfeProc) {
      infNFe = root.nfeProc?.NFe?.infNFe
    } else if (root.NFe) {
      infNFe = root.NFe?.infNFe
    } else if (root.infNFe) {
      infNFe = root.infNFe
    }

    if (!infNFe) {
      console.warn(`[xmlReader] infNFe não encontrado em '${filePath}'`)
      return null
    }

    const nfe = createNFe()

    // Chave de acesso (atributo Id)
    const chaveId = infNFe.$ ? (infNFe.$['Id'] || '') : ''
    nfe.chave = chaveId.startsWith('NFe') ? chaveId.slice(3) : chaveId

    // Identificação
    const ide = infNFe.ide || {}
    nfe.cUF = _get(ide, 'cUF')
    nfe.cNF = _get(ide, 'cNF')
    nfe.natOp = _get(ide, 'natOp')
    nfe.modelo = _get(ide, 'mod')
    nfe.serie = _get(ide, 'serie')
    nfe.nNF = _get(ide, 'nNF')
    nfe.dhEmi = _parseDate(_get(ide, 'dhEmi'))
    nfe.dhSaiEnt = _parseDate(_get(ide, 'dhSaiEnt'))
    nfe.tpNF = _get(ide, 'tpNF')
    nfe.cMunFG = _get(ide, 'cMunFG')
    nfe.tpEmis = _get(ide, 'tpEmis')
    nfe.finNFe = _get(ide, 'finNFe')

    // Emitente
    nfe.emit = _parseEmitente(infNFe.emit)

    // Destinatário (opcional em NFC-e)
    if (infNFe.dest) {
      nfe.dest = _parseDestinatario(infNFe.dest)
    }

    // Itens: det pode ser array ou objeto único (xml2js com explicitArray:false)
    const detRaw = infNFe.det
    if (detRaw) {
      const detArray = Array.isArray(detRaw) ? detRaw : [detRaw]
      for (let i = 0; i < detArray.length; i++) {
        const det = detArray[i]
        const item = _parseItem(det)
        // nItem vem do atributo nItem do elemento det
        if (det.$ && det.$.nItem) {
          item.nItem = parseInt(det.$.nItem, 10)
        } else if (item.nItem === 0) {
          item.nItem = i + 1
        }
        nfe.itens.push(item)
      }
    }

    // Total
    nfe.total = _parseTotal(infNFe.total)

    // Protocolo de autorização
    let infProt = null
    if (root.nfeProc?.protNFe?.infProt) {
      infProt = root.nfeProc.protNFe.infProt
    }
    if (infProt) {
      nfe.nProt = _get(infProt, 'nProt')
      nfe.cStat = _get(infProt, 'cStat')
    }

    return nfe
  } catch (err) {
    console.error(`[xmlReader] Erro ao parsear '${filePath}':`, err.message)
    return null
  }
}

/**
 * Lê todos os arquivos .xml de um diretório e retorna array de NFe.
 * @param {string} dirPath
 * @returns {Promise<object[]>}
 */
export async function lerPasta(dirPath) {
  const notas = []

  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    console.warn(`[xmlReader] Pasta não encontrada: ${dirPath}`)
    return notas
  }

  const arquivos = fs
    .readdirSync(dirPath)
    .filter((f) => f.toLowerCase().endsWith('.xml'))
    .sort()

  console.log(`[xmlReader] Encontrados ${arquivos.length} arquivo(s) XML em '${dirPath}'`)

  for (const arquivo of arquivos) {
    const caminho = path.join(dirPath, arquivo)
    const nfe = await parseXml(caminho)
    if (nfe !== null) {
      notas.push(nfe)
    } else {
      console.warn(`[xmlReader] Ignorado: ${arquivo}`)
    }
  }

  return notas
}
