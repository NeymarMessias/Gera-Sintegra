import { prisma } from '../lib/prisma.js'
import * as authService from '../services/auth.service.js'

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' })
    }

    const result = await authService.login(email, password)
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/me
 * Requer auth middleware
 */
export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
        company: {
          select: { id: true, name: true, cnpj: true, uf: true },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' })
    }

    return res.json(user)
  } catch (err) {
    next(err)
  }
}
