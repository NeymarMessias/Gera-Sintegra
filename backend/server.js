import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import { PORT, FRONTEND_URL } from './src/config/env.js'
import { prisma } from './src/lib/prisma.js'
import { errorHandler } from './src/middleware/errorHandler.js'

import authRoutes from './src/routes/auth.routes.js'
import companiesRoutes from './src/routes/companies.routes.js'
import usersRoutes from './src/routes/users.routes.js'
import sintegraRoutes from './src/routes/sintegra.routes.js'
import settingsRoutes from './src/routes/settings.routes.js'

const app = express()

// ---------------------------------------------------------------------------
// Middlewares globais
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
)

app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/companies', companiesRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/sintegra', sintegraRoutes)
app.use('/api/settings', settingsRoutes)

// ---------------------------------------------------------------------------
// Handler de rotas não encontradas
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` })
})

// ---------------------------------------------------------------------------
// Handler global de erros (deve ser o último middleware)
// ---------------------------------------------------------------------------
app.use(errorHandler)

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------
async function bootstrap() {
  try {
    // Verifica conectividade com o banco
    await prisma.$connect()
    console.log('[DB] Conectado ao banco de dados.')

    app.listen(PORT, () => {
      console.log(`[Server] Rodando em http://localhost:${PORT}`)
      console.log(`[Server] CORS habilitado para: ${FRONTEND_URL}`)
    })
  } catch (err) {
    console.error('[Server] Falha ao inicializar:', err)
    process.exit(1)
  }
}

bootstrap()

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Encerrando...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
