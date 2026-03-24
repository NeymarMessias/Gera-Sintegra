import fs from 'fs'
import path from 'path'
import { UPLOAD_DIR } from '../config/env.js'

const SETTINGS_FILE = path.resolve(UPLOAD_DIR, 'settings.json')

const DEFAULT_SETTINGS = {
  facilApiToken: '',
  facilApiUrl: 'https://server.apisfacil.com/facilsistemas/apis/sincronizacao_servidor/ConsultarDocumento/',
  facilApiCnpjAliado: '',
}

export function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS }
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function writeSettings(data) {
  const current = readSettings()
  const updated = { ...current, ...data }
  const dir = path.dirname(SETTINGS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf8')
  return updated
}

/**
 * Consulta documento (CNPJ ou CPF) via API Fácil Sistemas.
 * @param {string} documento
 * @returns {Promise<object>}
 */
export async function consultarDocumento(documento) {
  const settings = readSettings()

  if (!settings.facilApiToken) {
    const err = new Error('Token da API Fácil não configurado. Acesse Configurações para configurar.')
    err.status = 422
    throw err
  }
  if (!settings.facilApiCnpjAliado) {
    const err = new Error('CNPJ aliado não configurado. Acesse Configurações para configurar.')
    err.status = 422
    throw err
  }

  const url = settings.facilApiUrl || DEFAULT_SETTINGS.facilApiUrl

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'security_token': settings.facilApiToken,
    },
    body: JSON.stringify({
      cnpj_aliado: settings.facilApiCnpjAliado,
      documento,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const err = new Error(`API Fácil retornou erro ${response.status}: ${text}`)
    err.status = 502
    throw err
  }

  const data = await response.json()
  return data
}
