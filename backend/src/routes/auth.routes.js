import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { login, me } from '../controllers/auth.controller.js'

const router = Router()

// POST /api/auth/login
router.post('/login', login)

// GET /api/auth/me  (requer autenticação)
router.get('/me', authMiddleware, me)

export default router
