import { prisma } from '../lib/prisma.js'
import { hashPassword } from './auth.service.js'

/**
 * Lista todas as empresas com contagem de usuários e gerações.
 */
export async function list() {
  return prisma.company.findMany({
    include: {
      _count: {
        select: { users: true, generations: true },
      },
    },
    orderBy: { name: 'asc' },
  })
}

/**
 * Busca empresa por ID com seus usuários.
 * @param {string} id
 */
export async function getById(id) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
      },
      _count: {
        select: { generations: true },
      },
    },
  })

  if (!company) {
    const err = new Error('Empresa não encontrada.')
    err.status = 404
    throw err
  }

  return company
}

/**
 * Cria uma nova empresa junto com um usuário administrador.
 * Usa transação para garantir atomicidade.
 *
 * @param {object} data
 * @param {string} data.name
 * @param {string} data.cnpj
 * @param {string} data.ie
 * @param {string} data.uf
 * @param {string} [data.logradouro]
 * @param {string} [data.numero]
 * @param {string} [data.complemento]
 * @param {string} [data.bairro]
 * @param {string} [data.cep]
 * @param {string} [data.municipio]
 * @param {string} [data.fone]
 * @param {string} data.adminName
 * @param {string} data.adminEmail
 * @param {string} data.adminPassword
 */
export async function create(data) {
  const {
    name,
    cnpj,
    ie,
    uf,
    logradouro = '',
    numero = '',
    complemento = '',
    bairro = '',
    cep = '',
    municipio = '',
    fone = '',
    adminName,
    adminEmail,
    adminPassword,
  } = data

  if (!name || !cnpj || !ie || !uf) {
    const err = new Error('Campos obrigatórios: name, cnpj, ie, uf.')
    err.status = 400
    throw err
  }

  if (!adminName || !adminEmail || !adminPassword) {
    const err = new Error('Dados do administrador são obrigatórios: adminName, adminEmail, adminPassword.')
    err.status = 400
    throw err
  }

  const passwordHash = await hashPassword(adminPassword)

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        cnpj,
        ie,
        uf,
        logradouro,
        numero,
        complemento,
        bairro,
        cep,
        municipio,
        fone,
      },
    })

    const user = await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        companyId: company.id,
      },
    })

    return { company, adminUser: { id: user.id, email: user.email, name: user.name, role: user.role } }
  })
}

/**
 * Atualiza dados de uma empresa.
 * @param {string} id
 * @param {object} data
 */
export async function update(id, data) {
  const allowed = [
    'name', 'cnpj', 'ie', 'uf',
    'logradouro', 'numero', 'complemento', 'bairro',
    'cep', 'municipio', 'fone', 'active',
  ]

  const updateData = {}
  for (const key of allowed) {
    if (data[key] !== undefined) {
      updateData[key] = data[key]
    }
  }

  return prisma.company.update({
    where: { id },
    data: updateData,
  })
}

/**
 * Soft delete: desativa a empresa (active = false).
 * @param {string} id
 */
export async function remove(id) {
  return prisma.company.update({
    where: { id },
    data: { active: false },
  })
}
