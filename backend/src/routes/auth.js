/**
 * 认证路由 - 注册/登录/用户信息
 */

import express from 'express'
import { getDatabase, saveDatabase } from '../database/init.js'
import { hashPassword, verifyPassword, generateToken, authMiddleware } from '../services/auth.js'

const router = express.Router()

// 辅助函数
function queryOne(db, sql, params = []) {
  const result = db.exec(sql, params)
  if (result.length > 0 && result[0].values.length > 0) {
    const columns = result[0].columns
    const values = result[0].values[0]
    const obj = {}
    columns.forEach((col, i) => { obj[col] = values[i] })
    return obj
  }
  return undefined
}

function queryAll(db, sql, params = []) {
  const result = db.exec(sql, params)
  if (result.length > 0) {
    const columns = result[0].columns
    return result[0].values.map(values => {
      const obj = {}
      columns.forEach((col, i) => { obj[col] = values[i] })
      return obj
    })
  }
  return []
}

/**
 * 邮箱注册
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, error: '请填写邮箱和密码' })
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: '密码至少6位' })
    }

    const db = getDatabase()

    // 检查邮箱是否已注册
    const existing = queryOne(db, 'SELECT id FROM users WHERE email = ?', [email])
    if (existing) {
      return res.status(400).json({ success: false, error: '该邮箱已注册' })
    }

    // 检查用户名
    const name = username || email.split('@')[0]
    const existingName = queryOne(db, 'SELECT id FROM users WHERE username = ?', [name])
    const finalName = existingName ? `${name}_${Date.now().toString(36)}` : name

    // 创建用户
    const hashedPassword = await hashPassword(password)
    db.run(
      `INSERT INTO users (username, email, password_hash, level, exp, streak_days, settings) VALUES (?, ?, ?, 1, 0, 0, '{}')`,
      [finalName, email, hashedPassword]
    )
    saveDatabase()

    // 获取新用户ID
    const newUser = queryOne(db, 'SELECT last_insert_rowid() as id')
    const userId = newUser?.id || 1

    // 生成 Token
    const token = generateToken({ userId })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          username: finalName,
          email,
          level: 1,
          exp: 0,
          streak_days: 0,
          is_guest: false
        }
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({ success: false, error: '注册失败，请稍后重试' })
  }
})

/**
 * 邮箱登录
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, error: '请填写邮箱和密码' })
    }

    const db = getDatabase()

    // 查找用户
    const user = queryOne(db, 'SELECT * FROM users WHERE email = ?', [email])
    if (!user) {
      return res.status(400).json({ success: false, error: '邮箱或密码错误' })
    }

    // 验证密码
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return res.status(400).json({ success: false, error: '邮箱或密码错误' })
    }

    // 生成 Token
    const token = generateToken({ userId: user.id })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          level: user.level,
          exp: user.exp,
          streak_days: user.streak_days,
          last_study_date: user.last_study_date,
          is_guest: false
        }
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

/**
 * 游客模式 - 一键体验
 * POST /api/auth/guest
 */
router.post('/guest', (req, res) => {
  try {
    const db = getDatabase()

    // 查找或创建游客用户
    let guest = queryOne(db, 'SELECT * FROM users WHERE username = ?', ['guest'])
    if (!guest) {
      db.run(
        `INSERT INTO users (username, email, password_hash, level, exp, streak_days, settings) VALUES ('guest', 'guest@dedanci.com', '', 1, 0, 0, '{}')`
      )
      saveDatabase()
      guest = queryOne(db, 'SELECT * FROM users WHERE username = ?', ['guest'])
    }

    const token = generateToken({ userId: guest.id || 1, isGuest: true })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: guest.id || 1,
          username: '游客',
          email: '',
          level: guest.level || 1,
          exp: guest.exp || 0,
          streak_days: guest.streak_days || 0,
          is_guest: true
        }
      }
    })
  } catch (error) {
    console.error('游客登录错误:', error)
    res.status(500).json({ success: false, error: '创建游客失败' })
  }
})

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, (req, res) => {
  try {
    const db = getDatabase()
    const user = queryOne(db, 'SELECT * FROM users WHERE id = ?', [req.userId])

    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' })
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        level: user.level,
        exp: user.exp,
        streak_days: user.streak_days,
        last_study_date: user.last_study_date,
        settings: user.settings ? JSON.parse(user.settings) : {},
        is_guest: req.isGuest
      }
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({ success: false, error: '获取失败' })
  }
})

/**
 * 更新用户信息
 * PUT /api/auth/profile
 */
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const { username, avatar, settings } = req.body
    const db = getDatabase()

    const updates = []
    const params = []

    if (username) {
      updates.push('username = ?')
      params.push(username)
    }
    if (avatar) {
      updates.push('avatar = ?')
      params.push(avatar)
    }
    if (settings) {
      updates.push('settings = ?')
      params.push(JSON.stringify(settings))
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: '没有更新内容' })
    }

    params.push(req.userId)
    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)
    saveDatabase()

    res.json({ success: true, message: '更新成功' })
  } catch (error) {
    console.error('更新用户信息错误:', error)
    res.status(500).json({ success: false, error: '更新失败' })
  }
})

/**
 * 修改密码
 * PUT /api/auth/password
 */
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    const db = getDatabase()

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: '请填写新旧密码' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: '新密码至少6位' })
    }

    // 查找用户
    const user = queryOne(db, 'SELECT * FROM users WHERE id = ?', [req.userId])
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' })
    }

    // 游客没有密码
    if (!user.password_hash) {
      return res.status(400).json({ success: false, error: '游客账号请先注册' })
    }

    // 验证旧密码
    const valid = await verifyPassword(oldPassword, user.password_hash)
    if (!valid) {
      return res.status(400).json({ success: false, error: '当前密码错误' })
    }

    // 更新密码
    const hashedPassword = await hashPassword(newPassword)
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, req.userId])
    saveDatabase()

    res.json({ success: true, message: '密码已修改' })
  } catch (error) {
    console.error('修改密码错误:', error)
    res.status(500).json({ success: false, error: '修改密码失败' })
  }
})

export default router
