import * as settingsService from '../services/settings.service.js'

/**
 * GET /api/settings
 */
export async function getSettings(req, res, next) {
  try {
    const settings = settingsService.readSettings()
    return res.json(settings)
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/settings
 * Body: { facilApiToken?, facilApiUrl?, facilApiCnpjAliado? }
 */
export async function updateSettings(req, res, next) {
  try {
    const { facilApiToken, facilApiUrl, facilApiCnpjAliado } = req.body
    const updated = settingsService.writeSettings({
      ...(facilApiToken !== undefined && { facilApiToken }),
      ...(facilApiUrl !== undefined && { facilApiUrl }),
      ...(facilApiCnpjAliado !== undefined && { facilApiCnpjAliado }),
    })
    return res.json(updated)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/settings/consultar-documento
 * Body: { documento: "11.566.074/0001-06" }
 */
export async function consultarDocumento(req, res, next) {
  try {
    const { documento } = req.body
    if (!documento) {
      return res.status(400).json({ error: 'Campo "documento" é obrigatório.' })
    }
    const data = await settingsService.consultarDocumento(documento)
    return res.json(data)
  } catch (err) {
    const status = err.status && err.status < 600 ? err.status : 500
    return res.status(status).json({ error: err.message })
  }
}
