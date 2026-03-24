import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, PowerOff, Search, Loader, AlertCircle, CheckCircle, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  listCompanies,
  createCompany,
  updateCompany,
} from '../../api/companies.api.js'
import { consultarDocumento } from '../../api/settings.api.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Card from '../../components/ui/Card.jsx'
import Modal from '../../components/ui/Modal.jsx'

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

function formatCNPJ(cnpj) {
  if (!cnpj) return '—'
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Mapeia os campos da resposta da API Fácil para o formulário da empresa.
 * A API pode retornar diferentes estruturas dependendo da versão.
 */
function mapApiToForm(data) {
  // API Fácil Sistemas retorna { cpf: {}, cnpj: { razao_social, endereco, cidade, ... } }
  const d = data?.cnpj || data?.data || data?.empresa || data?.resultado || data || {}

  const get = (...keys) => {
    for (const key of keys) {
      const v = d[key]
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
    }
    return ''
  }

  return {
    name: get('razao_social', 'nome', 'nome_razao_social', 'empresa'),
    ie: get('inscricao_estadual', 'ie', 'rg'),
    logradouro: get('endereco', 'logradouro', 'rua'),
    numero: get('numero', 'num', 'numero_endereco'),
    complemento: get('complemento'),
    bairro: get('bairro', 'distrito'),
    cep: get('cep').replace(/\D/g, ''),
    municipio: get('cidade', 'municipio', 'localidade'),
    uf: get('uf', 'estado', 'estado_sigla').toUpperCase().slice(0, 2),
    fone: get('telefone', 'fone', 'ddd_telefone_1').replace(/\D/g, ''),
  }
}

const emptyForm = {
  name: '',
  cnpj: '',
  ie: '',
  uf: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cep: '',
  municipio: '',
  fone: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
}

const emptyEditForm = {
  name: '',
  cnpj: '',
  ie: '',
  uf: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cep: '',
  municipio: '',
  fone: '',
  active: true,
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm)
  const [createErrors, setCreateErrors] = useState({})
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false)
  const [cnpjLookupError, setCnpjLookupError] = useState('')
  const [cnpjLookupSuccess, setCnpjLookupSuccess] = useState('')
  const navigate = useNavigate()

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  async function load() {
    try {
      const data = await listCompanies()
      setCompanies(data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao carregar empresas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setCreateForm(emptyForm)
    setCreateErrors({})
    setCreateError('')
    setCnpjLookupError('')
    setCnpjLookupSuccess('')
    setCreateOpen(true)
  }

  function openEdit(company) {
    setEditTarget(company)
    setEditForm({
      name: company.name || '',
      cnpj: company.cnpj || '',
      ie: company.ie || '',
      uf: company.uf || '',
      logradouro: company.logradouro || '',
      numero: company.numero || '',
      complemento: company.complemento || '',
      bairro: company.bairro || '',
      cep: company.cep || '',
      municipio: company.municipio || '',
      fone: company.fone || '',
      active: company.active !== false,
    })
    setEditError('')
    setEditOpen(true)
  }

  async function handleCnpjLookup() {
    const cnpjDigits = createForm.cnpj.replace(/\D/g, '')
    if (cnpjDigits.length < 11) {
      setCnpjLookupError('Informe um CNPJ (14 dígitos) ou CPF (11 dígitos) completo.')
      return
    }
    setCnpjLookupLoading(true)
    setCnpjLookupError('')
    setCnpjLookupSuccess('')
    try {
      const data = await consultarDocumento(createForm.cnpj)
      const mapped = mapApiToForm(data)

      // Conta campos preenchidos
      const preenchidos = Object.values(mapped).filter(Boolean).length

      setCreateForm((prev) => ({
        ...prev,
        name: mapped.name || prev.name,
        ie: mapped.ie || prev.ie,
        logradouro: mapped.logradouro || prev.logradouro,
        numero: mapped.numero || prev.numero,
        complemento: mapped.complemento || prev.complemento,
        bairro: mapped.bairro || prev.bairro,
        cep: mapped.cep || prev.cep,
        municipio: mapped.municipio || prev.municipio,
        uf: (UF_LIST.includes(mapped.uf) ? mapped.uf : '') || prev.uf,
        fone: mapped.fone || prev.fone,
      }))

      if (preenchidos > 0) {
        setCnpjLookupSuccess(`${preenchidos} campo(s) preenchido(s) automaticamente.`)
      } else {
        setCnpjLookupError('A API retornou dados mas nenhum campo pôde ser mapeado. Preencha manualmente.')
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Não foi possível consultar o documento.'
      setCnpjLookupError(msg)
    } finally {
      setCnpjLookupLoading(false)
    }
  }

  function validateCreate() {
    const errs = {}
    if (!createForm.name.trim()) errs.name = 'Nome é obrigatório.'
    const cnpjDigits = createForm.cnpj.replace(/\D/g, '')
    if (cnpjDigits.length !== 14) errs.cnpj = 'CNPJ deve ter 14 dígitos.'
    if (!createForm.uf) errs.uf = 'UF é obrigatória.'
    if (!createForm.adminName.trim()) errs.adminName = 'Nome do admin é obrigatório.'
    if (!createForm.adminEmail.trim()) errs.adminEmail = 'E-mail do admin é obrigatório.'
    if (!createForm.adminPassword.trim()) errs.adminPassword = 'Senha do admin é obrigatória.'
    return errs
  }

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validateCreate()
    if (Object.keys(errs).length > 0) {
      setCreateErrors(errs)
      return
    }
    setCreateLoading(true)
    setCreateError('')
    try {
      await createCompany(createForm)
      setCreateOpen(false)
      load()
    } catch (err) {
      setCreateError(err?.response?.data?.error || 'Erro ao criar empresa.')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditLoading(true)
    setEditError('')
    try {
      await updateCompany(editTarget.id, editForm)
      setEditOpen(false)
      load()
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Erro ao atualizar empresa.')
    } finally {
      setEditLoading(false)
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return
    setDeactivateLoading(true)
    try {
      await updateCompany(deactivateTarget.id, { active: !deactivateTarget.active })
      setDeactivateTarget(null)
      load()
    } catch (err) {
      console.error(err)
    } finally {
      setDeactivateLoading(false)
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
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{companies.length} empresa(s) cadastrada(s)</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} />
          Nova Empresa
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">CNPJ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">UF</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Usuários</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Gerações</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Nenhuma empresa cadastrada.
                  </td>
                </tr>
              )}
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{company.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{formatCNPJ(company.cnpj)}</td>
                  <td className="px-4 py-3 text-gray-600">{company.uf}</td>
                  <td className="px-4 py-3">
                    <Badge variant={company.active ? 'success' : 'gray'}>
                      {company.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{company._count?.users ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{company._count?.generations ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(company)}>
                        <Pencil size={14} />
                        Editar
                      </Button>
                      <Button
                        variant={company.active ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => setDeactivateTarget(company)}
                      >
                        <PowerOff size={14} />
                        {company.active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova Empresa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={createLoading} onClick={handleCreate} type="button">
              Criar Empresa
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* CNPJ primeiro + botão de consulta */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">CNPJ *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={createForm.cnpj}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 14)
                    setCreateForm({ ...createForm, cnpj: v })
                    setCnpjLookupError('')
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCnpjLookup() } }}
                  placeholder="00000000000000"
                  maxLength={14}
                  className={[
                    'flex-1 px-3 py-2 text-sm border rounded-lg outline-none transition-colors font-mono',
                    createErrors.cnpj
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={handleCnpjLookup}
                  disabled={cnpjLookupLoading}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title="Consultar CNPJ na API Fácil Sistemas"
                >
                  {cnpjLookupLoading
                    ? <Loader size={14} className="animate-spin" />
                    : <Search size={14} />}
                  Consultar
                </button>
              </div>
              {createErrors.cnpj && <p className="text-xs text-red-600 mt-1">{createErrors.cnpj}</p>}
              {cnpjLookupSuccess && (
                <div className="flex items-center gap-2 mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  <CheckCircle size={14} className="flex-shrink-0" />
                  {cnpjLookupSuccess}
                </div>
              )}
              {cnpjLookupError && (
                <div className="flex items-start gap-2 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <div>
                    {cnpjLookupError}
                    {cnpjLookupError.toLowerCase().includes('configurad') && (
                      <button
                        type="button"
                        onClick={() => { setCreateOpen(false); navigate('/configuracoes') }}
                        className="flex items-center gap-1 mt-1 text-xs text-red-600 underline hover:text-red-800"
                      >
                        <Settings size={11} />
                        Ir para Configurações
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Nome após CNPJ */}
            <div className="col-span-2">
              <Input
                label="Nome da Empresa *"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                error={createErrors.name}
              />
            </div>

            <Input
              label="Inscrição Estadual"
              value={createForm.ie}
              onChange={(e) => setCreateForm({ ...createForm, ie: e.target.value })}
            />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">UF *</label>
              <select
                value={createForm.uf}
                onChange={(e) => setCreateForm({ ...createForm, uf: e.target.value })}
                className={[
                  'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
                  createErrors.uf
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                ].join(' ')}
              >
                <option value="">Selecione...</option>
                {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
              {createErrors.uf && <p className="text-xs text-red-600 mt-1">{createErrors.uf}</p>}
            </div>
            <Input
              label="CEP"
              value={createForm.cep}
              onChange={(e) => setCreateForm({ ...createForm, cep: e.target.value })}
              placeholder="00000-000"
            />
            <div className="col-span-2">
              <Input
                label="Logradouro"
                value={createForm.logradouro}
                onChange={(e) => setCreateForm({ ...createForm, logradouro: e.target.value })}
              />
            </div>
            <Input
              label="Número"
              value={createForm.numero}
              onChange={(e) => setCreateForm({ ...createForm, numero: e.target.value })}
            />
            <Input
              label="Complemento"
              value={createForm.complemento}
              onChange={(e) => setCreateForm({ ...createForm, complemento: e.target.value })}
            />
            <Input
              label="Bairro"
              value={createForm.bairro}
              onChange={(e) => setCreateForm({ ...createForm, bairro: e.target.value })}
            />
            <Input
              label="Município"
              value={createForm.municipio}
              onChange={(e) => setCreateForm({ ...createForm, municipio: e.target.value })}
            />
            <Input
              label="Telefone"
              value={createForm.fone}
              onChange={(e) => setCreateForm({ ...createForm, fone: e.target.value })}
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Usuário Administrador</h4>
            <div className="flex flex-col gap-3">
              <Input
                label="Nome *"
                value={createForm.adminName}
                onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                error={createErrors.adminName}
              />
              <Input
                label="E-mail *"
                type="email"
                value={createForm.adminEmail}
                onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                error={createErrors.adminEmail}
              />
              <Input
                label="Senha *"
                type="password"
                value={createForm.adminPassword}
                onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                error={createErrors.adminPassword}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Editar: ${editTarget?.name || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={editLoading} onClick={handleEdit} type="button">
              Salvar
            </Button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          {editError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                label="Nome da Empresa"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <Input
              label="CNPJ"
              value={editForm.cnpj}
              onChange={(e) => setEditForm({ ...editForm, cnpj: e.target.value })}
            />
            <Input
              label="Inscrição Estadual"
              value={editForm.ie}
              onChange={(e) => setEditForm({ ...editForm, ie: e.target.value })}
            />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">UF</label>
              <select
                value={editForm.uf}
                onChange={(e) => setEditForm({ ...editForm, uf: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
              >
                <option value="">Selecione...</option>
                {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <Input
              label="CEP"
              value={editForm.cep}
              onChange={(e) => setEditForm({ ...editForm, cep: e.target.value })}
            />
            <div className="col-span-2">
              <Input
                label="Logradouro"
                value={editForm.logradouro}
                onChange={(e) => setEditForm({ ...editForm, logradouro: e.target.value })}
              />
            </div>
            <Input
              label="Número"
              value={editForm.numero}
              onChange={(e) => setEditForm({ ...editForm, numero: e.target.value })}
            />
            <Input
              label="Complemento"
              value={editForm.complemento}
              onChange={(e) => setEditForm({ ...editForm, complemento: e.target.value })}
            />
            <Input
              label="Bairro"
              value={editForm.bairro}
              onChange={(e) => setEditForm({ ...editForm, bairro: e.target.value })}
            />
            <Input
              label="Município"
              value={editForm.municipio}
              onChange={(e) => setEditForm({ ...editForm, municipio: e.target.value })}
            />
            <Input
              label="Telefone"
              value={editForm.fone}
              onChange={(e) => setEditForm({ ...editForm, fone: e.target.value })}
            />
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editForm.active}
                onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="edit-active" className="text-sm text-gray-700">Empresa ativa</label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Deactivate confirm modal */}
      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title={deactivateTarget?.active ? 'Desativar Empresa' : 'Ativar Empresa'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeactivateTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant={deactivateTarget?.active ? 'danger' : 'primary'}
              loading={deactivateLoading}
              onClick={confirmDeactivate}
            >
              {deactivateTarget?.active ? 'Desativar' : 'Ativar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          {deactivateTarget?.active
            ? `Deseja desativar a empresa "${deactivateTarget?.name}"? Os usuários não conseguirão acessar o sistema.`
            : `Deseja reativar a empresa "${deactivateTarget?.name}"?`}
        </p>
      </Modal>
    </div>
  )
}
