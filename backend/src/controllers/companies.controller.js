import * as companyService from '../services/company.service.js'

/**
 * GET /api/companies
 */
export async function list(req, res, next) {
  try {
    const companies = await companyService.list()
    return res.json(companies)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/companies/:id
 */
export async function getOne(req, res, next) {
  try {
    const company = await companyService.getById(req.params.id)
    return res.json(company)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/companies
 * Body: { name, cnpj, ie, uf, logradouro, numero, complemento, bairro, cep, municipio, fone,
 *         adminName, adminEmail, adminPassword }
 */
export async function create(req, res, next) {
  try {
    const result = await companyService.create(req.body)
    return res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/companies/:id
 */
export async function update(req, res, next) {
  try {
    const company = await companyService.update(req.params.id, req.body)
    return res.json(company)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/companies/:id
 */
export async function remove(req, res, next) {
  try {
    const company = await companyService.remove(req.params.id)
    return res.json({ message: 'Empresa desativada com sucesso.', company })
  } catch (err) {
    next(err)
  }
}
