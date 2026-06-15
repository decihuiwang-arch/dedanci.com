/**
 * 排行榜路由 - 社交学习功能
 * 支持多种排行榜：连续打卡、今日学习、累计掌握、经验等级
 */

import express from 'express'
import { getDatabase } from '../database/init.js'

const router = express.Router()

// 辅助函数
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

function queryOne(db, sql, params = []) {
  const results = queryAll(db, sql, params)
  return results.length > 0 ? results[0] : undefined
}

/**
 * 获取排行榜
 * GET /api/leaderboard?type=streak&limit=50
 * 
 * type: streak (连续天数) | today (今日学习) | mastered (累计掌握) | exp (经验等级)
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase()
    const type = req.query.type || 'streak'
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const userId = req.userId || 0

    let leaderboard = []
    let myRank = null

    switch (type) {
      case 'streak': {
        // 连续打卡天数排行
        leaderboard = queryAll(db, `
          SELECT u.id, u.username, u.avatar, u.level, u.streak_days, u.exp,
                 u.last_study_date
          FROM users u
          WHERE u.streak_days > 0
          ORDER BY u.streak_days DESC, u.exp DESC
          LIMIT ?
        `, [limit])

        // 我的排名
        if (userId) {
          const myData = queryOne(db, 'SELECT streak_days FROM users WHERE id = ?', [userId])
          if (myData && myData.streak_days > 0) {
            const rankResult = queryOne(db, `
              SELECT COUNT(*) + 1 as rank FROM users WHERE streak_days > ? OR (streak_days = ? AND exp > (SELECT exp FROM users WHERE id = ?))
            `, [myData.streak_days, myData.streak_days, userId])
            myRank = rankResult?.rank || null
          }
        }
        break
      }

      case 'today': {
        // 今日学习量排行
        leaderboard = queryAll(db, `
          SELECT u.id, u.username, u.avatar, u.level, u.exp,
                 COUNT(sl.id) as today_count,
                 COUNT(CASE WHEN sl.rating >= 3 THEN 1 END) as today_good,
                 COUNT(DISTINCT sl.word_id) as today_words
          FROM users u
          JOIN study_logs sl ON u.id = sl.user_id
          WHERE date(sl.created_at) = date('now')
          GROUP BY u.id
          ORDER BY today_count DESC
          LIMIT ?
        `, [limit])

        if (userId) {
          const myToday = queryOne(db, `
            SELECT COUNT(*) as count FROM study_logs
            WHERE user_id = ? AND date(created_at) = date('now')
          `, [userId])
          if (myToday && myToday.count > 0) {
            const rankResult = queryOne(db, `
              SELECT COUNT(DISTINCT user_id) + 1 as rank FROM study_logs
              WHERE date(created_at) = date('now')
              GROUP BY user_id
              HAVING COUNT(*) > ?
            `, [myToday.count])
            myRank = rankResult?.rank || (leaderboard.findIndex(l => l.id === userId) + 1) || null
          }
        }
        break
      }

      case 'mastered': {
        // 累计掌握单词数排行
        leaderboard = queryAll(db, `
          SELECT u.id, u.username, u.avatar, u.level, u.exp,
                 COUNT(CASE WHEN uc.state = 2 THEN 1 END) as mastered,
                 COUNT(uc.id) as total_words,
                 SUM(uc.reps) as total_reps
          FROM users u
          LEFT JOIN user_cards uc ON u.id = uc.user_id
          GROUP BY u.id
          HAVING mastered > 0
          ORDER BY mastered DESC, total_reps ASC
          LIMIT ?
        `, [limit])

        if (userId) {
          const myMastered = queryOne(db, `
            SELECT COUNT(CASE WHEN state = 2 THEN 1 END) as mastered
            FROM user_cards WHERE user_id = ?
          `, [userId])
          if (myMastered && myMastered.mastered > 0) {
            myRank = leaderboard.findIndex(l => l.id === userId) + 1 || null
          }
        }
        break
      }

      case 'exp': {
        // 经验等级排行
        leaderboard = queryAll(db, `
          SELECT u.id, u.username, u.avatar, u.level, u.exp, u.streak_days
          FROM users u
          WHERE u.exp > 0
          ORDER BY u.exp DESC, u.level DESC
          LIMIT ?
        `, [limit])

        if (userId) {
          myRank = leaderboard.findIndex(l => l.id === userId) + 1 || null
        }
        break
      }

      default:
        return res.status(400).json({ success: false, error: '未知排行类型' })
    }

    // 序号
    leaderboard.forEach((item, index) => {
      item.rank = index + 1
      item.is_me = item.id === userId
    })

    res.json({
      success: true,
      data: {
        type,
        leaderboard,
        myRank,
        myId: userId
      }
    })
  } catch (error) {
    console.error('排行榜错误:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 获取排行榜总览（多个维度的 Top 3）
 * GET /api/leaderboard/overview
 */
router.get('/overview', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 0

    // 连续打卡 Top 3
    const streakTop = queryAll(db, `
      SELECT u.id, u.username, u.level, u.streak_days as value
      FROM users u WHERE u.streak_days > 0
      ORDER BY u.streak_days DESC LIMIT 3
    `)

    // 今日学习 Top 3
    const todayTop = queryAll(db, `
      SELECT u.id, u.username, u.level, COUNT(sl.id) as value
      FROM users u JOIN study_logs sl ON u.id = sl.user_id
      WHERE date(sl.created_at) = date('now')
      GROUP BY u.id ORDER BY value DESC LIMIT 3
    `)

    // 累计掌握 Top 3
    const masteredTop = queryAll(db, `
      SELECT u.id, u.username, u.level,
             COUNT(CASE WHEN uc.state = 2 THEN 1 END) as value
      FROM users u LEFT JOIN user_cards uc ON u.id = uc.user_id
      GROUP BY u.id HAVING value > 0
      ORDER BY value DESC LIMIT 3
    `)

    // 经验 Top 3
    const expTop = queryAll(db, `
      SELECT u.id, u.username, u.level, u.exp as value
      FROM users u WHERE u.exp > 0
      ORDER BY u.exp DESC LIMIT 3
    `)

    res.json({
      success: true,
      data: {
        streak: streakTop,
        today: todayTop,
        mastered: masteredTop,
        exp: expTop,
        myId: userId
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
