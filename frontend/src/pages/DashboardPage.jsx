import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { FileText, CheckCircle, Building2, Users, Download } from 'lucide-react'
import { getStats, listGenerations, downloadGeneration } from '../api/sintegra.api.js'
import { useAuth } from '../hooks/useAuth.js'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'

const statusConfig = {
  PENDING: { label: 'Pendente', variant: 'gray' },
  PROCESSING: { label: 'Processando', variant: 'warning' },
  DONE: { label: 'Concluído', variant: 'success' },
  ERROR: { label: 'Erro', variant: 'error' },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

function formatPeriod(start, end) {
  if (!start || !end) return '—'
  return `${formatDate(start)} a ${formatDate(end)}`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [generations, setGenerations] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [statsData, gensData] = await Promise.all([
          getStats(),
          listGenerations({ limit: 10 }),
        ])
        setStats(statsData)
        setGenerations(Array.isArray(gensData) ? gensData.slice(0, 10) : [])
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleDownload(gen) {
    setDownloadingId(gen.id)
    try {
      const blob = await downloadGeneration(gen.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = gen.outputFile || `sintegra_${gen.id}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao baixar arquivo:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  const isMaster = user?.role === 'MASTER'

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
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          value={stats?.generations?.total ?? 0}
          label="Total de Gerações"
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          value={stats?.generations?.done ?? 0}
          label="Gerações com Sucesso"
          color="green"
        />
        {isMaster && (
          <>
            <StatCard
              icon={Building2}
              value={stats?.companies ?? 0}
              label="Empresas Cadastradas"
              color="purple"
            />
            <StatCard
              icon={Users}
              value={stats?.files ?? 0}
              label="Arquivos Processados"
              color="yellow"
            />
          </>
        )}
        {!isMaster && (
          <>
            <StatCard
              icon={Building2}
              value={user?.company?.name ?? '—'}
              label="Empresa"
              color="purple"
            />
            <StatCard
              icon={Users}
              value={user?.role ?? '—'}
              label="Perfil de Acesso"
              color="yellow"
            />
          </>
        )}
      </div>

      {/* Recent generations */}
      <Card title="Últimas Gerações">
        {generations.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400">
            Nenhuma geração encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {isMaster && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Empresa
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Período
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Registros
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {generations.map((gen) => {
                  const status = statusConfig[gen.status] || { label: gen.status, variant: 'gray' }
                  const totalRecords = gen.stats
                    ? Object.values(gen.stats).reduce((acc, v) => acc + (Number(v) || 0), 0)
                    : '—'

                  return (
                    <tr key={gen.id} className="hover:bg-gray-50 transition-colors">
                      {isMaster && (
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {gen.company?.name ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-600">
                        {formatPeriod(gen.periodStart, gen.periodEnd)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{totalRecords}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(gen.createdAt)}</td>
                      <td className="px-4 py-3">
                        {gen.status === 'DONE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={downloadingId === gen.id}
                            onClick={() => handleDownload(gen)}
                          >
                            <Download size={15} />
                            Baixar
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
