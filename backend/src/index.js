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
import authRoutes from './routes/auth.js'
import achievementRoutes from './routes/achievements.js'
import leaderboardRoutes from './routes/leaderboard.js'
import { isQwenConfigured, getAIStatus } from './services/qwen.js'
import { scorePronunciation, getScoringStatus } from './services/pronunciationScore.js'
import { authMiddleware } from './services/auth.js'

const app = express()
const PORT = process.env.PORT || 5000

// 中间件
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3002', 'http://localhost:3003', 'https://dedanci.com', 'http://dedanci.com']

app.use(cors({
  origin: function (origin, callback) {
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

// 认证路由（无需鉴权）
app.use('/api/auth', authRoutes)

// 以下路由使用鉴权中间件
app.use(authMiddleware)

// 业务路由
app.use('/api/study', studyRoutes)
app.use('/api/vocabularies', vocabularyRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/pronunciation', pronunciationRoutes)
app.use('/api/error-book', errorBookRoutes)
app.use('/api/achievements', achievementRoutes)
app.use('/api/leaderboard', leaderboardRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '得单词者得天下 - 服务运行中',
    version: '2.0.0'
  })
})

// 发音评分接口（前端 PCM 直传，多引擎 + 自动降级）
app.post('/api/pronunciation/score', express.raw({ type: 'application/octet-stream', limit: '2mb' }), async (req, res) => {
  try {
    const word = req.query.word || ''
    if (!word) {
      return res.status(400).json({ success: false, error: '缺少目标单词' })
    }

    const result = await scorePronunciation(req.body, word)
    res.json(result)
  } catch (error) {
    console.error('发音评分错误:', error.message)
    res.status(500).json({ success: false, error: '评分服务暂不可用' })
  }
})

// 评分引擎状态接口
app.get('/api/pronunciation/scoring-status', (req, res) => {
  res.json({
    success: true,
    data: getScoringStatus()
  })
})

// API 文档
app.get('/api', (req, res) => {
  res.json({
    name: 'dedanci.com API',
    description: '智能背单词系统 API v2.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': '邮箱注册',
        'POST /api/auth/login': '邮箱登录',
        'POST /api/auth/guest': '游客模式',
        'GET /api/auth/me': '获取用户信息',
        'PUT /api/auth/profile': '更新用户信息'
      },
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
        'GET /api/ai/exam-question/:word': '生成真题',
        'POST /api/ai/analyze-errors': '错题分析'
      },
      errorBook: {
        'GET /api/error-book': '获取错题列表',
        'DELETE /api/error-book/:wordId': '清除错题'
      },
      pronunciation: {
        'GET /api/pronunciation/:word': '获取单词发音URL',
        'POST /api/pronunciation/batch': '批量获取发音URL',
        'GET /api/pronunciation/status': '发音库状态',
        'POST /api/pronunciation/score': '口语评分(多引擎+自动降级)',
        'GET /api/pronunciation/scoring-status': '评分引擎状态'
      },
      leaderboard: {
        'GET /api/leaderboard': '获取排行榜(type=streak|today|mastered|exp)',
        'GET /api/leaderboard/overview': '排行榜总览(Top3)'
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
        console.log(`🤖 AI 服务: 已配置`)
      } else {
        console.log(`⚠️  AI 服务: 未配置，请设置 OLLAMA_BASE_URL 或 QWEN_API_KEY`)
      }
      
      const aiStatus = getAIStatus()
      if (aiStatus.ollama.available) {
        console.log(`   ✅ Ollama: ${aiStatus.ollama.model} @ ${aiStatus.ollama.url}`)
      } else {
        console.log(`   ⬜ Ollama: 不可用 (设置 OLLAMA_BASE_URL 启用)`)
      }
      if (aiStatus.qwen.configured) {
        console.log(`   ✅ 千问: ${aiStatus.qwen.model}`)
      } else {
        console.log(`   ⬜ 千问: 未配置 (设置 QWEN_API_KEY 启用)`)
      }

      const scoringStatus = getScoringStatus()
      console.log(`🎤 口语评分: ${scoringStatus.activeEngineName} (PCM直传, Workers兼容)`)
      for (const [name, eng] of Object.entries(scoringStatus.engines)) {
        console.log(`   ${eng.configured ? '✅' : '⬜'} ${eng.name}: ${eng.configured ? '已配置' : '未配置'}`)
      }
    })
  } catch (error) {
    console.error('❌ 启动失败:', error)
    process.exit(1)
  }
}

start()
