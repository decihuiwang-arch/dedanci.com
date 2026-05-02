/**
 * 批量生成单词的英英释义
 * 用法: node scripts/generate-english-meanings.js
 */

import axios from 'axios'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载环境变量
import dotenv from 'dotenv'
dotenv.config({ path: join(__dirname, '../.env') })

// 数据库路径
const DB_PATH = join(__dirname, '../data/dedanci.db')

// API配置
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const QWEN_API_KEY = process.env.QWEN_API_KEY

if (!QWEN_API_KEY) {
  console.error('错误: 请配置 QWEN_API_KEY')
  process.exit(1)
}

// 动态导入 sql.js
const initSqlJs = (await import('sql.js')).default
const SQL = await initSqlJs()

// 加载数据库
const fs = await import('fs')
const dbBuffer = fs.readFileSync(DB_PATH)
const db = new SQL.Database(dbBuffer)

// 查询没有英英释义的单词
function getWordsWithoutEnglishMeaning() {
  const result = db.exec(`
    SELECT id, word, meaning FROM words
    WHERE english_meaning IS NULL OR english_meaning = ''
    ORDER BY id
  `)

  if (result.length === 0) return []

  const columns = result[0].columns
  return result[0].values.map(values => {
    const obj = {}
    columns.forEach((col, i) => {
      obj[col] = values[i]
    })
    return obj
  })
}

// 生成英英释义
async function generateEnglishMeaning(word, meaning) {
  const prompt = `请用最简单的英语词汇（如 a, the, is, have, make, go, see, use 等）解释以下单词。

单词: ${word}
中文意思: ${meaning}

要求：
1. 只用最基础、最常见的英语词汇
2. 解释简洁明了，1-2句话
3. 让初学者也能看懂

直接输出英英释义，不要其他内容。`

  try {
    const response = await axios.post(
      `${QWEN_BASE_URL}/chat/completions`,
      {
        model: 'qwen-plus',
        messages: [
          { role: 'system', content: '你是一位英语教师，擅长用简单的英语解释单词。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${QWEN_API_KEY}`
        },
        timeout: 30000
      }
    )

    return response.data.choices[0].message.content.trim()
  } catch (error) {
    console.error(`生成失败 [${word}]:`, error.response?.data || error.message)
    return null
  }
}

// 更新数据库
function updateEnglishMeaning(id, englishMeaning) {
  db.run('UPDATE words SET english_meaning = ? WHERE id = ?', [englishMeaning, id])
}

// 保存数据库
function saveDatabase() {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

// 主函数
async function main() {
  console.log('=== 批量生成英英释义 ===\n')

  const words = getWordsWithoutEnglishMeaning()
  console.log(`找到 ${words.length} 个需要生成英英释义的单词\n`)

  if (words.length === 0) {
    console.log('所有单词都已有英英释义')
    return
  }

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < words.length; i++) {
    const { id, word, meaning } = words[i]
    console.log(`[${i + 1}/${words.length}] 处理: ${word}`)

    const englishMeaning = await generateEnglishMeaning(word, meaning)

    if (englishMeaning) {
      updateEnglishMeaning(id, englishMeaning)
      console.log(`  ✓ ${englishMeaning.substring(0, 60)}...`)
      successCount++

      // 每10个保存一次
      if (successCount % 10 === 0) {
        saveDatabase()
        console.log(`  [已保存进度]`)
      }
    } else {
      failCount++
    }

    // 避免API限流
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // 最终保存
  saveDatabase()

  console.log(`\n=== 完成 ===`)
  console.log(`成功: ${successCount}`)
  console.log(`失败: ${failCount}`)
}

main().catch(console.error)
