import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import * as sintegraService from '../services/sintegra.service.js'
import { UPLOAD_DIR } from '../config/env.js'

/**
 * POST /api/sintegra/generations/:id/upload-zip
 * Recebe um arquivo .zip, extrai os XMLs e os classifica automaticamente.
 */
export async function uploadZip(req, res, next) {
  try {
    const { id } = req.params

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo .zip enviado.' })
    }

    // Verifica acesso à geração
    const where = buildGenerationWhere(req.user)
    const generation = await prisma.generation.findFirst({
      where: { id, ...where },
    })

    if (!generation) {
      fs.unlinkSync(req.file.path)
      return res.status(404).json({ error: 'Geração não encontrada.' })
    }

    try {
      const resultado = await sintegraService.extractAndClassifyArchive(id, req.file.path)

      const total = resultado.entrada_55.length + resultado.saida_55.length + resultado.saida_65.length

      if (total === 0 && resultado.ignorados.length > 0) {
        return res.status(422).json({
          error: 'Nenhum XML válido encontrado no arquivo compactado.',
          ignorados: resultado.ignorados,
        })
      }

      if (total === 0) {
        return res.status(422).json({
          error: 'Nenhum arquivo XML encontrado no arquivo compactado.',
        })
      }

      return res.status(201).json({ ...resultado, total })
    } catch (extractErr) {
      console.error('[uploadZip] Erro ao extrair arquivo:', extractErr)
      const status = extractErr.status || 422
      return res.status(status).json({
        error: `Erro ao extrair o arquivo: ${extractErr.message}`,
      })
    } finally {
      try { fs.unlinkSync(req.file.path) } catch {}
    }
  } catch (err) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path) } catch {}
    }
    next(err)
  }
}

/**
 * Retorna where clause de geração baseado no role do usuário.
 */
function buildGenerationWhere(user) {
  if (user.role === 'MASTER') return {}
  if (user.companyId) return { companyId: user.companyId }
  return { userId: user.id }
}

/**
 * GET /api/sintegra/generations
 */
export async function list(req, res, next) {
  try {
    const where = buildGenerationWhere(req.user)

    const generations = await prisma.generation.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, cnpj: true } },
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { files: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.json(generations)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/sintegra/generations/stats
 */
export async function getStats(req, res, next) {
  try {
    const companyId = req.user.role === 'MASTER' ? null : req.user.companyId
    const data = await sintegraService.stats(companyId)
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/sintegra/generations/:id
 */
export async function getOne(req, res, next) {
  try {
    const where = buildGenerationWhere(req.user)

    const generation = await prisma.generation.findFirst({
      where: { id: req.params.id, ...where },
      include: {
        files: true,
        company: { select: { id: true, name: true, cnpj: true, uf: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    })

    if (!generation) {
      return res.status(404).json({ error: 'Geração não encontrada.' })
    }

    // Parse stats se existir
    if (generation.stats) {
      try {
        generation.stats = JSON.parse(generation.stats)
      } catch {
        // mantém como string
      }
    }

    return res.json(generation)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/sintegra/generations
 * Body: { periodStart, periodEnd, companyId? }
 */
export async function create(req, res, next) {
  try {
    const { periodStart, periodEnd } = req.body

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart e periodEnd são obrigatórios.' })
    }

    // Determina empresa
    let companyId = req.body.companyId
    if (!companyId) {
      if (!req.user.companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório para usuários sem empresa vinculada.' })
      }
      companyId = req.user.companyId
    }

    // MASTER pode criar para qualquer empresa; outros só para a própria
    if (req.user.role !== 'MASTER' && companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Acesso negado.' })
    }

    const generation = await prisma.generation.create({
      data: {
        status: 'PENDING',
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        companyId,
        userId: req.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    })

    return res.status(201).json(generation)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/sintegra/generations/:id/files
 * Multer já processou os arquivos em req.files
 * Body field: fileType (saida55 | entrada55 | saida65)
 */
export async function uploadFiles(req, res, next) {
  try {
    const { id } = req.params
    const fileType = req.body.fileType || 'saida55'

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' })
    }

    // Verifica se a geração existe e o usuário tem acesso
    const where = buildGenerationWhere(req.user)
    const generation = await prisma.generation.findFirst({
      where: { id, ...where },
    })

    if (!generation) {
      // Remove arquivos temporários
      for (const f of req.files) {
        fs.unlinkSync(f.path)
      }
      return res.status(404).json({ error: 'Geração não encontrada.' })
    }

    // Cria diretório destino
    const destDir = path.join(UPLOAD_DIR, id, fileType)
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    const savedFiles = []

    for (const file of req.files) {
      const destPath = path.join(destDir, file.originalname)

      // Move arquivo do tmp para o destino final
      fs.renameSync(file.path, destPath)

      const saved = await prisma.generationFile.create({
        data: {
          originalName: file.originalname,
          storedPath: destPath,
          fileType,
          generationId: id,
        },
      })

      savedFiles.push(saved)
    }

    return res.status(201).json({ files: savedFiles })
  } catch (err) {
    // Tenta limpar arquivos temporários em caso de erro
    if (req.files) {
      for (const f of req.files) {
        try { fs.unlinkSync(f.path) } catch {}
      }
    }
    next(err)
  }
}

/**
 * POST /api/sintegra/generations/:id/run
 */
export async function runGeneration(req, res, next) {
  try {
    const { id } = req.params

    // Verifica acesso
    const where = buildGenerationWhere(req.user)
    const generation = await prisma.generation.findFirst({
      where: { id, ...where },
    })

    if (!generation) {
      return res.status(404).json({ error: 'Geração não encontrada.' })
    }

    const { codFinalidade, codConvenio, codNatureza } = req.body || {}

    try {
      const result = await sintegraService.run(id, req.user.id, { codFinalidade, codConvenio, codNatureza })
      return res.json(result)
    } catch (err) {
      console.error('[runGeneration] Erro ao processar SINTEGRA:', err)
      const status = err.status && err.status < 500 ? err.status : 422
      return res.status(status).json({ error: err.message || 'Erro ao processar SINTEGRA.' })
    }
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/sintegra/generations/:id/download
 * Faz stream do arquivo SINTEGRA gerado.
 */
export async function download(req, res, next) {
  try {
    const { id } = req.params
    const where = buildGenerationWhere(req.user)

    const generation = await prisma.generation.findFirst({
      where: { id, ...where },
    })

    if (!generation) {
      return res.status(404).json({ error: 'Geração não encontrada.' })
    }

    if (!generation.outputFile || !fs.existsSync(generation.outputFile)) {
      return res.status(404).json({ error: 'Arquivo SINTEGRA não encontrado. Execute a geração primeiro.' })
    }

    const fileName = path.basename(generation.outputFile)

    res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

    const stream = fs.createReadStream(generation.outputFile)
    stream.on('error', (err) => next(err))
    stream.pipe(res)
  } catch (err) {
    next(err)
  }
}
