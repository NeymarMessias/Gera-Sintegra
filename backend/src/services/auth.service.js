import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { JWT_SECRET } from '../config/env.js'

/**
 * Autentica o usuário e retorna token JWT + dados do usuário.
 * @param {string} email
 * @param {string} password
 * @returns {{ token: string, user: object }}
 */
export async function login(email, password) {
  if (!email || !password) {
    const err = new Error('E-mail e senha são obrigatórios.')
    err.status = 400
    throw err
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.active) {
    const err = new Error('Credenciais inválidas.')
    err.status = 401
    throw err
  }

  const senhaOk = await bcrypt.compare(password, user.passwordHash)
  if (!senhaOk) {
    const err = new Error('Credenciais inválidas.')
    err.status = 401
    throw err
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId ?? null,
  }

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    },
  }
}

/**
 * Gera hash bcrypt da senha.
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}
