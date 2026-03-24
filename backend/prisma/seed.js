import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Assi2030@#', 10)

  const user = await prisma.user.upsert({
    where: { email: 'neymar.messias@facilsistemas.com.br' },
    update: {
      passwordHash,
      name: 'Administrador Master',
      role: 'MASTER',
      active: true,
    },
    create: {
      email: 'neymar.messias@facilsistemas.com.br',
      passwordHash,
      name: 'Administrador Master',
      role: 'MASTER',
      active: true,
    },
  })

  console.log('Seed concluído. Usuário master criado/atualizado:', user.email)
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
