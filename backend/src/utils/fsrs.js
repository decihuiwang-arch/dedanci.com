/**
 * FSRS-4.5 算法实现
 * Free Spaced Repetition Scheduler
 *
 * 参考: https://github.com/open-spaced-repetition/fsrs4anki
 */

// FSRS 默认参数
const DEFAULT_PARAMS = {
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  requestRetention: 0.9,
  maximumInterval: 36500,
  easyBonus: 1.3,
  hardInterval: 1.2
}

// 用户评分等级
const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4
}

// 卡片状态
const State = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3
}

/**
 * FSRS 核心类
 */
class FSRS {
  constructor(params = {}) {
    this.params = { ...DEFAULT_PARAMS, ...params }
    this.w = this.params.w
  }

  calculateRetrievability(stability, elapsedDays) {
    return Math.pow(1 + elapsedDays / (9 * stability), -1)
  }

  calculateInterval(stability, desiredRetention = null) {
    const retention = desiredRetention || this.params.requestRetention
    const interval = (9 * stability * (1 / retention - 1))
    return Math.min(Math.round(interval), this.params.maximumInterval)
  }

  calculateInitialDifficulty(rating) {
    const w = this.w
    return Math.min(Math.max(w[4] - Math.exp(w[5] * (rating - 1)) + 1, 1), 10)
  }

  calculateDifficultyChange(currentDifficulty, rating) {
    const w = this.w
    const deltaDifficulty = w[6] * (rating - 3)
    const meanReversion = w[7] * (w[4] - currentDifficulty)
    return Math.min(Math.max(currentDifficulty + deltaDifficulty + meanReversion, 1), 10)
  }

  calculateStability(rating, difficulty, stability, retrievability) {
    const w = this.w
    switch (rating) {
      case Rating.Again:
        return Math.max(0.1, w[11] * Math.pow(difficulty, -w[12]) *
          (Math.pow(stability + 1, w[13]) - 1) *
          Math.exp(w[14] * (1 - retrievability)))
      case Rating.Hard:
        return stability * Math.exp(w[15] * (1 - retrievability))
      case Rating.Good:
        return stability * (1 + Math.exp(w[8]) * (11 - difficulty) *
          Math.pow(stability, -w[9]) *
          (Math.exp((1 - retrievability) * w[10]) - 1))
      case Rating.Easy:
        return stability * Math.exp(w[15] * (1 - retrievability)) * this.params.easyBonus
      default:
        return stability
    }
  }

  /**
   * 核心调度函数
   */
  repeat(card, rating) {
    const now = Date.now()
    let { state, difficulty, stability, lastReview } = card
    let elapsedDays = 0

    if (lastReview) {
      elapsedDays = (now - lastReview) / (1000 * 60 * 60 * 24)
    }

    let newState = state
    let newDifficulty = difficulty || 5
    let newStability = stability || 1
    let scheduledDays = 0

    if (state === State.New) {
      newDifficulty = this.calculateInitialDifficulty(rating)
      if (rating === Rating.Again) {
        newStability = 0.1
        newState = State.Learning
      } else if (rating === Rating.Hard) {
        newStability = 0.5
        newState = State.Learning
      } else if (rating === Rating.Good) {
        newStability = 1
        newState = State.Learning
      } else {
        newStability = 2
        newState = State.Review
        scheduledDays = this.calculateInterval(newStability)
      }
    } else if (state === State.Learning || state === State.Relearning) {
      newDifficulty = this.calculateDifficultyChange(difficulty, rating)
      if (rating === Rating.Again) {
        newStability = 0.5
        newState = State.Relearning
      } else {
        newStability = this.calculateStability(rating, difficulty, stability, 0.9)
        newState = State.Review
        scheduledDays = this.calculateInterval(newStability)
      }
    } else if (state === State.Review) {
      const retrievability = this.calculateRetrievability(stability, elapsedDays)
      newDifficulty = this.calculateDifficultyChange(difficulty, rating)
      newStability = this.calculateStability(rating, difficulty, stability, retrievability)
      if (rating === Rating.Again) {
        newState = State.Relearning
      } else {
        scheduledDays = this.calculateInterval(newStability)
      }
    }

    const nextReview = scheduledDays > 0
      ? now + scheduledDays * 24 * 60 * 60 * 1000
      : now + 10 * 60 * 1000 // 10分钟后

    return {
      state: newState,
      difficulty: Math.round(newDifficulty * 100) / 100,
      stability: Math.round(newStability * 100) / 100,
      scheduledDays,
      nextReview,
      lastReview: now
    }
  }

  /**
   * 获取今日待复习卡片
   */
  getTodayCards(cards) {
    const now = Date.now()
    const todayEnd = new Date().setHours(23, 59, 59, 999)
    return cards.filter(card => !card.nextReview || card.nextReview <= todayEnd)
  }

  /**
   * 预览复习结果
   */
  previewSchedule(card, rating) {
    const result = this.repeat(card, rating)
    return {
      interval: result.scheduledDays,
      difficulty: result.difficulty
    }
  }
}

export { FSRS, Rating, State, DEFAULT_PARAMS }
export default FSRS
