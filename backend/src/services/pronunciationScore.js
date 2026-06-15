/**
 * 发音评分引擎 - Cloudflare Workers 兼容版
 *
 * 前端直接发送 PCM 16kHz 16bit mono，后端无需 ffmpeg 转换
 * 使用 Web 标准 API（fetch, crypto.subtle），兼容 Workers / Node.js
 *
 * 支持引擎：讯飞 / 阿里云 / Whisper(本地,开发用)
 * 优先级：PRONUNCIATION_ENGINE 环境变量指定 → 云端可用 → 降级
 */

// ============ 环境变量 ============
const getEnv = (key, fallback = '') => {
  if (typeof process !== 'undefined' && process.env) return process.env[key] || fallback
  return globalThis[key] || fallback
}

const XF_APPID = getEnv('XF_APPID')
const XF_API_KEY = getEnv('XF_API_KEY')
const XF_API_SECRET = getEnv('XF_API_SECRET')

const ALI_APPKEY = getEnv('ALI_NLS_APPKEY')
const ALI_ACCESS_KEY = getEnv('ALI_ACCESS_KEY_ID')
const ALI_ACCESS_SECRET = getEnv('ALI_ACCESS_KEY_SECRET')

const WHISPER_URL = getEnv('WHISPER_SERVICE_URL', 'http://192.168.0.102:5001/score')

// ============ 工具函数 ============

/** Uint8Array → base64 (兼容 Workers + Node.js) */
function uint8ToBase64(uint8) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(uint8).toString('base64')
  }
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length))
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}

/** 字符串 → base64 */
function strToBase64(str) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64')
  }
  return btoa(new TextEncoder().encode(str).reduce((s, b) => s + String.fromCharCode(b), ''))
}

/** base64 → 字符串 */
function base64ToStr(b64) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf-8')
  }
  return decodeURIComponent(escape(atob(b64)))
}

/** HMAC-SHA256 签名 → base64 */
async function hmacSha256Base64(key, message) {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  return uint8ToBase64(new Uint8Array(sig))
}

/** HMAC-SHA1 签名 → base64 */
async function hmacSha1Base64(key, message) {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  return uint8ToBase64(new Uint8Array(sig))
}

/** 构建简单 WAV 头 (PCM 16kHz 16bit mono) */
function buildWavHeader(pcmDataLength) {
  const buffer = new ArrayBuffer(44)
  const view = new DataView(buffer)
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + pcmDataLength, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)       // chunk size
  view.setUint16(20, 1, true)        // PCM format
  view.setUint16(22, 1, true)        // mono
  view.setUint32(24, 16000, true)    // sample rate
  view.setUint32(28, 32000, true)    // byte rate (16000 * 2 * 1)
  view.setUint16(32, 2, true)        // block align
  view.setUint16(34, 16, true)       // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, pcmDataLength, true)
  return new Uint8Array(buffer)
}

// ============ 讯飞英语口语评测 ============

async function buildXfAuth(date) {
  const signatureOrigin = `host: rest-api.xfyun.cn\ndate: ${date}\nGET /v2/word_evaluation HTTP/1.1`
  const signature = await hmacSha256Base64(XF_API_SECRET, signatureOrigin)
  const authString = `api_key="${XF_API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
  return strToBase64(authString)
}

function getXfFeedback(score) {
  if (score >= 90) return '发音非常标准！'
  if (score >= 75) return '发音不错，继续加油'
  if (score >= 60) return '发音一般，注意重音和元音'
  return '需要加强练习，注意模仿标准发音'
}

/**
 * 讯飞单词评测（REST API v2）— PCM 直传
 * @param {Uint8Array} pcmData - PCM 16kHz 16bit mono 数据
 * @param {string} word - 目标单词
 */
export async function scoreWithXunfei(pcmData, word) {
  const url = 'https://rest-api.xfyun.cn/v2/word_evaluation'
  const date = new Date().toUTCString()
  const authorization = await buildXfAuth(date)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'Date': date
      },
      body: JSON.stringify({
        header: { app_id: XF_APPID, status: 3 },
        parameter: {
          wrd_eval: {
            result: { enc: 'utf8', compress: 'raw', format: 'plain' }
          }
        },
        payload: {
          audio: {
            encoding: 'raw',
            sample_rate: 16000,
            channels: 1,
            bit_depth: 16,
            audio: uint8ToBase64(pcmData)
          },
          ref_text: {
            encoding: 'utf8',
            compress: 'raw',
            format: 'plain',
            text: strToBase64(word)
          }
        }
      })
    })

    const data = await response.json()
    if (data.code === '0' && data.payload?.wrd_eval?.result) {
      const resultText = base64ToStr(data.payload.wrd_eval.result.text)
      const result = JSON.parse(resultText)
      const score = Math.round((result.total_score || 0) * 10)

      return {
        success: true,
        score,
        feedback: getXfFeedback(score),
        recognized_word: result.rec_text || word,
        recognized_text: result.rec_text || word,
        engine: 'xunfei',
        details: result
      }
    }

    throw new Error(data.message || `讯飞返回错误码: ${data.code}`)
  } catch (error) {
    const errMsg = error.message || '未知错误'
    console.error('讯飞评分错误:', errMsg)
    return { success: false, error: '讯飞评分失败: ' + errMsg, engine: 'xunfei' }
  }
}

// ============ 阿里云语音评测 ============

async function getAliToken() {
  const params = {
    AccessKeyId: ALI_ACCESS_KEY,
    Action: 'CreateToken',
    Format: 'JSON',
    RegionId: 'cn-shanghai',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2019-02-28'
  }

  const sortedKeys = Object.keys(params).sort()
  const canonicalized = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')

  const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalized)}`
  const signature = await hmacSha1Base64(ALI_ACCESS_SECRET + '&', stringToSign)
  const url = `https://nls-meta.cn-shanghai.aliyuncs.com/?${canonicalized}&Signature=${encodeURIComponent(signature)}`

  const res = await fetch(url)
  const data = await res.json()

  if (data?.Token?.Id) return data.Token.Id
  throw new Error('获取阿里云 Token 失败: ' + JSON.stringify(data))
}

function getAliFeedback(score) {
  if (score >= 90) return '发音非常标准！'
  if (score >= 75) return '发音不错，继续加油'
  if (score >= 60) return '发音一般，注意语调'
  return '需要加强练习'
}

/**
 * 阿里云智能语音评测 — PCM 直传
 */
export async function scoreWithAliyun(pcmData, word) {
  try {
    const token = await getAliToken()
    const base64Audio = uint8ToBase64(pcmData)

    const response = await fetch(
      'https://nls-gateway.cn-shanghai.aliyuncs.com/rest/v1/assessment',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appkey: ALI_APPKEY,
          token,
          text: word,
          audio: base64Audio,
          format: 'pcm',
          sample_rate: 16000
        })
      }
    )

    const data = await response.json()
    if (data.status === 200 || data.ret === 0) {
      const score = Math.round(data.result?.pronunciation_score || 0)
      return {
        success: true,
        score,
        feedback: getAliFeedback(score),
        recognized_word: word,
        recognized_text: data.result?.rec_text || word,
        engine: 'aliyun'
      }
    }

    throw new Error(data.message || '阿里云评测失败')
  } catch (error) {
    const errMsg = error.message || '未知错误'
    console.error('阿里云评分错误:', errMsg)
    return { success: false, error: '阿里云评分失败: ' + errMsg, engine: 'aliyun' }
  }
}

// ============ Whisper 本地评测 (开发用) ============

/**
 * Whisper 本地评测 — 构建 WAV 后通过 FormData 发送
 * 注意：Whisper 为局域网开发服务，Workers 部署时不可用
 */
export async function scoreWithWhisper(pcmData, word) {
  try {
    // PCM → WAV (添加 44 字节 WAV 头)
    const wavHeader = buildWavHeader(pcmData.length)
    const wavData = new Uint8Array(wavHeader.length + pcmData.length)
    wavData.set(wavHeader, 0)
    wavData.set(pcmData, wavHeader.length)

    const formData = new FormData()
    formData.append('audio', new Blob([wavData], { type: 'audio/wav' }), 'audio.wav')
    formData.append('word', word)

    const response = await fetch(WHISPER_URL, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Whisper 服务返回 ${response.status}`)
    }

    const result = await response.json()

    if (result.success !== false) {
      return {
        success: true,
        score: result.score || 0,
        feedback: result.feedback || getXfFeedback(result.score || 0),
        recognized_word: result.recognized_word || result.recognized_text || word,
        recognized_text: result.recognized_text || result.recognized_word || word,
        engine: 'whisper'
      }
    }

    throw new Error(result.error || 'Whisper 评测失败')
  } catch (error) {
    console.error('Whisper 评分错误:', error.message)
    return { success: false, error: 'Whisper 评分失败: ' + error.message, engine: 'whisper' }
  }
}

// ============ 引擎管理 ============

const ENGINES = {
  xunfei: { name: '讯飞', check: () => !!(XF_APPID && XF_API_KEY && XF_API_SECRET), score: scoreWithXunfei },
  aliyun: { name: '阿里云', check: () => !!(ALI_APPKEY && ALI_ACCESS_KEY && ALI_ACCESS_SECRET), score: scoreWithAliyun },
  whisper: { name: 'Whisper(本地)', check: () => !!WHISPER_URL, score: scoreWithWhisper }
}

export function getPreferredEngine() {
  const preferred = getEnv('PRONUNCIATION_ENGINE', 'xunfei')
  if (ENGINES[preferred]?.check()) return preferred
  for (const name of ['xunfei', 'aliyun']) {
    if (ENGINES[name].check()) return name
  }
  return 'whisper'
}

export function getScoringStatus() {
  const engine = getPreferredEngine()
  const engines = {}
  for (const [name, eng] of Object.entries(ENGINES)) {
    engines[name] = { name: eng.name, available: eng.check(), configured: eng.check() }
  }
  return {
    activeEngine: engine,
    activeEngineName: ENGINES[engine].name,
    engines,
    whisperUrl: WHISPER_URL
  }
}

// ============ 主评分入口 ============

/**
 * 发音评分主入口
 * 前端发送 PCM 16kHz 16bit mono，直接传给引擎，无需转换
 *
 * @param {Buffer|Uint8Array} pcmBuffer - PCM 16kHz 16bit mono 数据
 * @param {string} word - 目标单词
 * @returns {{ success, score, feedback, recognized_word, recognized_text, engine }}
 */
export async function scorePronunciation(pcmBuffer, word) {
  const preferred = getPreferredEngine()

  const cloudEngines = ['xunfei', 'aliyun'].filter(e => e !== preferred && ENGINES[e].check())
  const tryOrder = [preferred, ...cloudEngines, 'whisper'].filter(
    (e, i, arr) => arr.indexOf(e) === i
  )

  // 确保 pcmBuffer 是 Uint8Array
  const pcmData = pcmBuffer instanceof Uint8Array ? pcmBuffer : new Uint8Array(pcmBuffer)

  let lastError = null

  for (const engineName of tryOrder) {
    const engine = ENGINES[engineName]
    if (!engine || !engine.check()) continue

    try {
      const result = await engine.score(pcmData, word)

      if (result.success) {
        if (engineName !== preferred) {
          result.fallback = true
          result.fallbackFrom = preferred
          console.log(`⚠️  评分引擎降级: ${ENGINES[preferred].name} → ${engine.name}`)
        }
        return result
      }

      lastError = result.error
      console.warn(`${engine.name} 评分失败: ${result.error}`)
    } catch (err) {
      lastError = err.message
      console.error(`${engine.name} 评分异常:`, err.message)
    }
  }

  return {
    success: false,
    error: lastError || '所有评分引擎均不可用，请检查配置',
    engine: 'none'
  }
}
