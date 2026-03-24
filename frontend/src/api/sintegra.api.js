import api from './axios.js'

export async function listGenerations(params = {}) {
  const res = await api.get('/sintegra/generations', { params })
  return res.data
}

export async function createGeneration(data) {
  const res = await api.post('/sintegra/generations', data)
  return res.data
}

export async function uploadFiles(generationId, files, fileType) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  formData.append('fileType', fileType)
  const res = await api.post(`/sintegra/generations/${generationId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

export async function runGeneration(generationId, options = {}) {
  const res = await api.post(`/sintegra/generations/${generationId}/run`, options)
  return res.data
}

export async function getGeneration(id) {
  const res = await api.get(`/sintegra/generations/${id}`)
  return res.data
}

export async function downloadGeneration(id) {
  const res = await api.get(`/sintegra/generations/${id}/download`, {
    responseType: 'blob'
  })
  return res.data
}

export async function uploadZip(generationId, file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post(`/sintegra/generations/${generationId}/upload-zip`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getStats() {
  const res = await api.get('/sintegra/generations/stats')
  return res.data
}
