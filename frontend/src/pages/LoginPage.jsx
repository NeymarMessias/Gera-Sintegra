import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Falha ao autenticar. Verifique suas credenciais.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-facil-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/logo.svg" alt="Fácil Sintegra" className="w-12 h-12" />
            <div className="text-left">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white leading-none">Fácil</span>
                <span className="text-3xl font-bold leading-none" style={{ color: '#9AC9FF' }}>Sintegra</span>
              </div>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'rgba(154,201,255,0.65)' }}>Sistema de Escrituração Fiscal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Entrar na sua conta</h2>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="E-mail"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />

            <Input
              label="Senha"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="mt-2 w-full"
            >
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-facil-light/50 mt-6">
          Fácil Sintegra &copy; {new Date().getFullYear()} &mdash; Fácil Sistemas
        </p>
      </div>
    </div>
  )
}
