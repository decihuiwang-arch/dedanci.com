/**
 * AI 服务路由
 */

import express from 'express'
import { getDatabase, saveDatabase } from '../database/init.js'
import {
  isQwenConfigured,
  analyzeWord,
  generateExamples,
  analyzeErrors,
  generateMemoryTip,
  generateExamQuestion
} from '../services/qwen.js'

const router = express.Router()

// 辅助函数
function queryOne(db, sql, params = []) {
  const result = db.exec(sql, params)
  if (result.length > 0 && result[0].values.length > 0) {
    const columns = result[0].columns
    const values = result[0].values[0]
    const obj = {}
    columns.forEach((col, i) => {
      obj[col] = values[i]
    })
    return obj
  }
  return undefined
}

/**
 * 检查 AI 状态
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    configured: isQwenConfigured(),
    message: isQwenConfigured() ? 'AI 服务已配置' : '请配置 QWEN_API_KEY'
  })
})

/**
 * 智能单词解析
 */
router.get('/analyze/:word', async (req, res) => {
  try {
    const { word } = req.params
    const { context, level = 'cet6', useCache = 'true' } = req.query

    if (!isQwenConfigured()) {
      return res.status(400).json({ success: false, error: 'AI 服务未配置' })
    }

    const db = getDatabase()

    // 尝试从缓存获取
    if (useCache === 'true') {
      const wordRow = queryOne(db, 'SELECT id FROM words WHERE word = ?', [word])
      if (wordRow) {
        const cached = queryOne(db, `
          SELECT content FROM ai_cache WHERE word_id = ? AND cache_type = 'analyze'
        `, [wordRow.id])
        if (cached) {
          return res.json({ success: true, data: JSON.parse(cached.content), cached: true })
        }
      }
    }

    // 调用 AI
    const result = await analyzeWord(word, context, level)
    if (!result.success) {
      return res.status(500).json(result)
    }

    // 缓存结果
    if (useCache === 'true') {
      const wordRow = queryOne(db, 'SELECT id FROM words WHERE word = ?', [word])
      if (wordRow) {
        db.run(`INSERT OR REPLACE INTO ai_cache (word_id, cache_type, content) VALUES (?, 'analyze', ?)`,
          [wordRow.id, JSON.stringify(result.data)])
        saveDatabase()
      }
    }

    res.json({ success: true, data: result.data, cached: false })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 生成例句
 */
router.get('/examples/:word', async (req, res) => {
  try {
    const { word } = req.params
    const { level = 'cet6', count = 3 } = req.query

    if (!isQwenConfigured()) {
      return res.status(400).json({ success: false, error: 'AI 服务未配置' })
    }

    const result = await generateExamples(word, level, parseInt(count))
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 生成记忆口诀
 */
router.get('/memory/:word', async (req, res) => {
  try {
    const { word } = req.params
    const { meaning } = req.query

    if (!isQwenConfigured()) {
      return res.status(400).json({ success: false, error: 'AI 服务未配置' })
    }

    const result = await generateMemoryTip(word, meaning || '')
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 错题分析
 */
router.post('/analyze-errors', async (req, res) => {
  try {
    const { errorWords, userData } = req.body

    if (!isQwenConfigured()) {
      return res.status(400).json({ success: false, error: 'AI 服务未配置' })
    }

    const result = await analyzeErrors(errorWords, userData)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 生成真题风格选择题
 * GET /api/ai/exam-question/:word
 */
router.get('/exam-question/:word', async (req, res) => {
  try {
    const { word } = req.params
    const { level = 'cet6' } = req.query

    if (!isQwenConfigured()) {
      return res.status(400).json({ success: false, error: 'AI 服务未配置' })
    }

    const result = await generateExamQuestion(word, level)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 清除缓存
 */
router.delete('/cache/:word', (req, res) => {
  try {
    const db = getDatabase()
    const { word } = req.params

    const wordRow = queryOne(db, 'SELECT id FROM words WHERE word = ?', [word])
    if (wordRow) {
      db.run('DELETE FROM ai_cache WHERE word_id = ?', [wordRow.id])
      saveDatabase()
    }

    res.json({ success: true, message: '缓存已清除' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
