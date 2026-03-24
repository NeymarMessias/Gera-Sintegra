import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authMiddleware } from '../middleware/auth.js'
import {
  list,
  getStats,
  getOne,
  create,
  uploadFiles,
  uploadZip,
  runGeneration,
  download,
} from '../controllers/sintegra.controller.js'
import { UPLOAD_DIR } from '../config/env.js'

// Garante que o diretório tmp existe
const tmpDir = path.join(UPLOAD_DIR, 'tmp')
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir)
  },
  filename: (req, file, cb) => {
    // Mantém o nome original mas adiciona timestamp para evitar colisões
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    const ext = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext)
    cb(null, `${base}-${unique}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  if (path.extname(file.originalname).toLowerCase() === '.xml') {
    cb(null, true)
  } else {
    cb(new Error('Apenas arquivos .xml são permitidos.'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

// Multer para upload de arquivo .zip ou .rar (único arquivo, até 200 MB)
const archiveFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ext === '.zip' || ext === '.rar') {
    cb(null, true)
  } else {
    cb(new Error('Apenas arquivos .zip ou .rar são permitidos.'), false)
  }
}

const uploadZipMiddleware = multer({
  storage,
  fileFilter: archiveFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
})

const router = Router()

// Todas as rotas requerem autenticação
router.use(authMiddleware)

// Atenção: rota /stats deve vir ANTES de /:id para não ser capturada como parâmetro
router.get('/generations/stats', getStats)

router.get('/generations', list)
router.post('/generations', create)
router.get('/generations/:id', getOne)
router.post('/generations/:id/files', upload.array('files', 100), uploadFiles)
router.post('/generations/:id/upload-zip', uploadZipMiddleware.single('file'), uploadZip)
router.post('/generations/:id/run', runGeneration)
router.get('/generations/:id/download', download)

export default router
