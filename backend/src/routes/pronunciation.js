/**
 * 发音路由 - 11万+单词在线发音
 */

import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载发音数据（懒加载）
let pronunciationData = null

function loadPronunciationData() {
  if (!pronunciationData) {
    const dataPath = path.join(__dirname, '../../data/data.json')
    try {
      const raw = fs.readFileSync(dataPath, 'utf-8')
      pronunciationData = JSON.parse(raw)
      console.log(`🔊 发音库已加载: ${Object.keys(pronunciationData).length} 个单词`)
    } catch (error) {
      console.error('加载发音库失败:', error.message)
      pronunciationData = {}
    }
  }
  return pronunciationData
}

/**
 * 检查发音库状态
 * GET /api/pronunciation/status
 */
router.get('/status', (req, res) => {
  const data = loadPronunciationData()
  res.json({
    success: true,
    totalWords: Object.keys(data).length,
    message: '发音库运行正常'
  })
})

/**
 * 批量获取发音URL
 * POST /api/pronunciation/batch
 */
router.post('/batch', (req, res) => {
  const data = loadPronunciationData()
  const { words } = req.body

  if (!Array.isArray(words)) {
    return res.status(400).json({ success: false, error: 'words 必须是数组' })
  }

  const result = {}
  words.forEach(word => {
    const key = word.toLowerCase().trim()
    if (data[key]) {
      result[key] = data[key]
    }
  })

  res.json({
    success: true,
    count: Object.keys(result).length,
    data: result
  })
})

/**
 * 获取单词发音URL
 * GET /api/pronunciation/:word
 */
router.get('/:word', (req, res) => {
  const data = loadPronunciationData()
  const word = req.params.word.toLowerCase().trim()

  const url = data[word]

  if (url) {
    res.json({
      success: true,
      word: word,
      url: url
    })
  } else {
    res.json({
      success: false,
      word: word,
      url: null,
      message: '未找到该单词的发音'
    })
  }
})

export default router
