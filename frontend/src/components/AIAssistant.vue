<template>
  <div class="ai-assistant">
    <!-- 浮动按钮 -->
    <div class="ai-fab" :class="{ active: isOpen }" @click="togglePanel">
      <span class="fab-icon">{{ isOpen ? '✕' : '🤖' }}</span>
    </div>

    <!-- 面板 -->
    <transition name="slide">
      <div v-if="isOpen" class="ai-panel">
        <div class="panel-header">
          <span class="header-icon">🤖</span>
          <span class="header-title">AI 学习助手</span>
          <span class="header-badge">Beta</span>
        </div>

        <div class="panel-tabs">
          <button
            v-for="tab in panelTabs"
            :key="tab.key"
            :class="['panel-tab', { active: activePanel === tab.key }]"
            @click="activePanel = tab.key"
          >
            {{ tab.icon }} {{ tab.label }}
          </button>
        </div>

        <div class="panel-body">
          <!-- 复习建议 -->
          <div v-if="activePanel === 'advice'" class="panel-content">
            <div v-if="loadingAdvice" class="loading-box">
              <el-icon class="is-loading" :size="20"><Loading /></el-icon>
              <span>AI 正在分析你的学习数据...</span>
            </div>
            <div v-else-if="advice" class="advice-content">
              <div class="priority-bar" :class="'priority-' + advice.priority">
                <span class="priority-dot"></span>
                {{ advice.priority === 'high' ? '高优先级' : advice.priority === 'medium' ? '中等优先级' : '低优先级' }}
              </div>
              <div class="strategy-box">
                <div class="strategy-icon">💡</div>
                <div class="strategy-text">{{ advice.strategy }}</div>
              </div>
              <div class="advice-section" v-if="advice.order?.length">
                <h4>📋 复习顺序</h4>
                <div v-for="(item, i) in advice.order" :key="i" class="advice-item">
                  <span class="item-num">{{ i + 1 }}</span>
                  <span>{{ item }}</span>
                </div>
              </div>
              <div class="advice-section" v-if="advice.timeAdvice">
                <h4>⏰ 时间建议</h4>
                <p class="advice-text">{{ advice.timeAdvice }}</p>
              </div>
              <div class="advice-section" v-if="advice.focusWords?.length">
                <h4>🎯 重点关注</h4>
                <div class="focus-tags">
                  <el-tag v-for="fw in advice.focusWords" :key="fw" size="small" type="warning">{{ fw }}</el-tag>
                </div>
              </div>
              <div class="motivation" v-if="advice.motivation">
                <span>🌟</span> {{ advice.motivation }}
              </div>
            </div>
            <div v-else class="empty-box">
              <p>点击下方按钮获取 AI 复习建议</p>
              <button class="ai-btn" @click="fetchAdvice">获取建议</button>
            </div>
          </div>

          <!-- 学习计划 -->
          <div v-if="activePanel === 'plan'" class="panel-content">
            <div v-if="loadingPlan" class="loading-box">
              <el-icon class="is-loading" :size="20"><Loading /></el-icon>
              <span>AI 正在制定学习计划...</span>
            </div>
            <div v-else-if="plan" class="plan-content">
              <div class="plan-summary">
                <div class="summary-item">
                  <span class="summary-value">{{ plan.plan?.dailyNewWords || 0 }}</span>
                  <span class="summary-label">每日新学</span>
                </div>
                <div class="summary-item">
                  <span class="summary-value">{{ plan.plan?.dailyReview || 0 }}</span>
                  <span class="summary-label">每日复习</span>
                </div>
                <div class="summary-item">
                  <span class="summary-value">{{ plan.plan?.totalDays || 0 }}</span>
                  <span class="summary-label">预计天数</span>
                </div>
              </div>

              <div class="milestone-list" v-if="plan.plan?.milestones?.length">
                <h4>🏁 里程碑</h4>
                <div v-for="(m, i) in plan.plan.milestones" :key="i" class="milestone-item">
                  <div class="milestone-day">Day {{ m.day }}</div>
                  <div class="milestone-info">
                    <span class="milestone-target">{{ m.target }}</span>
                    <span class="milestone-words">{{ m.words }}词</span>
                  </div>
                </div>
              </div>

              <div class="advice-section" v-if="plan.suggestions?.length">
                <h4>📝 学习建议</h4>
                <div v-for="(s, i) in plan.suggestions" :key="i" class="suggestion-item">
                  <el-icon color="#1890ff"><CircleCheck /></el-icon>
                  <span>{{ s }}</span>
                </div>
              </div>

              <div class="review-strategy" v-if="plan.reviewStrategy">
                <h4>🔄 复习策略</h4>
                <p>{{ plan.reviewStrategy }}</p>
              </div>

              <div class="motivation" v-if="plan.encouragement">
                <span>💪</span> {{ plan.encouragement }}
              </div>
            </div>
            <div v-else class="empty-box">
              <p>让 AI 根据你的数据制定个性化学习计划</p>
              <button class="ai-btn" @click="fetchPlan">生成计划</button>
            </div>
          </div>

          <!-- 单词问答 -->
          <div v-if="activePanel === 'chat'" class="panel-content">
            <div class="chat-history" ref="chatHistory">
              <div v-for="(msg, i) in chatMessages" :key="i" :class="['chat-msg', msg.role]">
                <div class="msg-avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
                <div class="msg-content" v-html="msg.html || msg.content"></div>
              </div>
              <div v-if="loadingChat" class="chat-msg assistant">
                <div class="msg-avatar">🤖</div>
                <div class="msg-content typing">
                  <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                </div>
              </div>
            </div>
            <div class="chat-input">
              <input
                v-model="chatInput"
                placeholder="问 AI 关于当前单词的问题..."
                @keyup.enter="sendChat"
                :disabled="loadingChat"
              />
              <button class="send-btn" @click="sendChat" :disabled="loadingChat || !chatInput.trim()">
                <el-icon><Promotion /></el-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import axios from 'axios'
import { Loading, CircleCheck, Promotion } from '@element-plus/icons-vue'

const props = defineProps({
  currentWord: {
    type: Object,
    default: () => null
  }
})

const panelTabs = [
  { key: 'advice', icon: '💡', label: '复习建议' },
  { key: 'plan', icon: '📅', label: '学习计划' },
  { key: 'chat', icon: '💬', label: '单词问答' }
]

const isOpen = ref(false)
const activePanel = ref('advice')

// 复习建议
const advice = ref(null)
const loadingAdvice = ref(false)

// 学习计划
const plan = ref(null)
const loadingPlan = ref(false)

// 单词问答
const chatMessages = ref([])
const chatInput = ref('')
const loadingChat = ref(false)
const chatHistory = ref(null)

function togglePanel() {
  isOpen.value = !isOpen.value
  if (isOpen.value && !advice.value && !plan.value) {
    // 首次打开自动加载建议
    fetchAdvice()
  }
}

async function fetchAdvice() {
  loadingAdvice.value = true
  try {
    const { data } = await axios.get('/api/ai/review-advice')
    if (data.success) {
      advice.value = data.data
    }
  } catch (e) {
    console.error('获取复习建议失败:', e)
  } finally {
    loadingAdvice.value = false
  }
}

async function fetchPlan() {
  loadingPlan.value = true
  try {
    const { data } = await axios.post('/api/ai/study-plan')
    if (data.success) {
      plan.value = data.data
    }
  } catch (e) {
    console.error('获取学习计划失败:', e)
  } finally {
    loadingPlan.value = false
  }
}

async function sendChat() {
  const question = chatInput.value.trim()
  if (!question || loadingChat.value) return

  chatMessages.value.push({
    role: 'user',
    content: question
  })

  chatInput.value = ''
  loadingChat.value = true

  // 构建上下文
  const wordContext = props.currentWord
    ? `当前学习的单词：${props.currentWord.word}（${props.currentWord.meaning || ''}）`
    : ''

  try {
    const { data } = await axios.post('/api/ai/chat', {
      question,
      context: wordContext
    })

    if (data.success) {
      chatMessages.value.push({
        role: 'assistant',
        content: data.data?.answer || data.data?.content || data.data || '抱歉，我无法回答这个问题。',
        html: data.data?.html
      })
    } else {
      chatMessages.value.push({
        role: 'assistant',
        content: '抱歉，AI 服务暂时不可用。请稍后再试。'
      })
    }
  } catch (e) {
    chatMessages.value.push({
      role: 'assistant',
      content: '网络错误，请稍后再试。'
    })
  } finally {
    loadingChat.value = false
    await nextTick()
    if (chatHistory.value) {
      chatHistory.value.scrollTop = chatHistory.value.scrollHeight
    }
  }
}

// 切换到问答时，如果有当前单词，自动添加提示
watch(() => activePanel.value, (val) => {
  if (val === 'chat' && props.currentWord && chatMessages.value.length === 0) {
    chatMessages.value.push({
      role: 'assistant',
      content: `你好！我是你的 AI 学习助手。当前单词是 **${props.currentWord.word}**（${props.currentWord.meaning || ''}），你可以问我关于这个单词的任何问题，比如用法、搭配、辨析等。`
    })
  }
})
</script>

<style scoped>
.ai-assistant {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.ai-fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  transition: all 0.3s;
  z-index: 1001;
  position: relative;
}
.ai-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.5);
}
.ai-fab.active {
  background: #f5f5f5;
  color: #666;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.fab-icon { font-size: 24px; }

/* 面板 */
.ai-panel {
  position: absolute;
  bottom: 72px;
  right: 0;
  width: 380px;
  max-height: 520px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.slide-enter-active, .slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}
.header-icon { font-size: 20px; }
.header-title { font-size: 16px; font-weight: 600; }
.header-badge {
  font-size: 10px;
  background: rgba(255,255,255,0.25);
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  padding: 0 8px;
}
.panel-tab {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: none;
  font-size: 12px;
  color: #999;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  text-align: center;
}
.panel-tab:hover { color: #667eea; }
.panel-tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
  font-weight: 600;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.panel-content {
  padding: 16px;
}

/* 加载 */
.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: #999;
  font-size: 13px;
}

.empty-box {
  text-align: center;
  padding: 24px;
  color: #999;
}
.empty-box p { margin-bottom: 16px; font-size: 13px; }
.ai-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.2s;
}
.ai-btn:hover { transform: scale(1.05); }

/* 复习建议 */
.priority-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}
.priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.priority-high { background: #fff2f0; color: #ff4d4f; }
.priority-high .priority-dot { background: #ff4d4f; }
.priority-medium { background: #fff8e6; color: #faad14; }
.priority-medium .priority-dot { background: #faad14; }
.priority-low { background: #f0f7ff; color: #1890ff; }
.priority-low .priority-dot { background: #1890ff; }

.strategy-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #f6f8ff;
  border-radius: 12px;
  margin-bottom: 16px;
}
.strategy-icon { font-size: 20px; flex-shrink: 0; }
.strategy-text { font-size: 14px; color: #333; line-height: 1.5; }

.advice-section {
  margin-bottom: 16px;
}
.advice-section h4 {
  font-size: 13px;
  color: #333;
  margin: 0 0 8px;
}
.advice-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: #555;
}
.item-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.advice-text { font-size: 13px; color: #555; line-height: 1.5; margin: 0; }
.focus-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.motivation {
  padding: 12px;
  background: linear-gradient(135deg, #fff9e6, #fff2e6);
  border-radius: 12px;
  font-size: 13px;
  color: #d48806;
  text-align: center;
  margin-top: 12px;
}

/* 学习计划 */
.plan-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.summary-item {
  text-align: center;
  padding: 12px 8px;
  background: #f6f8ff;
  border-radius: 12px;
}
.summary-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
  line-height: 1.2;
}
.summary-label {
  font-size: 11px;
  color: #999;
}

.milestone-list {
  margin-bottom: 16px;
}
.milestone-list h4 {
  font-size: 13px;
  color: #333;
  margin: 0 0 8px;
}
.milestone-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.milestone-day {
  font-size: 12px;
  color: #667eea;
  font-weight: 600;
  white-space: nowrap;
}
.milestone-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.milestone-target { font-size: 13px; color: #333; }
.milestone-words { font-size: 12px; color: #999; }

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: #555;
}

.review-strategy {
  margin-top: 16px;
  padding: 12px;
  background: #f6f8ff;
  border-radius: 12px;
}
.review-strategy h4 {
  font-size: 13px;
  margin: 0 0 8px;
  color: #333;
}
.review-strategy p {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  margin: 0;
}

/* 问答 */
.chat-history {
  max-height: 280px;
  overflow-y: auto;
  padding: 0 4px;
}
.chat-msg {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.chat-msg.user {
  flex-direction: row-reverse;
}
.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.chat-msg.user .msg-avatar {
  background: #1890ff;
}
.chat-msg.assistant .msg-avatar {
  background: #f0f0f0;
}
.msg-content {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.5;
}
.chat-msg.user .msg-content {
  background: #1890ff;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.chat-msg.assistant .msg-content {
  background: #f5f5f5;
  color: #333;
  border-bottom-left-radius: 4px;
}

.typing {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #bbb;
  animation: typing 1.2s infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}
.chat-input input {
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.chat-input input:focus {
  border-color: #667eea;
}
.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}
.send-btn:hover:not(:disabled) { transform: scale(1.1); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .ai-assistant {
    bottom: 16px;
    right: 16px;
  }
  .ai-panel {
    width: calc(100vw - 32px);
    max-height: 60vh;
    right: -8px;
  }
}
</style>
