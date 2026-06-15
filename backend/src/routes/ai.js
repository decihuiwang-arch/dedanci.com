/**
 * AI 服务路由
 */

import express from 'express'
import { getDatabase, saveDatabase } from '../database/init.js'
import {
  isQwenConfigured,
  getAIStatus,
  analyzeWord,
  generateExamples,
  analyzeErrors,
  generateMemoryTip,
  generateExamQuestion,
  generateStudyPlan,
  generateReviewAdvice,
  chatAboutWord,
  generateStudyReport
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
 * 检查 AI 状态
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    ...getAIStatus()
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

/**
 * 生成智能学习计划
 * POST /api/ai/study-plan
 */
router.post('/study-plan', async (req, res) => {
  try {
    if (!isQwenConfigured()) {
      return res.status(400).json({ success: false, error: 'AI 服务未配置' })
    }

    const db = getDatabase()
    const userId = req.userId || 1

    // 收集用户数据
    const totalStats = queryOne(db, `
      SELECT
        COUNT(*) as total_words,
        COUNT(CASE WHEN state = 2 THEN 1 END) as mastered,
        COUNT(CASE WHEN state = 1 THEN 1 END) as learning,
        COUNT(CASE WHEN state = 0 THEN 1 END) as new_words
      FROM user_cards WHERE user_id = ?
    `, [userId]) || {}

    const todayStats = queryOne(db, `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN rating >= 3 THEN 1 END) as good
      FROM study_logs
      WHERE user_id = ? AND date(created_at) = date('now')
    `, [userId]) || { total: 0, good: 0 }

    const userInfo = queryOne(db, `
      SELECT level, streak_days, settings FROM users WHERE id = ?
    `, [userId])

    const avgDaily = queryOne(db, `
      SELECT
        AVG(daily_count) as avg_daily
      FROM (
        SELECT date(created_at) as day, COUNT(*) as daily_count
        FROM study_logs WHERE user_id = ? AND created_at >= date('now', '-14 days')
        GROUP BY date(created_at)
      )
    `, [userId])

    const avgDailyNew = queryOne(db, `
      SELECT
        AVG(daily_count) as avg_daily
      FROM (
        SELECT date(created_at) as day, COUNT(*) as daily_count
        FROM study_logs WHERE user_id = ? AND created_at >= date('now', '-14 days') AND state = 0
        GROUP BY date(created_at)
      )
    `, [userId])

    const accuracy = todayStats.total > 0
      ? Math.round((todayStats.good / todayStats.total) * 100)
      : 0

    const settings = userInfo?.settings ? JSON.parse(userInfo.settings) : {}

    const result = await generateStudyPlan({
      level: userInfo?.level || 1,
      streakDays: userInfo?.streak_days || 0,
      totalWords: totalStats.total_words || 0,
      masteredWords: totalStats.mastered || 0,
      learningWords: totalStats.learning || 0,
      newWords: totalStats.new_words || 0,
      todayStudied: todayStats.total || 0,
      accuracy,
      avgDailyNew: Math.round(avgDailyNew?.avg_daily || 0),
      avgDailyReview: Math.round((avgDaily?.avg_daily || 0) - (avgDailyNew?.avg_daily || 0)),
      examDate: settings.examDate || '',
      examType: settings.examType || 'cet6',
      targetWordsPerDay: settings.targetWordsPerDay || 0
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 获取智能复习建议
 * GET /api/ai/review-advice
 */
router.get('/review-advice', async (req, res) => {
  try {
    if (!isQwenConfigured()) {
      return res.status(400).json({ success: false, error: 'AI 服务未配置' })
    }

    const db = getDatabase()
    const userId = req.userId || 1

    const todayEnd = new Date().setHours(23, 59, 59, 999)

    // 待复习卡片统计
    const dueStats = queryOne(db, `
      SELECT
        COUNT(*) as total_due,
        COUNT(CASE WHEN state = 0 THEN 1 END) as new_cards,
        COUNT(CASE WHEN state = 1 THEN 1 END) as learning_cards,
        COUNT(CASE WHEN state = 2 AND next_review <= ? THEN 1 END) as overdue
      FROM user_cards
      WHERE user_id = ? AND (next_review IS NULL OR next_review <= ? OR state IN (0, 1))
    `, [todayEnd, userId, todayEnd]) || {}

    // 今日完成
    const todayDone = queryOne(db, `
      SELECT COUNT(*) as count FROM study_logs
      WHERE user_id = ? AND date(created_at) = date('now')
    `, [userId])

    // 今日正确率
    const todayAccuracy = queryOne(db, `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN rating >= 3 THEN 1 END) as good
      FROM study_logs
      WHERE user_id = ? AND date(created_at) = date('now')
    `, [userId])

    const accuracy = todayAccuracy?.total > 0
      ? Math.round((todayAccuracy.good / todayAccuracy.total) * 100)
      : 0

    // 薄弱词
    const worstWords = queryAll(db, `
      SELECT w.word, uc.lapses, uc.reps
      FROM user_cards uc
      JOIN words w ON uc.word_id = w.id
      WHERE uc.user_id = ? AND uc.lapses > 0
      ORDER BY uc.lapses DESC, uc.reps ASC
      LIMIT 8
    `, [userId])

    // 时间段
    const hour = new Date().getHours()
    const timeOfDay = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

    const result = await generateReviewAdvice({
      dueCards: dueStats.total_due || 0,
      newCards: dueStats.new_cards || 0,
      learningCards: dueStats.learning_cards || 0,
      overdueCards: dueStats.overdue || 0,
      todayDone: todayDone?.count || 0,
      todayGoal: 50,
      accuracy,
      worstWords: worstWords.map(w => ({ word: w.word, lapses: w.lapses })),
      timeOfDay
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * AI 单词问答聊天
 * POST /api/ai/chat
 */
router.post('/chat', async (req, res) => {
  try {
    if (!isQwenConfigured()) {
      return res.status(400).json({ success: false, error: 'AI 服务未配置' })
    }

    const { question, context = '' } = req.body
    if (!question?.trim()) {
      return res.status(400).json({ success: false, error: '请输入问题' })
    }

    const result = await chatAboutWord(question.trim(), context)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 生成 AI 学习报告
 * POST /api/ai/study-report
 */
router.post('/study-report', async (req, res) => {
  try {
    if (!isQwenConfigured()) {
      return res.status(400).json({ success: false, error: 'AI 服务未配置' })
    }

    const db = getDatabase()
    const userId = req.userId || 1

    // 补充数据库数据
    const totalStats = queryOne(db, `
      SELECT
        COUNT(*) as total_words,
        COUNT(CASE WHEN state = 2 THEN 1 END) as mastered,
        SUM(reps) as total_reps,
        SUM(lapses) as total_lapses
      FROM user_cards WHERE user_id = ?
    `, [userId]) || {}

    const userInfo = queryOne(db, `
      SELECT level, streak_days, settings FROM users WHERE id = ?
    `, [userId])

    const todayStats = queryOne(db, `
      SELECT COUNT(*) as total FROM study_logs
      WHERE user_id = ? AND date(created_at) = date('now')
    `, [userId])

    const recentTrend = queryAll(db, `
      SELECT date(created_at) as date, COUNT(*) as total
      FROM study_logs
      WHERE user_id = ? AND created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `, [userId])

    const bestHours = queryAll(db, `
      SELECT cast(strftime('%H', created_at) as integer) as hour, COUNT(*) as count
      FROM study_logs
      WHERE user_id = ? AND created_at >= date('now', '-30 days')
      GROUP BY hour ORDER BY count DESC LIMIT 3
    `, [userId])

    const accuracy = totalStats.total_reps > 0
      ? Math.round((totalStats.total_reps - totalStats.total_lapses) / totalStats.total_reps * 100)
      : 0

    const totalWords = totalStats.total_words || 0
    const mastered = totalStats.mastered || 0
    const settings = userInfo?.settings ? JSON.parse(userInfo.settings) : {}

    const result = await generateStudyReport({
      totalWords,
      mastered,
      totalReps: totalStats.total_reps || 0,
      totalLapses: totalStats.total_lapses || 0,
      accuracy,
      streakDays: userInfo?.streak_days || 0,
      todayTotal: todayStats?.total || 0,
      masteryPercent: totalWords > 0 ? Math.round(mastered / totalWords * 100) : 0,
      avgDaily: recentTrend.length > 0
        ? Math.round(recentTrend.reduce((s, d) => s + d.total, 0) / recentTrend.length)
        : 0,
      recentTrend,
      bestHours: bestHours.map(h => h.hour),
      examType: settings.examType || 'cet6'
    })

    // 将 Markdown 转换为 HTML（简单实现）
    if (result.success && result.data?.report) {
      let html = result.data.report
      // 标题
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
      html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
      html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // 加粗
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // 列表
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
      html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      // 段落
      html = html.replace(/\n\n/g, '</p><p>')
      html = '<p>' + html + '</p>'
      html = html.replace(/<p><(h[1-3]|ul|li)/g, '<$1')
      html = html.replace(/<\/(h[1-3]|ul|li)><\/p>/g, '</$1>')
      result.data.report = html
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
