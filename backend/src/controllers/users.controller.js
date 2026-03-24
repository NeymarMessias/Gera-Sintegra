import * as userService from '../services/user.service.js'

/**
 * GET /api/users
 */
export async function list(req, res, next) {
  try {
    const users = await userService.list(req.user)
    return res.json(users)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/users/:id
 */
export async function getOne(req, res, next) {
  try {
    const user = await userService.getById(req.params.id, req.user)
    return res.json(user)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/users
 * Body: { name, email, password, role?, companyId? }
 */
export async function create(req, res, next) {
  try {
    const user = await userService.create(req.body, req.user)
    return res.status(201).json(user)
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/users/:id
 */
export async function update(req, res, next) {
  try {
    const user = await userService.update(req.params.id, req.body, req.user)
    return res.json(user)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/users/:id
 */
export async function remove(req, res, next) {
  try {
    const user = await userService.remove(req.params.id)
    return res.json({ message: 'Usuário desativado com sucesso.', user })
  } catch (err) {
    next(err)
  }
}
