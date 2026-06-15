/**
 * 学习路由 - 核心背诵功能
 */

import express from 'express'
import { getDatabase, saveDatabase, reloadDatabase } from '../database/init.js'
import FSRS, { Rating, State } from '../utils/fsrs.js'

const router = express.Router()
const fsrs = new FSRS()

// 辅助函数：执行查询并返回结果
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
  const lastInsertRowid = idResult.length > 0 ? idResult[0].values[0][0] : 0
  return { lastInsertRowid }
}

/**
 * 获取今日学习任务
 */
router.get('/today', (req, res) => {
  try {
    // 重新加载数据库以获取最新数据
    const db = reloadDatabase()
    const userId = req.userId || 1
    const vocabId = req.query.vocabId

    const todayEnd = new Date().setHours(23, 59, 59, 999)

    let cards = []

    if (vocabId) {
      // 指定词库：获取该词库的单词
      // 首先为该用户创建这些单词的学习卡片（如果不存在）
      const words = queryAll(db, `
        SELECT w.id as word_id, w.word, w.phonetic, w.pos, w.meaning, w.english_meaning, w.example, w.example_translation, w.category, w.phet_sim_id, w.phet_context, w.difficulty, w.tags
        FROM words w
        JOIN vocabulary_words vw ON w.id = vw.word_id
        WHERE vw.vocabulary_id = ?
        ORDER BY vw.sort_order
        LIMIT 100
      `, [vocabId])

      // 为每个单词创建用户卡片（如果不存在）
      for (const w of words) {
        const existingCard = queryOne(db, `
          SELECT * FROM user_cards WHERE user_id = ? AND word_id = ?
        `, [userId, w.word_id])

        if (!existingCard) {
          runSql(db, `
            INSERT INTO user_cards (user_id, word_id, state, difficulty, stability)
            VALUES (?, ?, 0, 5, 1)
          `, [userId, w.word_id])
        }

        cards.push({
          ...w,
          state: existingCard?.state || 0,
          difficulty: existingCard?.difficulty || 5,
          stability: existingCard?.stability || 1
        })
      }
    } else {
      // 默认：获取所有待复习卡片
      cards = queryAll(db, `
        SELECT uc.*, w.word, w.phonetic, w.pos, w.meaning, w.english_meaning, w.example, w.example_translation, w.category, w.phet_sim_id, w.phet_context, w.difficulty, w.tags
        FROM user_cards uc
        JOIN words w ON uc.word_id = w.id
        WHERE uc.user_id = ?
          AND (uc.next_review IS NULL OR uc.next_review <= ? OR uc.state IN (0, 1))
        ORDER BY
          CASE WHEN uc.state = 0 THEN 0
          WHEN uc.state = 1 THEN 1
          ELSE 2
        END,
        uc.next_review ASC
        LIMIT 100
      `, [userId, todayEnd])
    }

    // 统计
    const stats = {
      new: cards.filter(c => c.state === 0).length,
      learning: cards.filter(c => c.state === 1).length,
      review: cards.filter(c => c.state === 2).length,
      total: cards.length
    }

    res.json({
      success: true,
      data: {
        cards,
        stats
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 提交复习结果
 */
router.post('/review', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1
    const { wordId, rating, duration = 0 } = req.body

    if (!wordId || !rating) {
      return res.status(400).json({ success: false, error: '缺少参数' })
    }

    // 获取当前卡片状态
    let card = queryOne(db, `
      SELECT * FROM user_cards WHERE user_id = ? AND word_id = ?
    `, [userId, wordId])

    // 如果没有卡片，创建新的
    if (!card) {
      runSql(db, `
        INSERT INTO user_cards (user_id, word_id, state, difficulty, stability)
        VALUES (?, ?, 0, 5, 1)
      `, [userId, wordId])

      card = {
        state: State.New,
        difficulty: 5,
        stability: 1,
        last_review: null
      }
    }

    // FSRS 算法计算下次复习参数
    const result = fsrs.repeat(card, rating)

    // 更新卡片状态
    db.run(`
      UPDATE user_cards SET
        state = ?,
        difficulty = ?,
        stability = ?,
        last_review = ?,
        next_review = ?,
        scheduled_days = ?,
        reps = reps + 1,
        lapses = lapses + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND word_id = ?
    `, [
      result.state,
      result.difficulty,
      result.stability,
      result.lastReview,
      result.nextReview,
      result.scheduledDays,
      rating === Rating.Again ? 1 : 0,
      userId,
      wordId
    ])

    // 记录学习日志
    runSql(db, `
      INSERT INTO study_logs (user_id, word_id, rating, state, duration_ms)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, wordId, rating, card.state, duration])

    // 更新错题本
    if (rating === Rating.Again) {
      const existingError = queryOne(db, `
        SELECT * FROM error_book WHERE user_id = ? AND word_id = ?
      `, [userId, wordId])

      if (existingError) {
        db.run(`
          UPDATE error_book SET
            error_count = error_count + 1,
            last_error_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND word_id = ?
        `, [userId, wordId])
      } else {
        runSql(db, `
          INSERT INTO error_book (user_id, word_id, error_count, last_error_at)
          VALUES (?, ?, 1, CURRENT_TIMESTAMP)
        `, [userId, wordId])
      }
    }

    saveDatabase()

    res.json({
      success: true,
      data: {
        nextReview: result.nextReview,
        scheduledDays: result.scheduledDays,
        state: result.state,
        difficulty: result.difficulty
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 预览复习结果
 */
router.post('/preview', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1
    const { wordId } = req.body

    const card = queryOne(db, `
      SELECT * FROM user_cards WHERE user_id = ? AND word_id = ?
    `, [userId, wordId]) || { state: State.New, difficulty: 5, stability: 1 }

    // 计算各评分的结果
    const previews = {
      again: fsrs.repeat(card, Rating.Again),
      hard: fsrs.repeat(card, Rating.Hard),
      good: fsrs.repeat(card, Rating.Good),
      easy: fsrs.repeat(card, Rating.Easy)
    }

    res.json({
      success: true,
      data: {
        again: { days: previews.again.scheduledDays, difficulty: previews.again.difficulty },
        hard: { days: previews.hard.scheduledDays, difficulty: previews.hard.difficulty },
        good: { days: previews.good.scheduledDays, difficulty: previews.good.difficulty },
        easy: { days: previews.easy.scheduledDays, difficulty: previews.easy.difficulty }
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 获取学习统计
 */
router.get('/stats', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1

    // 今日统计
    const todayStats = queryOne(db, `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as again,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as hard,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as good,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as easy
      FROM study_logs
      WHERE user_id = ? AND date(created_at) = date('now')
    `, [userId]) || { total: 0, again: 0, hard: 0, good: 0, easy: 0 }

    // 总体统计
    const totalStats = queryOne(db, `
      SELECT
        COUNT(*) as total_words,
        SUM(reps) as total_reps,
        SUM(lapses) as total_lapses,
        COUNT(CASE WHEN state = 2 THEN 1 END) as mastered
      FROM user_cards WHERE user_id = ?
    `, [userId]) || { total_words: 0, total_reps: 0, total_lapses: 0, mastered: 0 }

    // 连续学习天数
    const streakInfo = queryOne(db, `
      SELECT streak_days, last_study_date FROM users WHERE id = ?
    `, [userId])

    res.json({
      success: true,
      data: {
        today: todayStats,
        total: totalStats,
        streak: streakInfo?.streak_days || 0
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 获取学习日历数据（热力图）
 * GET /api/study/calendar?year=2026&month=6
 */
router.get('/calendar', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1
    const year = parseInt(req.query.year) || new Date().getFullYear()
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1)

    // 获取指定月份的每日学习记录
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    const dailyStats = queryAll(db, `
      SELECT
        date(created_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN rating >= 3 THEN 1 END) as good_count,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as again_count
      FROM study_logs
      WHERE user_id = ? AND created_at >= ? AND created_at < ?
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `, [userId, startDate, endDate])

    // 获取最近 365 天的数据（GitHub 风格热力图）
    const yearlyStats = queryAll(db, `
      SELECT
        date(created_at) as date,
        COUNT(*) as count
      FROM study_logs
      WHERE user_id = ? AND created_at >= date('now', '-365 days')
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `, [userId])

    res.json({
      success: true,
      data: {
        month: dailyStats,
        yearly: yearlyStats,
        year,
        month
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 获取学习趋势数据
 * GET /api/study/trend?days=7
 */
router.get('/trend', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1
    const days = Math.min(parseInt(req.query.days) || 7, 90)

    // 每日学习数据
    const dailyTrend = queryAll(db, `
      SELECT
        date(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as again,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as hard,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as good,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as easy,
        COUNT(DISTINCT word_id) as words,
        AVG(duration_ms) as avg_duration
      FROM study_logs
      WHERE user_id = ? AND created_at >= date('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `, [userId, days])

    // 每小时分布
    const hourlyDist = queryAll(db, `
      SELECT
        cast(strftime('%H', created_at) as integer) as hour,
        COUNT(*) as count
      FROM study_logs
      WHERE user_id = ? AND created_at >= date('now', '-30 days')
      GROUP BY hour
      ORDER BY hour
    `, [userId])

    // 词汇掌握分布
    const masteryDist = queryOne(db, `
      SELECT
        COUNT(CASE WHEN state = 0 THEN 1 END) as new_words,
        COUNT(CASE WHEN state = 1 THEN 1 END) as learning,
        COUNT(CASE WHEN state = 2 THEN 1 END) as mastered
      FROM user_cards WHERE user_id = ?
    `, [userId]) || { new_words: 0, learning: 0, mastered: 0 }

    // 每日效率（正确率+速度）
    const efficiencyTrend = queryAll(db, `
      SELECT
        date(created_at) as date,
        COUNT(CASE WHEN rating >= 3 THEN 1 END) * 100 / COUNT(*) as accuracy,
        AVG(duration_ms) as avg_duration,
        COUNT(*) as total
      FROM study_logs
      WHERE user_id = ? AND created_at >= date('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `, [userId, days])

    // 难度分布
    const difficultyDist = queryAll(db, `
      SELECT
        CASE
          WHEN difficulty < 3 THEN 'easy'
          WHEN difficulty < 7 THEN 'medium'
          ELSE 'hard'
        END as level,
        COUNT(*) as count
      FROM user_cards WHERE user_id = ?
      GROUP BY level
    `, [userId])

    res.json({
      success: true,
      data: {
        dailyTrend,
        hourlyDist,
        masteryDist,
        efficiencyTrend,
        difficultyDist
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 每日打卡数据
 * GET /api/study/checkin
 */
router.get('/checkin', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1

    // 今日学习统计
    const todayStats = queryOne(db, `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as again,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as hard,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as good,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as easy,
        COUNT(DISTINCT word_id) as words_learned
      FROM study_logs
      WHERE user_id = ? AND date(created_at) = date('now')
    `, [userId]) || { total: 0, again: 0, hard: 0, good: 0, easy: 0, words_learned: 0 }

    // 总体统计
    const totalStats = queryOne(db, `
      SELECT
        COUNT(*) as total_words,
        SUM(reps) as total_reps,
        SUM(lapses) as total_lapses,
        COUNT(CASE WHEN state = 2 THEN 1 END) as mastered
      FROM user_cards WHERE user_id = ?
    `, [userId]) || { total_words: 0, total_reps: 0, total_lapses: 0, mastered: 0 }

    // 用户信息
    const userInfo = queryOne(db, `
      SELECT id, username, level, exp, streak_days, last_study_date FROM users WHERE id = ?
    `, [userId])

    // 今日新学单词
    const todayNewWords = queryAll(db, `
      SELECT w.word, w.phonetic, w.meaning
      FROM study_logs sl
      JOIN words w ON sl.word_id = w.id
      WHERE sl.user_id = ? AND date(sl.created_at) = date('now')
      GROUP BY sl.word_id
      ORDER BY sl.created_at DESC
      LIMIT 5
    `, [userId])

    // 最近7天学习趋势
    const weeklyTrend = queryAll(db, `
      SELECT
        date(created_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN rating >= 3 THEN 1 END) as good_count
      FROM study_logs
      WHERE user_id = ? AND created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `, [userId])

    // 正确率
    const total = todayStats.total || 0
    const goodCount = (todayStats.good || 0) + (todayStats.easy || 0)
    const accuracy = total > 0 ? Math.round(goodCount / total * 100) : 0

    res.json({
      success: true,
      data: {
        today: {
          ...todayStats,
          accuracy,
          words_learned: todayStats.words_learned || 0
        },
        total: totalStats,
        user: userInfo || { username: '学习者', level: 1, exp: 0, streak_days: 0 },
        todayWords: todayNewWords,
        weeklyTrend
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
