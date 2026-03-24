import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/env.js'

export function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' })
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId ?? null,
    }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' })
  }
}
