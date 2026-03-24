import { prisma } from '../lib/prisma.js'
import { hashPassword } from './auth.service.js'

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: { id: true, name: true, cnpj: true },
  },
}

/**
 * Lista usuários filtrados pelo role do solicitante.
 * MASTER vê todos, ADMIN vê só da própria empresa.
 * @param {object} requestingUser
 */
export async function list(requestingUser) {
  const where = {}

  if (requestingUser.role !== 'MASTER') {
    where.companyId = requestingUser.companyId
  }

  return prisma.user.findMany({
    where,
    select: USER_SELECT,
    orderBy: { name: 'asc' },
  })
}

/**
 * Busca usuário por ID, verificando permissão de acesso.
 * @param {string} id
 * @param {object} requestingUser
 */
export async function getById(id, requestingUser) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  })

  if (!user) {
    const err = new Error('Usuário não encontrado.')
    err.status = 404
    throw err
  }

  // ADMIN só pode ver usuários da sua empresa
  if (requestingUser.role !== 'MASTER' && user.companyId !== requestingUser.companyId) {
    const err = new Error('Acesso negado.')
    err.status = 403
    throw err
  }

  return user
}

/**
 * Cria um novo usuário.
 * ADMIN só pode criar usuários USER na própria empresa.
 * @param {object} data
 * @param {object} requestingUser
 */
export async function create(data, requestingUser) {
  const { name, email, password, role = 'USER', companyId } = data

  if (!name || !email || !password) {
    const err = new Error('Campos obrigatórios: name, email, password.')
    err.status = 400
    throw err
  }

  let targetCompanyId = companyId

  if (requestingUser.role !== 'MASTER') {
    // ADMIN só pode criar USER na própria empresa
    if (role !== 'USER') {
      const err = new Error('ADMIN só pode criar usuários com role USER.')
      err.status = 403
      throw err
    }
    targetCompanyId = requestingUser.companyId
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      companyId: targetCompanyId || null,
    },
    select: USER_SELECT,
  })

  return user
}

/**
 * Atualiza dados de um usuário.
 * @param {string} id
 * @param {object} data
 * @param {object} requestingUser
 */
export async function update(id, data, requestingUser) {
  // Verifica se tem acesso
  await getById(id, requestingUser)

  const allowed = ['name', 'email', 'role', 'active', 'companyId']
  const updateData = {}

  for (const key of allowed) {
    if (data[key] !== undefined) {
      updateData[key] = data[key]
    }
  }

  // ADMIN não pode alterar role ou company de outros
  if (requestingUser.role !== 'MASTER') {
    delete updateData.role
    delete updateData.companyId
  }

  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password)
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: USER_SELECT,
  })
}

/**
 * Soft delete: desativa o usuário (active = false).
 * @param {string} id
 */
export async function remove(id) {
  return prisma.user.update({
    where: { id },
    data: { active: false },
    select: USER_SELECT,
  })
}
