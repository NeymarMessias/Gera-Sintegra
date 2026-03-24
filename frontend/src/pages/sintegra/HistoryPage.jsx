import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { Download, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react'
import { listGenerations, downloadGeneration } from '../../api/sintegra.api.js'
import { useAuth } from '../../hooks/useAuth.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'

const PAGE_SIZE = 20

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
  return `${formatDate(start)} a ${formatDate(end)}`
}

export default function HistoryPage() {
  const { user } = useAuth()
  const isMaster = user?.role === 'MASTER'

  const [generations, setGenerations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [searchCompany, setSearchCompany] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [downloadingId, setDownloadingId] = useState(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
      }
      if (statusFilter) params.status = statusFilter
      if (searchCompany) params.company = searchCompany

      const data = await listGenerations(params)

      // Handle both array and paginated object responses
      if (Array.isArray(data)) {
        setGenerations(data)
        setTotalCount(data.length)
      } else if (data && Array.isArray(data.items)) {
        setGenerations(data.items)
        setTotalCount(data.total || data.items.length)
      } else {
        setGenerations([])
        setTotalCount(0)
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao carregar histórico.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchCompany])

  useEffect(() => {
    load()
  }, [load])

  function handleSearch(e) {
    e.preventDefault()
    setSearchCompany(searchInput)
    setPage(1)
  }

  function handleStatusChange(val) {
    setStatusFilter(val)
    setPage(1)
  }

  function handleClearFilters() {
    setStatusFilter('')
    setSearchCompany('')
    setSearchInput('')
    setPage(1)
  }

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
      console.error('Erro ao baixar:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
          >
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="PROCESSING">Processando</option>
            <option value="DONE">Concluído</option>
            <option value="ERROR">Erro</option>
          </select>
        </div>

        {/* Company search (MASTER only) */}
        {isMaster && (
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por empresa..."
                className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors w-52"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">Buscar</Button>
          </form>
        )}

        {(statusFilter || searchCompany) && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Limpar filtros
          </Button>
        )}

        <div className="ml-auto text-sm text-gray-500">
          {totalCount} registro(s) encontrado(s)
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Carregando...
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Data</th>
                    {isMaster && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Empresa</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Período</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Total de Registros</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {generations.length === 0 ? (
                    <tr>
                      <td colSpan={isMaster ? 7 : 6} className="px-4 py-10 text-center text-gray-400">
                        Nenhuma geração encontrada.
                      </td>
                    </tr>
                  ) : (
                    generations.map((gen) => {
                      const status = statusConfig[gen.status] || { label: gen.status, variant: 'gray' }
                      const totalRecords = gen.stats
                        ? Object.values(gen.stats).reduce((acc, v) => acc + (Number(v) || 0), 0)
                        : '—'

                      return (
                        <tr key={gen.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {formatDate(gen.createdAt)}
                          </td>
                          {isMaster && (
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {gen.company?.name ?? '—'}
                            </td>
                          )}
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {formatPeriod(gen.periodStart, gen.periodEnd)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{totalRecords}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{gen.user?.name ?? '—'}</td>
                          <td className="px-4 py-3">
                            {gen.status === 'DONE' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={downloadingId === gen.id}
                                onClick={() => handleDownload(gen)}
                              >
                                <Download size={14} />
                                Baixar
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Página {page} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Próxima
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
