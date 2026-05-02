/**
 * 千问 API 服务
 * 用于 AI 单词解析、例句生成、错题分析
 */

import axios from 'axios'

// 千问 API 配置
const QWEN_CONFIG = {
  baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  get apiKey() {
    return process.env.QWEN_API_KEY || ''
  },
  model: 'qwen-plus',  // 默认使用 qwen-plus，性价比高
  timeout: 30000
}

// 创建 axios 实例（禁用代理，直连阿里云）
const client = axios.create({
  baseURL: QWEN_CONFIG.baseURL,
  timeout: QWEN_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json'
  },
  proxy: false  // 禁用代理
})

// 请求拦截器
client.interceptors.request.use(config => {
  if (QWEN_CONFIG.apiKey) {
    config.headers['Authorization'] = `Bearer ${QWEN_CONFIG.apiKey}`
  }
  return config
})

/**
 * 检查 API 是否配置
 */
export function isQwenConfigured() {
  return !!QWEN_CONFIG.apiKey
}

/**
 * 通用 Chat Completion 调用
 */
async function chatCompletion(messages, options = {}) {
  const { model = QWEN_CONFIG.model, temperature = 0.7, maxTokens = 2048 } = options

  try {
    const response = await client.post('/chat/completions', {
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    })

    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model
    }
  } catch (error) {
    console.error('千问 API 调用失败:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    }
  }
}

/**
 * 智能单词解析
 * @param {string} word - 单词
 * @param {string} context - 上下文（可选）
 * @param {string} level - 考试等级 (cet4/cet6/kaoyan/ielts/toefl)
 */
export async function analyzeWord(word, context = '', level = 'cet6') {
  const levelMap = {
    'cet4': '四级',
    'cet6': '六级',
    'kaoyan': '考研',
    'ielts': '雅思',
    'toefl': '托福',
    'k12': '中学'
  }

  const systemPrompt = `你是一位专业的英语词汇教师，擅长为${levelMap[level] || '英语'}考生解析单词。
请用简洁、实用的方式解析单词，帮助学生高效记忆。
重要：英英释义必须使用最简单的英语词汇（如 a, the, is, have, make, go, see, use, good, bad 等基础词汇）来解释，让初学者也能看懂。`

  const userPrompt = context
    ? `请解析单词 "${word}"，上下文：${context}

按以下 JSON 格式输出：
{
  "word": "单词",
  "phonetic": "/音标/",
  "pos": "词性（n./v./adj./adv.等）",
  "meaning": "中文释义（简洁，多个含义用分号分隔）",
  "englishMeaning": "英英释义（用最简单的英语词汇解释，如：to make something happen, to go up, a person who does something）",
  "root": "词根词缀分析（如有）",
  "memoryTip": "记忆技巧（口诀/联想/词根）",
  "collocations": ["常用搭配1", "常用搭配2"],
  "synonyms": ["同义词1", "同义词2"],
  "antonyms": ["反义词1"],
  "examTips": "考试要点提示",
  "example": {
    "en": "真题风格例句",
    "cn": "中文翻译"
  }
}`
    : `请解析单词 "${word}"

按以下 JSON 格式输出：
{
  "word": "单词",
  "phonetic": "/音标/",
  "pos": "词性",
  "meaning": "中文释义",
  "englishMeaning": "英英释义（用最简单的英语词汇解释）",
  "root": "词根词缀分析",
  "memoryTip": "记忆技巧",
  "collocations": ["常用搭配"],
  "synonyms": ["同义词"],
  "antonyms": ["反义词"],
  "examTips": "考试要点",
  "example": {
    "en": "例句",
    "cn": "翻译"
  }
}`

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
 * @param {string} word - 单词
 * @param {string} level - 考试等级
 * @param {number} count - 生成数量
 */
export async function generateExamples(word, level = 'cet6', count = 3) {
  const levelMap = {
    'cet4': '四级',
    'cet6': '六级',
    'kaoyan': '考研',
    'ielts': '雅思',
    'toefl': '托福'
  }

  const systemPrompt = `你是${levelMap[level] || '英语'}考试命题专家，擅长编写符合考试风格的例句。`

  const userPrompt = `请为单词 "${word}" 生成 ${count} 个${levelMap[level]}考试风格的例句。

要求：
1. 句子难度符合${levelMap[level]}水平
2. 包含该单词的常见用法
3. 语境真实、地道

JSON 格式输出：
{
  "examples": [
    {"en": "英文例句", "cn": "中文翻译", "type": "阅读/听力/写作"}
  ]
}`

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
    return { success: false, error: '解析失败' }
  }
}

/**
 * 错题智能分析
 * @param {Array} errorWords - 错词列表
 * @param {Object} userData - 用户学习数据
 */
export async function analyzeErrors(errorWords, userData = {}) {
  const systemPrompt = `你是一位资深的英语学习顾问，擅长分析学生的学习问题并给出针对性建议。`

  const userPrompt = `请分析以下错词数据，给出学习建议：

错词列表：
${errorWords.map(w => `- ${w.word}（错误${w.errorCount}次）`).join('\n')}

用户数据：
- 学习天数：${userData.studyDays || 0}
- 总复习次数：${userData.totalReps || 0}
- 平均正确率：${userData.accuracy || '未知'}

请按以下 JSON 格式输出分析报告：
{
  "errorTypeAnalysis": [
    {"type": "错误类型（如：形近词混淆/多义词理解偏差/拼写错误）", "count": 数量, "examples": ["示例单词"]}
  ],
  "weaknessAnalysis": "整体薄弱环节分析",
  "suggestions": ["具体改进建议1", "具体改进建议2"],
  "studyPlan": {
    "dailyNewWords": 每日新词数量建议,
    "dailyReview": 每日复习数量建议,
    "focusAreas": ["重点突破领域"]
  }
}`

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
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
 * @param {string} text - 文本内容
 * @param {string} level - 考试等级
 */
export async function extractWords(text, level = 'cet6') {
  const systemPrompt = `你是一位英语教学专家，擅长从文章中提取核心词汇。`

  const userPrompt = `请从以下文本中提取${level}级别的核心词汇：

${text.substring(0, 3000)}

要求：
1. 只提取有学习价值的词汇
2. 按重要性排序
3. 标注难度等级

JSON 格式输出：
{
  "words": [
    {
      "word": "单词",
      "meaning": "简要释义",
      "importance": "high/medium/low",
      "reason": "入选理由"
    }
  ],
  "topic": "文章主题",
  "difficulty": "整体难度评估"
}`

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
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
 * @param {string} word - 单词
 * @param {string} meaning - 释义
 */
export async function generateMemoryTip(word, meaning) {
  const systemPrompt = `你是一位创意记忆大师，擅长用谐音、联想、故事等方式帮助记忆单词。`

  const userPrompt = `请为单词 "${word}"（${meaning}）生成一个有趣的记忆方法。

要求：
1. 简短好记（20字以内）
2. 有趣、有画面感
3. 能帮助记住意思或拼写

JSON 格式输出：
{
  "method": "谐音/联想/词根/故事",
  "tip": "记忆口诀或方法",
  "explanation": "解释说明"
}`

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
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

export default {
  isQwenConfigured,
  analyzeWord,
  generateExamples,
  analyzeErrors,
  extractWords,
  generateMemoryTip
}
