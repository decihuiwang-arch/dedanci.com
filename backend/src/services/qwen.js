/**
 * AI 服务 - 支持 Ollama 本地模型 + 千问云端 API 自动切换
 *
 * 优先级：
 * 1. 本地 Ollama（如果可用且配置了 OLLAMA_BASE_URL）
 * 2. 千问云端 API（如果配置了 QWEN_API_KEY）
 * 3. 降级返回提示信息
 */

import axios from 'axios'

// ===== 配置 =====
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b'

const QWEN_CONFIG = {
  baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  get apiKey() {
    return process.env.QWEN_API_KEY || ''
  },
  model: process.env.QWEN_MODEL || 'qwen-plus',
  timeout: 30000
}

// 模式：ollama / qwen / auto
const AI_MODE = process.env.AI_MODE || 'auto'

// 创建千问 axios 实例
const qwenClient = axios.create({
  baseURL: QWEN_CONFIG.baseURL,
  timeout: QWEN_CONFIG.timeout,
  headers: { 'Content-Type': 'application/json' },
  proxy: false
})

qwenClient.interceptors.request.use(config => {
  if (QWEN_CONFIG.apiKey) {
    config.headers['Authorization'] = `Bearer ${QWEN_CONFIG.apiKey}`
  }
  return config
})

// ===== Ollama 相关 =====

let ollamaAvailable = null

/**
 * 检测 Ollama 是否可用
 */
async function checkOllama() {
  try {
    const res = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 3000 })
    if (res.data?.models) {
      // 检查是否有配置的模型
      const modelNames = res.data.models.map(m => m.name)
      const hasModel = modelNames.some(n => n === OLLAMA_MODEL || n.startsWith(OLLAMA_MODEL.split(':')[0]))
      if (hasModel) {
        ollamaAvailable = true
        console.log(`✅ Ollama 可用，模型: ${OLLAMA_MODEL}`)
        return true
      }
      console.log(`⚠️  Ollama 可用但未找到模型 ${OLLAMA_MODEL}，已有: ${modelNames.join(', ')}`)
    }
    ollamaAvailable = false
  } catch (e) {
    ollamaAvailable = false
    console.log(`⬜ Ollama 不可用: ${e.message}`)
  }
  return false
}

/**
 * Ollama Chat Completion
 */
async function ollamaChatCompletion(messages, options = {}) {
  const { temperature = 0.7, maxTokens = 2048 } = options

  const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: {
      temperature,
      num_predict: maxTokens
    }
  }, { timeout: 60000 })

  return {
    success: true,
    content: response.data.message?.content || '',
    model: response.data.model,
    engine: 'ollama',
    usage: {
      prompt_tokens: response.data.prompt_eval_count || 0,
      completion_tokens: response.data.eval_count || 0
    }
  }
}

// ===== 千问 API =====

/**
 * 千问 Chat Completion
 */
async function qwenChatCompletion(messages, options = {}) {
  const { model = QWEN_CONFIG.model, temperature = 0.7, maxTokens = 2048 } = options

  const response = await qwenClient.post('/chat/completions', {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  })

  return {
    success: true,
    content: response.data.choices[0].message.content,
    usage: response.data.usage,
    model: response.data.model,
    engine: 'qwen'
  }
}

// ===== 统一 Chat Completion 入口 =====

/**
 * 通用 Chat Completion 调用
 * 根据配置自动选择 Ollama 或千问
 */
async function chatCompletion(messages, options = {}) {
  // auto 模式：优先 Ollama，降级千问
  if (AI_MODE === 'auto' || AI_MODE === 'ollama') {
    if (ollamaAvailable === null) {
      await checkOllama()
    }
    if (ollamaAvailable) {
      try {
        return await ollamaChatCompletion(messages, options)
      } catch (e) {
        console.warn(`⚠️  Ollama 调用失败，降级到千问: ${e.message}`)
        if (AI_MODE === 'ollama') {
          return { success: false, error: 'Ollama 调用失败: ' + e.message }
        }
      }
    }
  }

  // 千问 API
  if (AI_MODE === 'auto' || AI_MODE === 'qwen') {
    if (isQwenConfigured()) {
      try {
        return await qwenChatCompletion(messages, options)
      } catch (error) {
        console.error('千问 API 调用失败:', error.response?.data || error.message)
        return {
          success: false,
          error: error.response?.data?.error?.message || error.message
        }
      }
    }
  }

  // 全部不可用
  return {
    success: false,
    error: 'AI 服务不可用。请配置 Ollama 或千问 API Key。',
    hint: '设置 OLLAMA_BASE_URL 或 QWEN_API_KEY 环境变量'
  }
}

// ===== 业务接口 =====

/**
 * 检查 AI 是否配置
 */
export function isQwenConfigured() {
  return !!(QWEN_CONFIG.apiKey || ollamaAvailable)
}

/**
 * 获取 AI 服务状态
 */
export function getAIStatus() {
  return {
    mode: AI_MODE,
    ollama: {
      available: ollamaAvailable,
      url: OLLAMA_BASE_URL,
      model: OLLAMA_MODEL
    },
    qwen: {
      configured: !!QWEN_CONFIG.apiKey,
      model: QWEN_CONFIG.model
    }
  }
}

/**
 * 智能单词解析
 */
export async function analyzeWord(word, context = '', level = 'cet6') {
  const levelMap = {
    'cet4': '四级', 'cet6': '六级', 'kaoyan': '考研',
    'ielts': '雅思', 'toefl': '托福', 'k12': '中学'
  }

  const systemPrompt = `你是一位专业的英语词汇教师，擅长为${levelMap[level] || '英语'}考生解析单词。
请用简洁、实用的方式解析单词，帮助学生高效记忆。
重要：英英释义必须使用最简单的英语词汇来解释，让初学者也能看懂。`

  const userPrompt = context
    ? `请解析单词 "${word}"，上下文：${context}\n\n按以下 JSON 格式输出：\n{"word":"单词","phonetic":"/音标/","pos":"词性","meaning":"中文释义","englishMeaning":"英英释义（用最简单的英语）","root":"词根词缀分析","memoryTip":"记忆技巧","collocations":["常用搭配1","常用搭配2"],"synonyms":["同义词1"],"antonyms":["反义词1"],"examTips":"考试要点","example":{"en":"例句","cn":"翻译"}}`
    : `请解析单词 "${word}"\n\n按以下 JSON 格式输出：\n{"word":"单词","phonetic":"/音标/","pos":"词性","meaning":"中文释义","englishMeaning":"英英释义（用最简单的英语）","root":"词根词缀分析","memoryTip":"记忆技巧","collocations":["常用搭配"],"synonyms":["同义词"],"antonyms":["反义词"],"examTips":"考试要点","example":{"en":"例句","cn":"翻译"}}`

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { maxTokens: 1024 })

  if (!result.success) return result

  try {
    let jsonContent = result.content
    if (jsonContent.includes('```')) {
      jsonContent = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || jsonContent
    }
    return { success: true, data: JSON.parse(jsonContent.trim()) }
  } catch {
    return { success: true, data: null, rawContent: result.content }
  }
}

/**
 * 生成真题风格例句
 */
export async function generateExamples(word, level = 'cet6', count = 3) {
  const levelMap = {
    'cet4': '四级', 'cet6': '六级', 'kaoyan': '考研',
    'ielts': '雅思', 'toefl': '托福'
  }

  const result = await chatCompletion([
    { role: 'system', content: `你是${levelMap[level] || '英语'}考试命题专家。` },
    { role: 'user', content: `请为单词 "${word}" 生成 ${count} 个${levelMap[level]}考试风格的例句。\n\nJSON 格式输出：\n{"examples":[{"en":"英文例句","cn":"中文翻译","type":"阅读/听力/写作"}]}` }
  ], { maxTokens: 1024 })

  if (!result.success) return result

  try {
    let jsonContent = result.content
    if (jsonContent.includes('```')) {
      jsonContent = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || jsonContent
    }
    return { success: true, data: JSON.parse(jsonContent.trim()) }
  } catch {
    return { success: false, error: '解析失败' }
  }
}

/**
 * 错题智能分析
 */
export async function analyzeErrors(errorWords, userData = {}) {
  const result = await chatCompletion([
    { role: 'system', content: '你是一位资深的英语学习顾问，擅长分析学生的学习问题并给出针对性建议。' },
    { role: 'user', content: `请分析以下错词数据，给出学习建议：\n\n错词列表：\n${errorWords.map(w => `- ${w.word}（错误${w.errorCount}次）`).join('\n')}\n\n用户数据：\n- 学习天数：${userData.studyDays || 0}\n- 总复习次数：${userData.totalReps || 0}\n- 平均正确率：${userData.accuracy || '未知'}\n\nJSON 格式输出：\n{"errorTypeAnalysis":[{"type":"错误类型","count":数量,"examples":["示例单词"]}],"weaknessAnalysis":"整体薄弱环节分析","suggestions":["建议1","建议2"],"studyPlan":{"dailyNewWords":数量,"dailyReview":数量,"focusAreas":["重点突破"]}}` }
  ], { maxTokens: 1536 })

  if (!result.success) return result

  try {
    let jsonContent = result.content
    if (jsonContent.includes('```')) {
      jsonContent = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || jsonContent
    }
    return { success: true, data: JSON.parse(jsonContent.trim()) }
  } catch {
    return { success: false, error: '解析失败' }
  }
}

/**
 * 从文本提取生词
 */
export async function extractWords(text, level = 'cet6') {
  const result = await chatCompletion([
    { role: 'system', content: '你是一位英语教学专家，擅长从文章中提取核心词汇。' },
    { role: 'user', content: `请从以下文本中提取${level}级别的核心词汇：\n\n${text.substring(0, 3000)}\n\nJSON 格式输出：\n{"words":[{"word":"单词","meaning":"简要释义","importance":"high/medium/low","reason":"入选理由"}],"topic":"文章主题","difficulty":"难度评估"}` }
  ], { maxTokens: 2048 })

  if (!result.success) return result

  try {
    let jsonContent = result.content
    if (jsonContent.includes('```')) {
      jsonContent = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || jsonContent
    }
    return { success: true, data: JSON.parse(jsonContent.trim()) }
  } catch {
    return { success: false, error: '解析失败' }
  }
}

/**
 * 生成记忆口诀
 */
export async function generateMemoryTip(word, meaning) {
  const result = await chatCompletion([
    { role: 'system', content: '你是一位创意记忆大师，擅长用谐音、联想、故事等方式帮助记忆单词。' },
    { role: 'user', content: `请为单词 "${word}"（${meaning}）生成一个有趣的记忆方法。\n\nJSON 格式输出：\n{"method":"谐音/联想/词根/故事","tip":"记忆口诀","explanation":"解释说明"}` }
  ], { maxTokens: 512 })

  if (!result.success) return result

  try {
    let jsonContent = result.content
    if (jsonContent.includes('```')) {
      jsonContent = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || jsonContent
    }
    return { success: true, data: JSON.parse(jsonContent.trim()) }
  } catch {
    return { success: false, error: '解析失败' }
  }
}

/**
 * 生成真题风格选择题
 */
export async function generateExamQuestion(word, level = 'cet6') {
  const levelMap = {
    'cet4': '四级', 'cet6': '六级', 'kaoyan': '考研',
    'ielts': '雅思', 'toefl': '托福', 'k12': '中学', 'gre': 'GRE'
  }

  const result = await chatCompletion([
    { role: 'system', content: `你是一位${levelMap[level] || '英语'}考试命题专家。` },
    { role: 'user', content: `请为单词 "${word}" 创作一道${levelMap[level]}考试风格的词汇选择题。\n\nJSON 格式输出：\n{"question":"题干","options":["A选项","B选项","C选项","D选项"],"answer":0,"explanation":"解析","source":"模拟题"}` }
  ], { maxTokens: 1024 })

  if (!result.success) return result

  try {
    let jsonContent = result.content
    if (jsonContent.includes('```')) {
      jsonContent = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || jsonContent
    }
    return { success: true, data: JSON.parse(jsonContent.trim()) }
  } catch {
    return { success: false, error: '解析AI响应失败' }
  }
}

/**
 * 生成智能学习计划
 * 根据用户当前学习数据，AI 生成个性化学习计划
 */
export async function generateStudyPlan(userData) {
  const {
    level = 1,
    streakDays = 0,
    totalWords = 0,
    masteredWords = 0,
    learningWords = 0,
    newWords = 0,
    todayStudied = 0,
    accuracy = 0,
    avgDailyNew = 0,
    avgDailyReview = 0,
    examDate = '',
    examType = 'cet6',
    targetWordsPerDay = 0
  } = userData

  const levelMap = {
    'cet4': '四级', 'cet6': '六级', 'kaoyan': '考研',
    'ielts': '雅思', 'toefl': '托福', 'k12': '中学', 'gre': 'GRE'
  }

  const result = await chatCompletion([
    {
      role: 'system',
      content: `你是一位专业的英语学习规划师，精通FSRS间隔重复算法和艾宾浩斯遗忘曲线。
请根据用户的学习数据，生成个性化的学习计划。计划要具体、可执行、有挑战性但可实现。
考试类型：${levelMap[examType] || '英语'}
用户等级：Lv.${level}
连续学习：${streakDays}天
今日已学：${todayStudied}词
正确率：${accuracy}%`
    },
    {
      role: 'user',
      content: `请为我制定学习计划：

当前数据：
- 总词量：${totalWords}，已掌握：${masteredWords}，学习中：${learningWords}，未学：${newWords}
- 日均新学：${avgDailyNew}词，日均复习：${avgDailyReview}词
- 连续打卡：${streakDays}天
- 今日已学：${todayStudied}词，正确率：${accuracy}%
${examDate ? `- 考试日期：${examDate}` : ''}
${targetWordsPerDay ? `- 目标每日新学：${targetWordsPerDay}词` : ''}

JSON 格式输出：
{"plan":{"dailyNewWords":数量,"dailyReview":数量,"totalDays":预计天数,"milestones":[{"day":天数,"target":"目标描述","words":累计词量}]},"suggestions":["建议1","建议2","建议3"],"encouragement":"鼓励语","reviewStrategy":"复习策略说明"}`
    }
  ], { maxTokens: 1536 })

  if (!result.success) return result

  try {
    let jsonContent = result.content
    if (jsonContent.includes('```')) {
      jsonContent = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || jsonContent
    }
    return { success: true, data: JSON.parse(jsonContent.trim()) }
  } catch {
    return { success: false, error: '学习计划生成失败' }
  }
}

/**
 * 生成智能复习建议
 * 根据当前待复习单词的分布情况，给出最优复习顺序建议
 */
export async function generateReviewAdvice(reviewData) {
  const {
    dueCards = 0,
    newCards = 0,
    learningCards = 0,
    overdueCards = 0,
    todayDone = 0,
    todayGoal = 0,
    accuracy = 0,
    worstWords = [],
    timeOfDay = 'morning'
  } = reviewData

  const timeMap = {
    morning: '早上（记忆黄金期）',
    afternoon: '下午',
    evening: '晚上',
    night: '深夜'
  }

  const result = await chatCompletion([
    {
      role: 'system',
      content: '你是一位FSRS间隔重复算法专家和学习教练。根据用户当前的复习数据，给出简洁的、可操作的复习建议。'
    },
    {
      role: 'user',
      content: `当前复习状态：
- 待复习：${dueCards}词（其中逾期${overdueCards}词）
- 新词：${newCards}词
- 学习中：${learningCards}词
- 今日已完成：${todayDone}/${todayGoal}词
- 今日正确率：${accuracy}%
- 时间段：${timeMap[timeOfDay] || timeOfDay}
${worstWords.length > 0 ? `- 薄弱词：${worstWords.slice(0, 8).map(w => w.word).join('、')}` : ''}

JSON 格式输出：
{"priority":"high/medium/low","strategy":"核心策略（一句话）","order":["建议1","建议2","建议3"],"timeAdvice":"时间安排建议","focusWords":["需要重点关注的单词类型"],"motivation":"激励语"}`
    }
  ], { maxTokens: 768 })

  if (!result.success) return result

  try {
    let jsonContent = result.content
    if (jsonContent.includes('```')) {
      jsonContent = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || jsonContent
    }
    return { success: true, data: JSON.parse(jsonContent.trim()) }
  } catch {
    return { success: false, error: '复习建议生成失败' }
  }
}

/**
 * AI 单词问答聊天
 * 针对当前学习单词进行互动问答
 */
export async function chatAboutWord(question, context = '') {
  const result = await chatCompletion([
    {
      role: 'system',
      content: `你是一位友好的英语学习助手，正在帮助学生理解英语单词。请用简洁易懂的语言回答问题，适当使用加粗和列表让回答更清晰。
${context ? `\n当前学习上下文：${context}` : ''}`
    },
    { role: 'user', content: question }
  ], { maxTokens: 1024 })

  if (!result.success) return result

  return {
    success: true,
    data: {
      answer: result.content,
      engine: result.engine
    }
  }
}

/**
 * 生成 AI 学习报告
 * 根据用户学习数据生成详细的学习报告（Markdown 格式）
 */
export async function generateStudyReport(reportData) {
  const {
    totalWords = 0,
    mastered = 0,
    totalReps = 0,
    totalLapses = 0,
    accuracy = 0,
    streakDays = 0,
    todayTotal = 0,
    masteryPercent = 0,
    avgDaily = 0,
    recentTrend = [],
    bestHours = [],
    examType = 'cet6'
  } = reportData

  const levelMap = {
    'cet4': '四级', 'cet6': '六级', 'kaoyan': '考研',
    'ielts': '雅思', 'toefl': '托福'
  }

  const trendSummary = recentTrend.length > 0
    ? `最近${recentTrend.length}天学习量：${recentTrend.map(d => d.total).join(' → ')}`
    : ''

  const result = await chatCompletion([
    {
      role: 'system',
      content: `你是一位专业的英语学习分析师，请根据用户的学习数据生成一份详细的个性化学习报告。
报告使用 Markdown 格式，包含标题、小标题、列表、加粗等格式。
报告风格：专业但友好，数据驱动，有建设性。
考试类型：${levelMap[examType] || '英语'}`
    },
    {
      role: 'user',
      content: `请生成学习报告：

## 学习数据概览
- 总学习词量：${totalWords}词
- 已掌握：${mastered}词（掌握率 ${masteryPercent}%）
- 总复习次数：${totalReps}次
- 总错误次数：${totalLapses}次
- 整体正确率：${accuracy}%
- 连续打卡：${streakDays}天
- 今日学习：${todayTotal}次
- 日均学习：${avgDaily}词
${trendSummary ? `- 趋势：${trendSummary}` : ''}
${bestHours.length > 0 ? `- 高效时段：${bestHours.join('、')}时` : ''}

请生成包含以下部分的报告：
1. 整体评估（等级 A/B/C/D + 一句话总结）
2. 数据亮点（3-5 个亮点）
3. 待提升领域（2-3 个方面）
4. 个性化建议（3-5 条可执行的建议）
5. 下周目标（具体的量化目标）
6. 激励语`
    }
  ], { maxTokens: 2048 })

  if (!result.success) return result

  return {
    success: true,
    data: {
      report: result.content,
      engine: result.engine
    }
  }
}

export default {
  isQwenConfigured,
  getAIStatus,
  analyzeWord,
  generateExamples,
  analyzeErrors,
  extractWords,
  generateMemoryTip,
  generateExamQuestion,
  generateStudyPlan,
  generateReviewAdvice,
  chatAboutWord,
  generateStudyReport
}
