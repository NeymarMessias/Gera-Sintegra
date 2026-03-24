import api from './axios.js'

export async function listCompanies() {
  const res = await api.get('/companies')
  return res.data
}

export async function createCompany(data) {
  const res = await api.post('/companies', data)
  return res.data
}

export async function updateCompany(id, data) {
  const res = await api.put(`/companies/${id}`, data)
  return res.data
}

export async function deleteCompany(id) {
  const res = await api.delete(`/companies/${id}`)
  return res.data
}
