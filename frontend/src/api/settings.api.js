import api from './axios.js'

export async function getSettings() {
  const res = await api.get('/settings')
  return res.data
}

export async function updateSettings(data) {
  const res = await api.put('/settings', data)
  return res.data
}

export async function consultarDocumento(documento) {
  const res = await api.post('/settings/consultar-documento', { documento })
  return res.data
}
