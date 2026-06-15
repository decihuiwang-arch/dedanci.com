/**
 * 成就系统服务
 * 基于学习行为解锁徽章，获取经验值
 */

import { getDatabase, saveDatabase } from '../database/init.js'

// 成就定义
export const ACHIEVEMENTS = {
  // 学习天数
  STREAK_3: { id: 'streak_3', name: '初心不改', icon: '🌱', desc: '连续学习3天', exp: 20 },
  STREAK_7: { id: 'streak_7', name: '七日之约', icon: '🌿', desc: '连续学习7天', exp: 50 },
  STREAK_30: { id: 'streak_30', name: '月度达人', icon: '🌳', desc: '连续学习30天', exp: 200 },
  STREAK_100: { id: 'streak_100', name: '百日坚持', icon: '🏔️', desc: '连续学习100天', exp: 500 },

  // 单词量
  WORDS_10: { id: 'words_10', name: '初出茅庐', icon: '📖', desc: '学习10个单词', exp: 10 },
  WORDS_50: { id: 'words_50', name: '小有所成', icon: '📚', desc: '学习50个单词', exp: 30 },
  WORDS_100: { id: 'words_100', name: '百词斩', icon: '🗡️', desc: '学习100个单词', exp: 80 },
  WORDS_500: { id: 'words_500', name: '词汇达人', icon: '🎓', desc: '学习500个单词', exp: 200 },
  WORDS_1000: { id: 'words_1000', name: '千词斩', icon: '👑', desc: '学习1000个单词', exp: 500 },
  WORDS_3000: { id: 'words_3000', name: '词霸', icon: '🏆', desc: '学习3000个单词', exp: 1500 },

  // 口语
  SPEAK_10: { id: 'speak_10', name: '开口说', icon: '🎤', desc: '完成10次口语评分', exp: 20 },
  SPEAK_50: { id: 'speak_50', name: '声声不息', icon: '🎵', desc: '完成50次口语评分', exp: 80 },
  SPEAK_PERFECT: { id: 'speak_perfect', name: '完美发音', icon: '💯', desc: '口语评分获得100分', exp: 100 },

  // AI 互动
  AI_10: { id: 'ai_10', name: 'AI 好伙伴', icon: '🤖', desc: '使用10次AI解析', exp: 20 },
  EXAM_10: { id: 'exam_10', name: '刷题达人', icon: '✍️', desc: '完成10道真题练习', exp: 30 },

  // 模拟
  SIM_FIRST: { id: 'sim_first', name: '科学探索', icon: '🔬', desc: '首次体验互动模拟', exp: 30 },
  SIM_5: { id: 'sim_5', name: '实验专家', icon: '🧪', desc: '体验5个互动模拟', exp: 80 },

  // 错题
  ERROR_CLEAR: { id: 'error_clear', name: '亡羊补牢', icon: '✅', desc: '清除错题本中5个单词', exp: 50 }
}

// 等级定义（经验值阈值）
const LEVEL_THRESHOLDS = [
  0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500,
  5000, 7000, 10000, 14000, 19000, 25000, 33000, 43000, 55000, 70000
]

/**
 * 获取等级（从经验值计算）
 */
export function getLevelFromExp(exp) {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (exp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
    } else {
      break
    }
  }
  return level
}

/**
 * 获取升级所需经验
 */
export function getExpForNextLevel(level) {
  if (level >= LEVEL_THRESHOLDS.length) return Infinity
  return LEVEL_THRESHOLDS[level]
}

/**
 * 检查并解锁成就
 */
export function checkAchievements(db, userId, event) {
  const newAchievements = []

  const getUserStat = (sql) => {
    const result = db.exec(sql, [userId])
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0]
    }
    return 0
  }

  const hasAchievement = (id) => {
    const result = db.exec('SELECT id FROM achievements WHERE user_id = ? AND achievement_id = ?', [userId, id])
    return result.length > 0 && result[0].values.length > 0
  }

  const unlock = (achievement) => {
    if (!hasAchievement(achievement.id)) {
      db.run(
        'INSERT INTO achievements (user_id, achievement_id, name, icon, description, exp_reward) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, achievement.id, achievement.name, achievement.icon, achievement.desc, achievement.exp]
      )
      newAchievements.push(achievement)
    }
  }

  // 检查连续学习天数
  const streakDays = getUserStat('SELECT streak_days FROM users WHERE id = ?')
  if (streakDays >= 3) unlock(ACHIEVEMENTS.STREAK_3)
  if (streakDays >= 7) unlock(ACHIEVEMENTS.STREAK_7)
  if (streakDays >= 30) unlock(ACHIEVEMENTS.STREAK_30)
  if (streakDays >= 100) unlock(ACHIEVEMENTS.STREAK_100)

  // 检查学习单词数
  const wordsLearned = getUserStat('SELECT COUNT(*) FROM user_cards WHERE user_id = ? AND reps > 0')
  if (wordsLearned >= 10) unlock(ACHIEVEMENTS.WORDS_10)
  if (wordsLearned >= 50) unlock(ACHIEVEMENTS.WORDS_50)
  if (wordsLearned >= 100) unlock(ACHIEVEMENTS.WORDS_100)
  if (wordsLearned >= 500) unlock(ACHIEVEMENTS.WORDS_500)
  if (wordsLearned >= 1000) unlock(ACHIEVEMENTS.WORDS_1000)
  if (wordsLearned >= 3000) unlock(ACHIEVEMENTS.WORDS_3000)

  // 事件驱动检查
  if (event) {
    if (event.type === 'speak' && event.count >= 10) unlock(ACHIEVEMENTS.SPEAK_10)
    if (event.type === 'speak' && event.count >= 50) unlock(ACHIEVEMENTS.SPEAK_50)
    if (event.type === 'speak_perfect') unlock(ACHIEVEMENTS.SPEAK_PERFECT)
    if (event.type === 'ai' && event.count >= 10) unlock(ACHIEVEMENTS.AI_10)
    if (event.type === 'exam' && event.count >= 10) unlock(ACHIEVEMENTS.EXAM_10)
    if (event.type === 'sim_first') unlock(ACHIEVEMENTS.SIM_FIRST)
    if (event.type === 'sim' && event.count >= 5) unlock(ACHIEVEMENTS.SIM_5)
    if (event.type === 'error_clear') unlock(ACHIEVEMENTS.ERROR_CLEAR)
  }

  // 发放经验值
  let totalExp = 0
  for (const ach of newAchievements) {
    totalExp += ach.exp
  }
  if (totalExp > 0) {
    db.run('UPDATE users SET exp = exp + ? WHERE id = ?', [totalExp, userId])
    // 更新等级
    const currentExp = getUserStat('SELECT exp FROM users WHERE id = ?')
    const newLevel = getLevelFromExp(currentExp)
    db.run('UPDATE users SET level = ? WHERE id = ?', [newLevel, userId])
  }

  if (newAchievements.length > 0) {
    saveDatabase()
  }

  return newAchievements
}

/**
 * 获取用户所有成就
 */
export function getUserAchievements(db, userId) {
  const result = db.exec('SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC', [userId])
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

export default { ACHIEVEMENTS, getLevelFromExp, getExpForNextLevel, checkAchievements, getUserAchievements }
