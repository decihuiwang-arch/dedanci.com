/**
 * 成就系统路由
 */

import express from 'express'
import { getDatabase } from '../database/init.js'
import { getUserAchievements, checkAchievements, ACHIEVEMENTS, getLevelFromExp, getExpForNextLevel } from '../services/achievements.js'

const router = express.Router()

/**
 * 获取用户成就列表
 * GET /api/achievements
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1
    const unlocked = getUserAchievements(db, userId)

    // 合并所有成就定义
    const allAchievements = Object.values(ACHIEVEMENTS).map(ach => {
      const found = unlocked.find(u => u.achievement_id === ach.id)
      return {
        ...ach,
        unlocked: !!found,
        unlocked_at: found?.unlocked_at || null
      }
    })

    // 计算统计
    const totalExp = unlocked.reduce((sum, a) => sum + (a.exp_reward || 0), 0)
    const currentLevel = getLevelFromExp(totalExp)
    const nextLevelExp = getExpForNextLevel(currentLevel)

    res.json({
      success: true,
      data: {
        achievements: allAchievements,
        stats: {
          unlocked_count: unlocked.length,
          total_count: allAchievements.length,
          total_exp: totalExp,
          level: currentLevel,
          next_level_exp: nextLevelExp,
          progress_percent: nextLevelExp === Infinity ? 100 : Math.round((totalExp / nextLevelExp) * 100)
        }
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 手动触发成就检查（前端调用）
 * POST /api/achievements/check
 */
router.post('/check', (req, res) => {
  try {
    const db = getDatabase()
    const userId = req.userId || 1
    const { event } = req.body

    const newAchievements = checkAchievements(db, userId, event)

    res.json({
      success: true,
      data: {
        new_achievements: newAchievements,
        count: newAchievements.length
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
