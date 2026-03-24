import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { requireRole } from '../middleware/requireRole.js'
import { getSettings, updateSettings, consultarDocumento } from '../controllers/settings.controller.js'

const router = Router()

router.use(authMiddleware)

// Configurações: somente MASTER lê e escreve
router.get('/', requireRole('MASTER'), getSettings)
router.put('/', requireRole('MASTER'), updateSettings)

// Consulta de documento: MASTER e ADMIN (para uso no modal de empresa)
router.post('/consultar-documento', requireRole('MASTER', 'ADMIN'), consultarDocumento)

export default router
