/**
 * 认证服务 - JWT + bcrypt
 * 支持邮箱注册/登录 + 游客模式
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'dedanci-secret-2026'
const JWT_EXPIRES_IN = '30d'
const SALT_ROUNDS = 10

/**
 * 密码哈希
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 验证密码
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

/**
 * 生成 JWT Token
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (e) {
    return null
  }
}

/**
 * 认证中间件
 * 支持两种模式：
 * 1. JWT Token: Authorization: Bearer <token>
 * 2. 兼容旧模式: x-user-id: <id>（游客模式）
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (decoded) {
      req.userId = decoded.userId
      req.isGuest = false
      return next()
    }
  }

  // 兼容旧模式：游客使用 x-user-id
  const guestId = req.headers['x-user-id']
  if (guestId) {
    req.userId = parseInt(guestId)
    req.isGuest = true
    return next()
  }

  // 未认证也放行（使用默认用户ID 1）
  req.userId = 1
  req.isGuest = true
  next()
}

export default {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  authMiddleware
}
