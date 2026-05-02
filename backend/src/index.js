/**
 * dedanci.com 后端服务
 * 得单词者得天下 - 智能背单词系统
 *
 * 技术栈: Node.js + Express + SQLite + FSRS算法 + 千问API
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import FormData from 'form-data'
import fetch from 'node-fetch'
import fs from 'fs'

// 加载环境变量
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

import { initDatabase } from './database/init.js'
import studyRoutes from './routes/study.js'
import vocabularyRoutes from './routes/vocabulary.js'
import aiRoutes from './routes/ai.js'
import pronunciationRoutes from './routes/pronunciation.js'
import errorBookRoutes from './routes/errorBook.js'
import { isQwenConfigured } from './services/qwen.js'

const app = express()
const PORT = process.env.PORT || 5000

// 中间件
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3002', 'http://localhost:3003', 'https://dedanci.com', 'http://dedanci.com']

app.use(cors({
  origin: function (origin, callback) {
    // 无 origin（如服务器端请求）或 origin 在白名单中则放行
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true)
    } else {
      callback(null, true) // 开发阶段先放行
    }
  },
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 路由
app.use('/api/study', studyRoutes)
app.use('/api/vocabularies', vocabularyRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/pronunciation', pronunciationRoutes)
app.use('/api/error-book', errorBookRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '得单词者得天下 - 服务运行中',
    version: '1.0.0'
  })
})

// 发音评分代理接口（转发到 4060Ti）
const PRONUNCIATION_SERVICE = 'http://192.168.0.102:5001/score'

app.post('/api/pronunciation/score', express.raw({ type: 'audio/webm', limit: '5mb' }), async (req, res) => {
  try {
    const word = req.query.word || ''
    if (!word) {
      return res.status(400).json({ success: false, error: '缺少目标单词' })
    }

    // 创建 form-data
    const form = new FormData()
    form.append('audio', req.body, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    })
    form.append('word', word)

    // 转发到 4060Ti
    const response = await fetch(PRONUNCIATION_SERVICE, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    })

    const result = await response.json()
    res.json(result)
  } catch (error) {
    console.error('发音评分代理错误:', error.message)
    res.status(500).json({ success: false, error: '评分服务暂不可用' })
  }
})

// API 文档
app.get('/api', (req, res) => {
  res.json({
    name: 'dedanci.com API',
    description: '智能背单词系统 API',
    endpoints: {
      study: {
        'GET /api/study/today': '获取今日学习任务',
        'POST /api/study/review': '提交复习结果',
        'POST /api/study/preview': '预览复习结果',
        'GET /api/study/stats': '获取学习统计'
      },
      vocabularies: {
        'GET /api/vocabularies': '获取词库列表',
        'GET /api/vocabularies/:id': '获取词库详情',
        'POST /api/vocabularies': '创建词库',
        'POST /api/vocabularies/extract': '从文本提取生词',
        'POST /api/vocabularies/:id/words': '添加单词到词库'
      },
      ai: {
        'GET /api/ai/status': '检查 AI 状态',
        'GET /api/ai/analyze/:word': '智能单词解析',
        'GET /api/ai/examples/:word': '生成例句',
        'GET /api/ai/memory/:word': '生成记忆口诀',
        'POST /api/ai/analyze-errors': '错题分析'
      },
      errorBook: {
        'GET /api/error-book': '获取错题列表',
        'DELETE /api/error-book/:wordId': '清除错题'
      },
      pronunciation: {
        'GET /api/pronunciation/:word': '获取单词发音URL',
        'POST /api/pronunciation/batch': '批量获取发音URL',
        'GET /api/pronunciation/status': '发音库状态'
      }
    }
  })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] 服务器错误:`, err.stack || err.message)
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  })
})

// 生产环境：提供前端构建文件
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist')
  app.use(express.static(frontendDist))
  // SPA 支持：所有非 API 路由返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'))
    }
  })
  console.log(`📦 生产模式: 提供前端静态文件`)
}

// 启动服务
async function start() {
  try {
    await initDatabase()
    console.log('✅ 数据库初始化完成')

    app.listen(PORT, () => {
      console.log(`🚀 dedanci.com 后端服务已启动`)
      console.log(`📍 http://localhost:${PORT}`)
      console.log(`📖 API 文档: http://localhost:${PORT}/api`)

      if (isQwenConfigured()) {
        console.log(`🤖 千问 AI: 已配置`)
      } else {
        console.log(`⚠️  千问 AI: 未配置，请设置 QWEN_API_KEY`)
      }
    })
  } catch (error) {
    console.error('❌ 启动失败:', error)
    process.exit(1)
  }
}

start()
