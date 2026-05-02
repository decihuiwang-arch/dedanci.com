/**
 * 错题本路由
 */

import express from 'express'
import { getDatabase } from '../database/init.js'

const router = express.Router()

function queryAll(db, sql, params = []) {
  const result = db.exec(sql, params)
  if (result.length > 0) {
    const columns = result[0].columns
    return result[0].values.map(values => {
      const obj = {}
      columns.forEach((col, i) => {
        obj[col] = values[i]
      })
      return obj
    })
  }
  return []
}

/**
 * 获取错题列表（含单词信息）
 * GET /api/error-book
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.headers['x-user-id'] || 1

    const errors = queryAll(db, `
      SELECT
        eb.id,
        w.word,
        w.phonetic,
        w.pos,
        w.meaning,
        w.english_meaning,
        eb.error_count,
        eb.last_error_at,
        eb.error_types
      FROM error_book eb
      JOIN words w ON eb.word_id = w.id
      WHERE eb.user_id = ?
      ORDER BY eb.error_count DESC, eb.last_error_at DESC
      LIMIT 200
    `, [userId])

    res.json({ success: true, data: errors })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 清除错题
 * DELETE /api/error-book/:wordId
 */
router.delete('/:wordId', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.headers['x-user-id'] || 1
    const { wordId } = req.params

    db.run('DELETE FROM error_book WHERE user_id = ? AND word_id = ?', [userId, wordId])

    res.json({ success: true, message: '错题已清除' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
