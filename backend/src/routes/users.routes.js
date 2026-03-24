import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { requireRole } from '../middleware/requireRole.js'
import {
  list,
  getOne,
  create,
  update,
  remove,
} from '../controllers/users.controller.js'

const router = Router()

// Todas as rotas de users requerem auth + ADMIN ou MASTER
router.use(authMiddleware, requireRole('MASTER', 'ADMIN'))

router.get('/', list)
router.post('/', create)
router.get('/:id', getOne)
router.put('/:id', update)
router.delete('/:id', remove)

export default router
