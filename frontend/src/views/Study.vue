<template>
  <AppLayout>
    <div class="study-content">
      <!-- 左侧统计 -->
      <aside class="sidebar">
        <div class="stats-card">
          <h3>今日任务</h3>
          <div class="stat-item">
            <span class="stat-value">{{ stats.new }}</span>
            <span class="stat-label">新词</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.review }}</span>
            <span class="stat-label">复习</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">总计</span>
          </div>
        </div>

        <div class="progress-card">
          <h3>今日进度</h3>
          <el-progress
            :percentage="progressPercent"
            :stroke-width="12"
            :color="progressColor"
          />
          <p class="progress-text">已完成 {{ studied }} / {{ total }} 个</p>
        </div>

        <div class="streak-card">
          <el-icon :size="32" color="#faad14"><Sunny /></el-icon>
          <div class="streak-info">
            <span class="streak-value">{{ streakDays }}</span>
            <span class="streak-label">天连续学习</span>
          </div>
        </div>
      </aside>

      <!-- 中间卡片区 -->
      <section class="card-area">
        <div v-if="loading" class="loading">
          <el-icon class="is-loading" :size="48"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <div v-else-if="!currentCard" class="empty">
          <el-icon :size="64" color="#c0c4cc"><CircleCheck /></el-icon>
          <h2>今日任务已完成！</h2>
          <p>太棒了，明天继续加油！</p>
          <el-button type="primary" @click="loadTodayCards">继续学习</el-button>
        </div>

        <div v-else class="flashcard" :class="{ flipped: isFlipped }" @click="flipCard">
          <!-- 正面：单词 -->
          <div class="card-front">
            <div class="speak-btn" @click.stop="speakWord">
              <el-icon :size="24"><Headset /></el-icon>
            </div>
            <div class="word">{{ currentCard.word }}</div>
            <div class="phonetic">{{ currentCard.phonetic }}</div>
            <div class="hint">点击卡片或按<span class="key-hint">空格</span>查看释义</div>
          </div>

          <!-- 背面：释义 -->
          <div class="card-back">
            <div class="word-header">
              <span class="word">{{ currentCard.word }}</span>
              <el-icon class="speak-icon" @click.stop="speakWord"><Headset /></el-icon>
              <el-icon class="speak-icon" @click.stop="speakEnglishMeaning"><ChatDotRound /></el-icon>
            </div>
            <!-- 英英释义（优先显示，从数据库读取） -->
            <div class="english-meaning-card" v-if="currentCard.english_meaning">
              <div class="label">
                英英释义
                <el-icon class="speak-icon-small" @click.stop="speakEnglishMeaning"><Headset /></el-icon>
              </div>
              <div class="text">{{ currentCard.english_meaning }}</div>
            </div>
            <!-- 中文释义 -->
            <div class="meaning-section">
              <div class="label">中文释义</div>
              <div class="meaning">{{ currentCard.meaning }}</div>
            </div>

            <!-- 考试标签 -->
            <div class="exam-tags" v-if="currentCard.difficulty || currentCard.tags">
              <el-tag v-if="currentCard.difficulty && currentCard.difficulty >= 7" size="small" type="danger">高频</el-tag>
              <el-tag v-if="currentCard.difficulty && currentCard.difficulty >= 4 && currentCard.difficulty < 7" size="small" type="warning">中频</el-tag>
              <el-tag v-if="currentCard.difficulty && currentCard.difficulty < 4" size="small" type="info">低频</el-tag>
              <el-tag v-if="currentCard.tags" size="small" type="success" v-for="tag in currentCard.tags.split(',')" :key="tag">{{ tag }}</el-tag>
            </div>

            <div class="example" v-if="currentCard.example">
              <p class="example-en">
                {{ currentCard.example }}
                <el-icon class="speak-icon" @click.stop="speakExample"><Headset /></el-icon>
              </p>
              <p class="example-cn">{{ currentCard.example_translation }}</p>
            </div>
            <div class="card-actions">
              <div class="ai-btn" @click.stop="showAIAnalysis">
                <el-icon><MagicStick /></el-icon> AI 解析
              </div>
            </div>
          </div>
        </div>

        <!-- 口语练习区（翻牌后显示） -->
        <div v-if="currentCard && isFlipped" class="speech-practice" @click.stop>
          <div class="speech-header">
            <el-icon :size="18"><Microphone /></el-icon>
            <span>口语练习</span>
            <span class="speech-subtitle">听标准发音 → 跟读 → AI 评分</span>
          </div>
          <div class="speech-row">
            <button class="speech-btn listen" @click.stop="speakWord" title="听标准发音">
              <el-icon :size="20"><Headset /></el-icon>
              <span>听发音</span>
            </button>
            <button
              class="speech-btn record"
              :class="{ recording: isRecording }"
              @mousedown="startRecording"
              @mouseup="stopRecording"
              @mouseleave="stopRecording"
              @touchstart.prevent="startRecording"
              @touchend.prevent="stopRecording"
              title="按住说话录音"
            >
              <el-icon :size="20"><Microphone /></el-icon>
              <span>{{ isRecording ? '录音中...' : '跟读' }}</span>
            </button>
          </div>

          <!-- 评分结果 -->
          <div v-if="pronunciationScore !== null" class="speech-result">
            <div class="score-ring" :class="getScoreClass(pronunciationScore)">
              <svg viewBox="0 0 100 100" class="ring-svg">
                <circle cx="50" cy="50" r="42" class="ring-bg" />
                <circle cx="50" cy="50" r="42" class="ring-fill"
                  :style="{ strokeDashoffset: 264 - (pronunciationScore / 100) * 264 }" />
              </svg>
              <div class="ring-text">
                <span class="score-num">{{ pronunciationScore }}</span>
                <span class="score-unit">分</span>
              </div>
            </div>
            <div class="speech-feedback">
              <p class="feedback-txt">{{ pronunciationFeedback }}</p>
              <p class="heard-txt" v-if="heardWord">
                <span class="label">识别到：</span>
                <span class="heard">{{ heardWord }}</span>
              </p>
              <button v-if="pronunciationScore < 80" class="retry-btn" @click.stop="retryRecording">
                <el-icon><Refresh /></el-icon> 再练一次
              </button>
            </div>
          </div>
        </div>

        <!-- 评分按钮 -->
        <div v-if="currentCard && isFlipped" class="rating-buttons">
          <button class="rating-btn again" @click="rate(1)">
            <span class="label">不认识</span>
            <span class="interval">{{ preview.again?.days || 0 }}分钟</span>
            <span class="key-hint">1</span>
          </button>
          <button class="rating-btn hard" @click="rate(2)">
            <span class="label">困难</span>
            <span class="interval">{{ preview.hard?.days || 0 }}分钟</span>
            <span class="key-hint">2</span>
          </button>
          <button class="rating-btn good" @click="rate(3)">
            <span class="label">良好</span>
            <span class="interval">{{ preview.good?.days || 0 }}天</span>
            <span class="key-hint">3</span>
          </button>
          <button class="rating-btn easy" @click="rate(4)">
            <span class="label">简单</span>
            <span class="interval">{{ preview.easy?.days || 0 }}天</span>
            <span class="key-hint">4</span>
          </button>
        </div>
      </section>
    </div>

    <!-- AI 解析弹窗 -->
    <el-dialog v-model="showAIDialog" width="600px">
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 18px; font-weight: bold;">AI 智能解析</span>
          <el-button type="primary" size="small" @click="speakAIContent">
            <el-icon><Volume /></el-icon> 朗读
          </el-button>
        </div>
      </template>
      <div v-if="aiLoading" class="ai-loading">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <p>AI 正在分析...</p>
      </div>
      <div v-else-if="aiData" class="ai-content">
        <div class="ai-section" v-if="aiData.englishMeaning">
          <h4>英英释义 <span class="simple-hint">(简单词汇)</span></h4>
          <p class="english-meaning">{{ aiData.englishMeaning }}</p>
        </div>
        <div class="ai-section" v-if="aiData.meaning">
          <h4>中文释义</h4>
          <p>{{ aiData.meaning }}</p>
        </div>
        <div class="ai-section" v-if="aiData.root">
          <h4>词根词缀</h4>
          <p>{{ aiData.root }}</p>
        </div>
        <!-- AI 真题练习 -->
        <div class="ai-section" v-if="aiExamQuestion && !aiLoading">
          <h4>📝 真题练习</h4>
          <div class="exam-question">
            <p class="question-text">{{ aiExamQuestion.question }}</p>
            <div class="question-options" v-if="aiExamQuestion.options">
              <div
                v-for="(opt, i) in aiExamQuestion.options"
                :key="i"
                class="option-item"
                :class="{
                  selected: selectedOption === i,
                  correct: answered && i === aiExamQuestion.answer,
                  wrong: answered && selectedOption === i && i !== aiExamQuestion.answer
                }"
                @click="selectOption(i)"
              >
                <span class="option-letter">{{ 'ABCD'[i] }}</span>
                <span class="option-text">{{ opt }}</span>
              </div>
            </div>
            <div v-if="answered" class="question-explanation">
              <p><strong>解析：</strong>{{ aiExamQuestion.explanation }}</p>
            </div>
            <el-button v-if="!answered && aiExamQuestion.options" type="primary" size="small" @click="checkAnswer">确认答案</el-button>
            <el-button v-if="answered" size="small" @click="loadExamQuestion">换一题</el-button>
          </div>
        </div>
        <div class="ai-section" v-if="aiData.memoryTip">
          <h4>记忆技巧</h4>
          <p class="memory-tip">{{ aiData.memoryTip }}</p>
        </div>
        <div class="ai-section" v-if="aiData.collocations?.length">
          <h4>常用搭配</h4>
          <el-tag v-for="c in aiData.collocations" :key="c" style="margin: 4px">{{ c }}</el-tag>
        </div>
        <div class="ai-section" v-if="aiData.synonyms?.length">
          <h4>同义词</h4>
          <el-tag type="success" v-for="s in aiData.synonyms" :key="s" style="margin: 4px">{{ s }}</el-tag>
        </div>
        <div class="ai-section" v-if="aiData.examTips">
          <h4>考试要点</h4>
          <p>{{ aiData.examTips }}</p>
        </div>
      </div>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import axios from 'axios'

const route = useRoute()

const loading = ref(true)
const cards = ref([])
const currentIndex = ref(0)
const isFlipped = ref(false)
const preview = ref({})

// 发音评分相关
const isRecording = ref(false)
const pronunciationScore = ref(null)
const pronunciationFeedback = ref('')
const heardWord = ref('')
const streakDays = ref(0)
const studied = ref(0)

const stats = ref({ new: 0, review: 0, total: 0 })
const showAIDialog = ref(false)
const aiLoading = ref(false)
const aiData = ref(null)
const aiExamQuestion = ref(null)
const selectedOption = ref(-1)
const answered = ref(false)

const currentCard = computed(() => cards.value[currentIndex.value])
const total = computed(() => cards.value.length)
const progressPercent = computed(() => total.value ? Math.round(studied.value / total.value * 100) : 0)
const progressColor = computed(() => {
  if (progressPercent.value < 30) return '#ff4d4f'
  if (progressPercent.value < 70) return '#faad14'
  return '#52c41a'
})

// 加载今日学习任务
const loadTodayCards = async () => {
  loading.value = true
  try {
    const vocabId = route.query.vocabId
    const targetWord = route.query.word
    let url = '/api/study/today'
    if (vocabId) {
      url += `?vocabId=${vocabId}`
    }
    const res = await axios.get(url, {
      headers: { 'x-user-id': '1' }
    })
    if (res.data.success) {
      cards.value = res.data.data.cards
      stats.value = res.data.data.stats
      isFlipped.value = false
      studied.value = 0

      // 如果指定了单词，跳转到该单词
      if (targetWord) {
        const index = cards.value.findIndex(c => c.word.toLowerCase() === targetWord.toLowerCase())
        if (index >= 0) {
          currentIndex.value = index
        } else {
          currentIndex.value = 0
        }
      } else {
        currentIndex.value = 0
      }
    }
  } catch (error) {
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 翻转卡片
const flipCard = () => {
  if (!isFlipped.value) {
    isFlipped.value = true
    loadPreview()
  }
}


// 加载预览
const loadPreview = async () => {
  if (!currentCard.value) return
  try {
    const res = await axios.post('/api/study/preview', {
      wordId: currentCard.value.word_id
    }, {
      headers: { 'x-user-id': '1' }
    })
    if (res.data.success) {
      preview.value = res.data.data
    }
  } catch (error) {
    console.error('加载预览失败:', error)
  }
}

// 提交评分
const rate = async (rating) => {
  if (!currentCard.value) return

  try {
    await axios.post('/api/study/review', {
      wordId: currentCard.value.word_id,
      rating
    }, {
      headers: { 'x-user-id': '1' }
    })

    studied.value++
    currentIndex.value++
    isFlipped.value = false

    // 重置发音评分
    pronunciationScore.value = null
    heardWord.value = ''
    pronunciationFeedback.value = ''

    if (currentIndex.value >= cards.value.length) {
      ElMessage.success('今日任务完成！')
    }
  } catch (error) {
    ElMessage.error('提交失败: ' + error.message)
  }
}

// AI 解析
const showAIAnalysis = async () => {
  if (!currentCard.value) return

  showAIDialog.value = true
  aiLoading.value = true
  aiData.value = null

  try {
    const res = await axios.get(`/api/ai/analyze/${currentCard.value.word}`)
    if (res.data.success) {
      aiData.value = res.data.data
    }
    // 同时加载真题
    loadExamQuestion()
  } catch (error) {
    ElMessage.error('AI 解析失败')
  } finally {
    aiLoading.value = false
  }
}

// 加载 AI 真题
const loadExamQuestion = async () => {
  if (!currentCard.value) return
  aiExamQuestion.value = null
  selectedOption.value = -1
  answered.value = false

  try {
    const res = await axios.get(`/api/ai/exam-question/${currentCard.value.word}`, {
      params: { level: currentCard.value.tags || 'cet6' }
    })
    if (res.data.success) {
      aiExamQuestion.value = res.data.data
    }
  } catch (e) {
    // 静默失败，不阻塞主功能
    console.warn('加载真题失败:', e)
  }
}

const selectOption = (index) => {
  selectedOption.value = index
}

const checkAnswer = () => {
  if (selectedOption.value === -1) return ElMessage.warning('请先选择一个选项')
  answered.value = true
  if (selectedOption.value === aiExamQuestion.value.answer) {
    ElNotification({ title: '✅ 回答正确', message: '', type: 'success', duration: 2000 })
  } else {
    ElNotification({ title: '❌ 答错了', message: aiExamQuestion.value.explanation, type: 'error', duration: 4000 })
  }
}

// 发音缓存
const pronunciationCache = {}

// 从发音库获取 MP3 URL
const getPronunciationUrl = async (word) => {
  const key = word.toLowerCase().trim()

  // 检查缓存
  if (pronunciationCache[key] !== undefined) {
    return pronunciationCache[key]
  }

  try {
    const res = await axios.get(`/api/pronunciation/${encodeURIComponent(key)}`)
    if (res.data.success && res.data.url) {
      pronunciationCache[key] = res.data.url
      return res.data.url
    }
  } catch (e) {
    console.error('获取发音失败:', e)
  }

  // 标记为无发音
  pronunciationCache[key] = null
  return null
}

// 播放 MP3 音频
const playAudio = (url) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    audio.onended = () => resolve()
    audio.onerror = (e) => reject(e)
    audio.play().catch(reject)
  })
}

// 语音朗读功能（回退方案）
const speak = (text, lang = 'en-US') => {
  if (!text) return

  try {
    // 停止当前朗读
    window.speechSynthesis?.cancel()

    // 确保语音引擎已加载
    const synth = window.speechSynthesis
    if (!synth) {
      console.error('浏览器不支持语音合成')
      return
    }

    // 创建语音
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.85
    utterance.pitch = 1

    // 选择最佳语音
    const voices = synth.getVoices()

    if (lang.startsWith('en')) {
      // 英语：优先选择高质量语音
      const englishVoices = [
        // Mac 系统高质量语音
        voices.find(v => v.name === 'Samantha' && v.lang === 'en-US'),
        voices.find(v => v.name === 'Alex' && v.lang === 'en-US'),
        voices.find(v => v.name === 'Victoria'),
        // Google 高质量语音
        voices.find(v => v.name.includes('Google US English')),
        voices.find(v => v.name.includes('Google UK English Female')),
        // 通用美式英语
        voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female')),
        voices.find(v => v.lang === 'en-US'),
        voices.find(v => v.lang.startsWith('en'))
      ].filter(Boolean)[0]

      if (englishVoices) {
        utterance.voice = englishVoices
        console.log('使用语音:', englishVoices.name)
      }
    } else if (lang.startsWith('zh')) {
      // 中文语音
      const chineseVoice = voices.find(v => v.lang === 'zh-CN') || voices.find(v => v.lang.startsWith('zh'))
      if (chineseVoice) {
        utterance.voice = chineseVoice
      }
    }

    // 错误处理
    utterance.onerror = (e) => {
      console.error('语音合成错误:', e)
    }

    synth.speak(utterance)
  } catch (e) {
    console.error('发音失败:', e)
  }
}

// 预加载语音列表
const loadVoices = () => {
  window.speechSynthesis?.getVoices()
}

// 监听语音列表变化（某些浏览器需要）
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = loadVoices
  // 延迟加载确保语音列表可用
  setTimeout(loadVoices, 100)
}

// 朗读单词（优先使用发音库 MP3）
const speakWord = async () => {
  if (!currentCard.value) return

  const word = currentCard.value.word

  // 先尝试发音库 MP3
  const mp3Url = await getPronunciationUrl(word)
  if (mp3Url) {
    try {
      console.log('使用发音库 MP3:', word)
      await playAudio(mp3Url)
      return
    } catch (e) {
      console.warn('MP3 播放失败，回退到语音合成:', e)
    }
  }

  // 回退到 Web Speech API
  console.log('使用 Web Speech API:', word)
  speak(word, 'en-US')
}

// 朗读释义（中文）
const speakMeaning = () => {
  if (!currentCard.value) return
  speak(currentCard.value.meaning, 'zh-CN')
}

// 朗读英英释义
const speakEnglishMeaning = () => {
  if (!currentCard.value?.english_meaning) return
  speak(currentCard.value.english_meaning, 'en-US')
}

// 朗读例句
const speakExample = () => {
  if (!currentCard.value?.example) return
  speak(currentCard.value.example, 'en-US')
}

// ===== 发音评分功能（通过后端代理调用 4060Ti Whisper）=====

let mediaRecorder = null
let audioChunks = []

// 开始录音
const startRecording = async () => {
  if (!currentCard.value) return

  pronunciationScore.value = null
  heardWord.value = ''
  pronunciationFeedback.value = ''
  audioChunks = []

  try {
    // 获取麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // 创建录音器
    mediaRecorder = new MediaRecorder(stream)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      // 停止所有音轨
      stream.getTracks().forEach(track => track.stop())

      // 合并音频数据
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

      // 发送到后端代理
      await sendToScoreService(audioBlob)
    }

    mediaRecorder.start()
    isRecording.value = true
    console.log('开始录音...')
  } catch (e) {
    console.error('启动录音失败:', e)
    if (e.name === 'NotAllowedError') {
      ElMessage.error('请允许麦克风权限')
    } else {
      ElMessage.error('启动录音失败: ' + e.message)
    }
  }
}

// 停止录音
const stopRecording = () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
    console.log('录音结束，正在评分...')
  }
}

// 发送到后端代理（再转发到 4060Ti）
const sendToScoreService = async (audioBlob) => {
  if (!currentCard.value) return

  try {
    const response = await fetch(`/api/pronunciation/score?word=${encodeURIComponent(currentCard.value.word)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/webm'
      },
      body: audioBlob
    })

    if (!response.ok) {
      throw new Error('评分服务请求失败')
    }

    const result = await response.json()

    if (result.success) {
      pronunciationScore.value = result.score
      pronunciationFeedback.value = result.feedback
      heardWord.value = result.recognized_word || result.recognized_text
      console.log(`评分完成: ${result.score}分, 识别: ${result.recognized_text}`)
    } else {
      pronunciationScore.value = 0
      pronunciationFeedback.value = result.error || '评分失败，请重试'
    }
  } catch (e) {
    console.error('评分服务错误:', e)
    ElMessage.error('评分服务连接失败')
    pronunciationScore.value = 0
    pronunciationFeedback.value = '评分服务暂不可用'
  }
}

// 获取分数对应的样式类
const getScoreClass = (score) => {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'fair'
  return 'needs-work'
}

// 重试录音发音
const retryRecording = async () => {
  pronunciationScore.value = null
  heardWord.value = ''
  pronunciationFeedback.value = ''
  // 延迟一下让状态重置
  await new Promise(r => setTimeout(r, 100))
  startRecording()
}

// 朗读 AI 解析内容
const speakAIContent = () => {
  if (!aiData.value) return

  // 停止当前朗读
  window.speechSynthesis?.cancel()

  // 英文单词
  if (aiData.value.word) {
    speak(aiData.value.word, 'en-US')
  }

  // 英英释义（延迟一点，等单词读完）
  if (aiData.value.englishMeaning) {
    setTimeout(() => {
      speak(aiData.value.englishMeaning, 'en-US')
    }, 800)
  }
}

onMounted(() => {
  loadTodayCards()
  // 键盘快捷键: 空格翻牌, 1-4 评分
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 键盘快捷键处理
const handleKeydown = (e) => {
  // 不在输入框中触发
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

  switch (e.key) {
    case ' ':
      e.preventDefault()
      if (!isFlipped.value && currentCard.value) {
        flipCard()
      }
      break
    case '1':
      if (isFlipped.value && currentCard.value) rate(1)
      break
    case '2':
      if (isFlipped.value && currentCard.value) rate(2)
      break
    case '3':
      if (isFlipped.value && currentCard.value) rate(3)
      break
    case '4':
      if (isFlipped.value && currentCard.value) rate(4)
      break
  }
}
</script>

<style scoped>
.study-content {
  display: flex;
  padding: 40px;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 考试标签 */
.exam-tags {
  margin-top: 12px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 口语练习区 */
.speech-practice {
  width: 500px;
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-top: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.speech-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  color: #333;
  font-weight: 600;
  font-size: 16px;
}

.speech-subtitle {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

.speech-row {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.speech-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s;
}

.speech-btn.listen {
  background: #e6f7ff;
  color: #1890ff;
}

.speech-btn.listen:hover {
  background: #bae7ff;
  transform: translateY(-1px);
}

.speech-btn.record {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.speech-btn.record:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.speech-btn.record.recording {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 评分结果 */
.speech-result {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 24px;
  padding: 20px;
  background: #f9f9ff;
  border-radius: 12px;
}

.score-ring {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.ring-svg {
  width: 80px;
  height: 80px;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: #e8e8e8;
  stroke-width: 8;
}

.ring-fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 264;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0.8s ease;
}

.score-ring.excellent .ring-fill { stroke: #52c41a; }
.score-ring.good .ring-fill { stroke: #1890ff; }
.score-ring.fair .ring-fill { stroke: #faad14; }
.score-ring.needs-work .ring-fill { stroke: #ff4d4f; }

.ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-num {
  display: block;
  font-size: 22px;
  font-weight: bold;
  color: #333;
  line-height: 1;
}

.score-unit {
  font-size: 11px;
  color: #999;
}

.speech-feedback {
  flex: 1;
  text-align: left;
}

.feedback-txt {
  font-size: 15px;
  color: #333;
  font-weight: 500;
  margin: 0;
}

.heard-txt {
  font-size: 13px;
  color: #666;
  margin: 4px 0 0;
}

.heard-txt .label { color: #999; }
.heard-txt .heard { color: #1890ff; font-weight: 500; }

.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  padding: 6px 16px;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

/* 卡片背面滚动 */
.card-back {
  overflow-y: auto;
  justify-content: flex-start !important;
  padding-top: 24px !important;
}

.sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-card,
.progress-card,
.streak-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stats-card h3,
.progress-card h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1890ff;
}

.stat-label {
  color: #999;
}

.progress-text {
  text-align: center;
  color: #666;
  margin-top: 12px;
}

.streak-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.streak-info {
  display: flex;
  flex-direction: column;
}

.streak-value {
  font-size: 28px;
  font-weight: bold;
  color: #faad14;
}

.streak-label {
  font-size: 12px;
  color: #999;
}

.card-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading,
.empty {
  text-align: center;
  color: white;
}

.empty h2 {
  margin: 20px 0 10px;
}

.empty p {
  margin-bottom: 20px;
  opacity: 0.8;
}

.flashcard {
  width: 500px;
  height: 320px;
  perspective: 1000px;
  cursor: pointer;
}

.flashcard > div {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.6s;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.card-front {
  background: white;
}

.card-back {
  background: white;
  transform: rotateY(180deg);
  padding: 30px;
}

.flashcard.flipped .card-front {
  transform: rotateY(-180deg);
}

.flashcard.flipped .card-back {
  transform: rotateY(0);
}

.word {
  font-size: 48px;
  font-weight: bold;
  color: #333;
}

.phonetic {
  font-size: 18px;
  color: #999;
  margin-top: 8px;
}

.hint {
  position: absolute;
  bottom: 30px;
  color: #bbb;
  font-size: 14px;
}

.key-hint {
  display: inline-block;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  margin-left: 4px;
  vertical-align: middle;
  line-height: 18px;
}

.rating-btn .key-hint {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  opacity: 0.7;
}

.rating-btn {
  position: relative;
}

.card-back .word-header {
  margin-bottom: 20px;
}

.card-back .word {
  font-size: 32px;
}

.card-back .pos {
  display: inline-block;
  background: #e6f7ff;
  color: #1890ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
}

.meaning {
  font-size: 16px;
  color: #333;
  text-align: center;
  line-height: 1.6;
}

.english-meaning-card {
  background: #e6f7ff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-left: 3px solid #1890ff;
}

.english-meaning-card .label {
  font-size: 12px;
  color: #1890ff;
  margin-bottom: 4px;
}

.english-meaning-card .text {
  font-size: 15px;
  color: #333;
  line-height: 1.5;
  font-style: italic;
}

.meaning-section {
  text-align: center;
}

.meaning-section .label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.example {
  margin-top: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: left;
}

.example-en {
  color: #666;
  font-style: italic;
}

.example-cn {
  color: #999;
  font-size: 14px;
  margin-top: 8px;
}

.ai-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  color: #1890ff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.rating-buttons {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.rating-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.rating-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.rating-btn .label {
  font-size: 14px;
  font-weight: 500;
}

.rating-btn .interval {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}

.rating-btn.again {
  background: #ff4d4f;
  color: white;
}

.rating-btn.hard {
  background: #faad14;
  color: white;
}

.rating-btn.good {
  background: #52c41a;
  color: white;
}

.rating-btn.easy {
  background: #1890ff;
  color: white;
}

.ai-loading {
  text-align: center;
  padding: 40px;
}

.ai-content {
  max-height: 400px;
  overflow-y: auto;
}

.ai-section {
  margin-bottom: 20px;
}

.ai-section h4 {
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.ai-section p {
  color: #666;
  line-height: 1.6;
}

.english-meaning {
  background: #e6f7ff;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid #1890ff;
  color: #333;
  font-style: italic;
}

.simple-hint {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

.memory-tip {
  background: #fff7e6;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid #faad14;
}

/* 真题练习样式 */
.exam-question {
  background: #f5f7fa;
  border-radius: 12px;
  padding: 20px;
}

.question-text {
  font-size: 15px;
  color: #333;
  line-height: 1.7;
  margin: 0 0 16px;
}

.question-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: white;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item:hover {
  border-color: #1890ff;
  background: #f0f8ff;
}

.option-item.selected {
  border-color: #1890ff;
  background: #e6f7ff;
}

.option-item.correct {
  border-color: #52c41a;
  background: #f6ffed;
}

.option-item.wrong {
  border-color: #ff4d4f;
  background: #fff2f0;
}

.option-letter {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  color: #666;
  flex-shrink: 0;
}

.option-item.selected .option-letter {
  background: #1890ff;
  color: white;
}

.option-item.correct .option-letter {
  background: #52c41a;
  color: white;
}

.option-item.wrong .option-letter {
  background: #ff4d4f;
  color: white;
}

.option-text {
  font-size: 14px;
  color: #333;
}

.question-explanation {
  margin-top: 16px;
  padding: 12px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* 朗读按钮样式 */
.speak-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: rgba(24, 144, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.speak-btn:hover {
  background: rgba(24, 144, 255, 0.2);
  transform: scale(1.1);
}

.speak-icon {
  margin-left: 10px;
  cursor: pointer;
  color: #1890ff;
  transition: all 0.3s;
}

.speak-icon:hover {
  color: #40a9ff;
  transform: scale(1.2);
}

.speak-icon-small {
  margin-left: 8px;
  cursor: pointer;
  color: #1890ff;
  font-size: 14px;
  transition: all 0.3s;
}

.speak-icon-small:hover {
  color: #40a9ff;
  transform: scale(1.2);
}

.card-actions {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 16px;
}

/* 发音评分样式 */
.pronunciation-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pronounce-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.pronounce-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.pronounce-btn.recording {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.score-result {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.score-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

.score-circle.excellent {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
}

.score-circle.good {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
}

.score-circle.fair {
  background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
}

.score-circle.needs-work {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
}

.score-number {
  font-size: 28px;
  line-height: 1;
}

.score-label {
  font-size: 12px;
  opacity: 0.9;
}

.score-feedback {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feedback-text {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.heard-text {
  font-size: 13px;
  color: #666;
}

.heard-text .label {
  color: #999;
}

.heard-text .heard {
  color: #1890ff;
  font-weight: 500;
}
</style>
