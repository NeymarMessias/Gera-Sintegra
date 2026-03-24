import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { getSettings, updateSettings } from '../../api/settings.api.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Card from '../../components/ui/Card.jsx'

export default function SettingsPage() {
  const [form, setForm] = useState({
    facilApiToken: '',
    facilApiUrl: '',
    facilApiCnpjAliado: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    getSettings()
      .then((data) => setForm({
        facilApiToken: data.facilApiToken || '',
        facilApiUrl: data.facilApiUrl || '',
        facilApiCnpjAliado: data.facilApiCnpjAliado || '',
      }))
      .catch(() => setError('Erro ao carregar configurações.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      await updateSettings(form)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Carregando...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <Card title="API Fácil Sistemas — Consulta de CNPJ/CPF">
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
          <p className="text-sm text-gray-500">
            Configure as credenciais de acesso à API da Fácil Sistemas para consulta automática de CNPJ e CPF
            no cadastro de empresas.
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <CheckCircle size={16} className="flex-shrink-0" />
              Configurações salvas com sucesso!
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Security Token *
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.facilApiToken}
                onChange={(e) => setForm({ ...form, facilApiToken: e.target.value })}
                placeholder="Cole o token da API aqui"
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Input
            label="CNPJ Aliado (sua empresa)"
            value={form.facilApiCnpjAliado}
            onChange={(e) => setForm({ ...form, facilApiCnpjAliado: e.target.value.replace(/\D/g, '') })}
            placeholder="00000000000000"
            maxLength={14}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">URL da API</label>
            <input
              type="url"
              value={form.facilApiUrl}
              onChange={(e) => setForm({ ...form, facilApiUrl: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors font-mono text-xs"
            />
            <p className="text-xs text-gray-400 mt-1">Altere apenas se a URL da API for atualizada.</p>
          </div>

          <div className="border-t border-gray-200 pt-4 flex justify-end">
            <Button type="submit" variant="primary" loading={saving}>
              <Save size={16} />
              Salvar Configurações
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
