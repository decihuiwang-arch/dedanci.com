/**
 * 发音评分引擎
 * 支持：讯飞 / 阿里云 / Whisper (4060Ti)
 * 可通过 .env 切换
 */

import axios from 'axios'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============ 讯飞 API ============
const XF_APPID = process.env.XF_APPID || ''
const XF_API_KEY = process.env.XF_API_KEY || ''
const XF_API_SECRET = process.env.XF_API_SECRET || ''

/**
 * 讯飞英语口语评测
 * @param {Buffer} audioBuffer - 音频数据 (PCM/WAV)
 * @param {string} word - 目标单词
 */
export async function scoreWithXunfei(audioBuffer, word) {
  const url = 'https://rest-api.xfyun.cn/v2/word_evaluation'

  // 生成当前时间的 RFC1123 格式
  const date = new Date().toUTCString()
  const digest = crypto.createHash('sha256').update(
    `audio:${audioBuffer.length}:audio/L16;rate=16000`
  ).digest('base64')

  // 构建请求
  try {
    const response = await axios.post(url, {
      header: {
        app_id: XF_APPID,
        status: 3  // 3=一次性传完
      },
      parameter: {
        wrd_eval: {
          result: {
            enc: 'utf8',
            compress: 'raw',
            format: 'plain'
          }
        }
      },
      payload: {
        audio: {
          encoding: 'lame',
          sample_rate: 16000,
          channels: 1,
          bit_depth: 16,
          audio: audioBuffer.toString('base64')
        },
        ref_text: {
          encoding: 'utf8',
          compress: 'raw',
          format: 'plain',
          text: Buffer.from(word).toString('base64')
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': buildXfAuth()
      }
    })

    const data = response.data
    if (data.code === 0 && data.payload?.wrd_eval?.result) {
      const result = JSON.parse(
        Buffer.from(data.payload.wrd_eval.result.encoding === 'utf8'
          ? data.payload.wrd_eval.result.text
          : data.payload.wrd_eval.result.text, 'base64').toString()
      )
      return {
        success: true,
        score: Math.round(result.total_score * 100),
        feedback: getXfFeedback(result.total_score),
        recognized_word: word,
        recognized_text: word,
        details: result
      }
    }
    throw new Error(data.message || '讯飞评分失败')
  } catch (error) {
    console.error('讯飞评分错误:', error.response?.data || error.message)
    return {
      success: false,
      error: '讯飞评分失败: ' + (error.response?.data?.message || error.message)
    }
  }
}

function buildXfAuth() {
  // 讯飞 HMAC-SHA256 签名
  const date = new Date().toUTCString()
  const signatureOrigin = `host: rest-api.xfyun.cn\ndate: ${date}\nGET /v2/word_evaluation HTTP/1.1`
  const signature = crypto.createHmac('sha256', XF_API_SECRET)
    .update(signatureOrigin)
    .digest('base64')
  return `hmac username="${XF_APPID}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
}

function getXfFeedback(score) {
  if (score >= 0.9) return '发音非常标准！'
  if (score >= 0.75) return '发音不错，继续加油'
  if (score >= 0.6) return '发音一般，注意重音'
  return '需要加强练习'
}

// ============ 阿里云语音评测 ============
const ALI_APPKEY = process.env.ALI_NLS_APPKEY || ''
const ALI_ACCESS_KEY = process.env.ALI_ACCESS_KEY_ID || ''
const ALI_ACCESS_SECRET = process.env.ALI_ACCESS_KEY_SECRET || ''

export async function scoreWithAliyun(audioBuffer, word) {
  // 阿里云智能语音评测 (NLS) - 需要先获取 token
  try {
    const tokenUrl = `https://nls-meta.cn-shanghai.aliyuncs.com/api/v1/token?AccessKeyId=${ALI_ACCESS_KEY}&AccessKeySecret=${ALI_ACCESS_SECRET}`
    const tokenRes = await axios.get(tokenUrl)
    const token = tokenRes.data.Token?.Id

    if (!token) throw new Error('获取阿里云 Token 失败')

    // 转 base64 发送
    const base64Audio = audioBuffer.toString('base64')

    const response = await axios.post('https://nls-gateway.cn-shanghai.aliyuncs.com/rest/v1/assessment', {
      appkey: ALI_APPKEY,
      token: token,
      text: word,
      audio: base64Audio,
      format: 'pcm',
      sample_rate: 16000
    })

    if (response.data.status === 200) {
      const score = response.data.result?.pronunciation_score || 0
      return {
        success: true,
        score: Math.round(score),
        feedback: score >= 85 ? '发音标准！' : score >= 70 ? '发音不错' : '需要改进',
        recognized_word: word,
        recognized_text: word
      }
    }
    throw new Error(response.data.message)
  } catch (error) {
    console.error('阿里云评分错误:', error.message)
    return { success: false, error: '阿里云评分失败: ' + error.message }
  }
}

// ============ 评分引擎选择器 ============
const ENGINES = {
  xunfei: { check: () => !!(XF_APPID && XF_API_KEY), score: scoreWithXunfei },
  aliyun: { check: () => !!(ALI_APPKEY && ALI_ACCESS_KEY), score: scoreWithAliyun },
  whisper: { check: () => true, score: null } // 本地转发
}

export function getPreferredEngine() {
  const preferred = process.env.PRONUNCIATION_ENGINE || 'whisper'
  if (ENGINES[preferred]?.check()) return preferred

  // 自动降级
  for (const [name, engine] of Object.entries(ENGINES)) {
    if (engine.check() && name !== 'whisper') return name
  }
  return 'whisper'
}

export function isCloudScoringAvailable() {
  return !!ENGINES[getPreferredEngine()]?.score
}
