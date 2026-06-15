/**
 * 词库路由
 */

import express from 'express'
import { getDatabase, saveDatabase } from '../database/init.js'
import { analyzeWord, extractWords, isQwenConfigured } from '../services/qwen.js'

const router = express.Router()

// 辅助函数
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

function queryOne(db, sql, params = []) {
  const results = queryAll(db, sql, params)
  return results.length > 0 ? results[0] : undefined
}

function runSql(db, sql, params = []) {
  db.run(sql, params)
  const idResult = db.exec('SELECT last_insert_rowid() as id')
  return idResult.length > 0 ? idResult[0].values[0][0] : 0
}

/**
 * 获取词库列表
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase()
    const { category, level } = req.query

    let sql = 'SELECT * FROM vocabularies WHERE 1=1'
    const params = []

    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }
    if (level) {
      sql += ' AND level = ?'
      params.push(level)
    }

    sql += ' ORDER BY created_at DESC'

    const vocabularies = queryAll(db, sql, params)
    res.json({ success: true, data: vocabularies })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 获取词库详情
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { page = 1, pageSize = 50 } = req.query
    const offset = (page - 1) * pageSize

    const vocabulary = queryOne(db, 'SELECT * FROM vocabularies WHERE id = ?', [id])
    if (!vocabulary) {
      return res.status(404).json({ success: false, error: '词库不存在' })
    }

    const words = queryAll(db, `
      SELECT w.*, vw.sort_order
      FROM words w
      JOIN vocabulary_words vw ON w.id = vw.word_id
      WHERE vw.vocabulary_id = ?
      ORDER BY vw.sort_order
      LIMIT ? OFFSET ?
    `, [id, pageSize, offset])

    const totalResult = queryOne(db, 'SELECT COUNT(*) as count FROM vocabulary_words WHERE vocabulary_id = ?', [id])

    res.json({
      success: true,
      data: { vocabulary, words, total: totalResult?.count || 0, page, pageSize }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 创建词库
 */
router.post('/', (req, res) => {
  try {
    const db = getDatabase()
    const { name, description, category, level, words } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: '词库名称不能为空' })
    }

    const vocabId = runSql(db, `
      INSERT INTO vocabularies (name, description, category, level, word_count)
      VALUES (?, ?, ?, ?, ?)
    `, [name, description || '', category || 'custom', level || '', words?.length || 0])

    // 如果提供了单词列表，批量插入
    if (words && words.length > 0) {
      for (let i = 0; i < words.length; i++) {
        const w = words[i]
        db.run('INSERT OR IGNORE INTO words (word, phonetic, pos, meaning, example) VALUES (?, ?, ?, ?, ?)',
          [w.word, w.phonetic || '', w.pos || '', w.meaning || '', w.example || ''])

        const wordRow = queryOne(db, 'SELECT id FROM words WHERE word = ?', [w.word])
        if (wordRow) {
          db.run('INSERT OR IGNORE INTO vocabulary_words (vocabulary_id, word_id, sort_order) VALUES (?, ?, ?)',
            [vocabId, wordRow.id, i])
        }
      }
    }

    saveDatabase()
    res.json({ success: true, data: { id: vocabId } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 从文本生成词库
 */
router.post('/extract', async (req, res) => {
  try {
    const { text, name, level = 'cet6' } = req.body

    if (!text) {
      return res.status(400).json({ success: false, error: '请提供文本内容' })
    }

    if (!isQwenConfigured()) {
      return res.status(400).json({ success: false, error: 'AI 服务未配置' })
    }

    const result = await extractWords(text, level)
    if (!result.success) {
      return res.status(500).json(result)
    }

    res.json({ success: true, data: result.data })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 添加单词到词库
 */
router.post('/:id/words', (req, res) => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { words } = req.body

    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ success: false, error: '请提供单词列表' })
    }

    const maxOrderResult = queryOne(db, 'SELECT MAX(sort_order) as max FROM vocabulary_words WHERE vocabulary_id = ?', [id])
    let maxOrder = maxOrderResult?.max || 0

    for (const w of words) {
      db.run('INSERT OR IGNORE INTO words (word, phonetic, pos, meaning) VALUES (?, ?, ?, ?)',
        [w.word, w.phonetic || '', w.pos || '', w.meaning || ''])

      const wordRow = queryOne(db, 'SELECT id FROM words WHERE word = ?', [w.word])
      if (wordRow) {
        db.run('INSERT OR IGNORE INTO vocabulary_words (vocabulary_id, word_id, sort_order) VALUES (?, ?, ?)',
          [id, wordRow.id, ++maxOrder])
      }
    }

    // 更新词库单词数量
    const countResult = queryOne(db, 'SELECT COUNT(*) as count FROM vocabulary_words WHERE vocabulary_id = ?', [id])
    db.run('UPDATE vocabularies SET word_count = ? WHERE id = ?', [countResult?.count || 0, id])

    saveDatabase()
    res.json({ success: true, message: `添加了 ${words.length} 个单词` })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 搜索单词
 * GET /api/vocabularies/search?q=ephemeral
 */
router.get('/search', (req, res) => {
  try {
    const db = getDatabase()
    const q = (req.query.q || '').trim()
    if (!q) return res.json({ success: true, data: [] })

    const results = queryAll(db, `
      SELECT id, word, phonetic, pos, meaning, english_meaning, category, difficulty, tags,
             example, example_translation
      FROM words
      WHERE word LIKE ? OR meaning LIKE ?
      ORDER BY
        CASE WHEN word = ? THEN 0
             WHEN word LIKE ? THEN 1
             ELSE 2 END,
        difficulty DESC
      LIMIT 20
    `, [q + '%', '%' + q + '%', q, q + '%'])

    res.json({ success: true, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 生词本 - 添加
 * POST /api/vocabularies/star
 */
router.post('/star', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1
    const { wordId } = req.body

    if (!wordId) {
      return res.status(400).json({ success: false, error: '缺少单词ID' })
    }

    db.run('UPDATE user_cards SET is_starred = 1 WHERE user_id = ? AND word_id = ?', [userId, wordId])
    saveDatabase()

    res.json({ success: true, message: '已加入生词本' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 生词本 - 移除
 * DELETE /api/vocabularies/star/:wordId
 */
router.delete('/star/:wordId', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1
    const { wordId } = req.params

    db.run('UPDATE user_cards SET is_starred = 0 WHERE user_id = ? AND word_id = ?', [userId, wordId])
    saveDatabase()

    res.json({ success: true, message: '已从生词本移除' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 生词本 - 列表
 * GET /api/vocabularies/starred
 */
router.get('/starred', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1

    const words = queryAll(db, `
      SELECT uc.word_id as id, w.word, w.phonetic, w.pos, w.meaning, w.english_meaning,
             w.category, w.difficulty, w.tags, uc.reps, uc.lapses, uc.state
      FROM user_cards uc
      JOIN words w ON uc.word_id = w.id
      WHERE uc.user_id = ? AND uc.is_starred = 1
      ORDER BY w.word
    `, [userId])

    res.json({ success: true, data: words })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
