import { useState, useEffect } from 'react'
import { Plus, Pencil, PowerOff } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { listUsers, createUser, updateUser } from '../../api/users.api.js'
import { useAuth } from '../../hooks/useAuth.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Card from '../../components/ui/Card.jsx'
import Modal from '../../components/ui/Modal.jsx'

const roleBadge = {
  MASTER: 'error',
  ADMIN: 'info',
  USER: 'gray',
}

const roleLabel = {
  MASTER: 'Master',
  ADMIN: 'Admin',
  USER: 'Usuário',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

const emptyCreateForm = {
  name: '',
  email: '',
  password: '',
  role: 'USER',
  companyId: '',
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const isMaster = currentUser?.role === 'MASTER'

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [createErrors, setCreateErrors] = useState({})
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'USER', active: true })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Deactivate
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  async function load() {
    try {
      const data = await listUsers()
      setUsers(data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setCreateForm(emptyCreateForm)
    setCreateErrors({})
    setCreateError('')
    setCreateOpen(true)
  }

  function openEdit(user) {
    setEditTarget(user)
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'USER',
      active: user.active !== false,
    })
    setEditError('')
    setEditOpen(true)
  }

  function validateCreate() {
    const errs = {}
    if (!createForm.name.trim()) errs.name = 'Nome é obrigatório.'
    if (!createForm.email.trim()) errs.email = 'E-mail é obrigatório.'
    if (!createForm.password.trim()) errs.password = 'Senha é obrigatória.'
    if (createForm.password.length > 0 && createForm.password.length < 6) {
      errs.password = 'Senha deve ter pelo menos 6 caracteres.'
    }
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
      const payload = {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
      }
      if (isMaster && createForm.companyId) {
        payload.companyId = createForm.companyId
      }
      await createUser(payload)
      setCreateOpen(false)
      load()
    } catch (err) {
      setCreateError(err?.response?.data?.error || 'Erro ao criar usuário.')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditLoading(true)
    setEditError('')
    try {
      await updateUser(editTarget.id, editForm)
      setEditOpen(false)
      load()
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Erro ao atualizar usuário.')
    } finally {
      setEditLoading(false)
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return
    setDeactivateLoading(true)
    try {
      await updateUser(deactivateTarget.id, { active: !deactivateTarget.active })
      setDeactivateTarget(null)
      load()
    } catch (err) {
      console.error(err)
    } finally {
      setDeactivateLoading(false)
    }
  }

  const availableRoles = isMaster
    ? ['MASTER', 'ADMIN', 'USER']
    : ['ADMIN', 'USER']

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} usuário(s) cadastrado(s)</p>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} />
          Novo Usuário
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">E-mail</th>
                {isMaster && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Empresa</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Perfil</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Criado em</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 && (
                <tr>
                  <td colSpan={isMaster ? 7 : 6} className="px-4 py-10 text-center text-gray-400">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  {isMaster && (
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.company?.name ?? '—'}</td>
                  )}
                  <td className="px-4 py-3">
                    <Badge variant={roleBadge[u.role] || 'gray'}>
                      {roleLabel[u.role] || u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.active ? 'success' : 'gray'}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                        <Pencil size={14} />
                        Editar
                      </Button>
                      {u.id !== currentUser?.id && (
                        <Button
                          variant={u.active ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => setDeactivateTarget(u)}
                        >
                          <PowerOff size={14} />
                          {u.active ? 'Desativar' : 'Ativar'}
                        </Button>
                      )}
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
        title="Novo Usuário"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={createLoading} onClick={handleCreate}>Criar</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {createError}
            </div>
          )}
          <Input
            label="Nome *"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            error={createErrors.name}
          />
          <Input
            label="E-mail *"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            error={createErrors.email}
          />
          <Input
            label="Senha *"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            error={createErrors.password}
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Perfil</label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>{roleLabel[r]}</option>
              ))}
            </select>
          </div>
          {isMaster && (
            <Input
              label="ID da Empresa (opcional)"
              value={createForm.companyId}
              onChange={(e) => setCreateForm({ ...createForm, companyId: e.target.value })}
              placeholder="UUID da empresa"
            />
          )}
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Editar: ${editTarget?.name || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={editLoading} onClick={handleEdit}>Salvar</Button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          {editError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {editError}
            </div>
          )}
          <Input
            label="Nome"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Input
            label="E-mail"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Perfil</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>{roleLabel[r]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-user-active"
              checked={editForm.active}
              onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="edit-user-active" className="text-sm text-gray-700">Usuário ativo</label>
          </div>
        </form>
      </Modal>

      {/* Deactivate confirm */}
      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title={deactivateTarget?.active ? 'Desativar Usuário' : 'Ativar Usuário'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeactivateTarget(null)}>Cancelar</Button>
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
            ? `Deseja desativar o usuário "${deactivateTarget?.name}"?`
            : `Deseja reativar o usuário "${deactivateTarget?.name}"?`}
        </p>
      </Modal>
    </div>
  )
}
