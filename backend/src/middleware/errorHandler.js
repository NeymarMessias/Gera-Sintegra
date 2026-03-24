/**
 * Handler global de erros do Express (4 parâmetros).
 * Deve ser registrado após todas as rotas.
 */
export function errorHandler(err, req, res, next) {
  console.error('[ErrorHandler]', err)

  // Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const field = err.meta?.target ?? 'campo'
    return res.status(409).json({
      error: `Conflito: já existe um registro com o mesmo ${field}.`,
    })
  }

  // Prisma record not found (P2025)
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado.' })
  }

  // JWT errors
  if (
    err.name === 'JsonWebTokenError' ||
    err.name === 'TokenExpiredError' ||
    err.name === 'NotBeforeError'
  ) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' })
  }

  // Validation / bad request
  if (err.status === 400 || err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message || 'Dados inválidos.' })
  }

  // Custom HTTP errors
  if (err.status) {
    return res.status(err.status).json({ error: err.message })
  }

  // Default 500
  return res.status(500).json({ error: err.message || 'Erro interno do servidor.' })
}
