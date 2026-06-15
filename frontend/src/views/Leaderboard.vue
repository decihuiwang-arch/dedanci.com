<template>
  <AppLayout>
    <div class="leaderboard-page">
      <!-- 页面标题 -->
      <div class="page-header">
        <div class="header-content">
          <h1>🏆 排行榜</h1>
          <p class="subtitle">与全球学习者一较高下</p>
        </div>
      </div>

      <!-- 总览卡片 -->
      <div v-if="overview" class="overview-section">
        <div class="overview-grid">
          <div class="overview-card streak" @click="switchTab('streak')">
            <div class="card-icon">🔥</div>
            <div class="card-title">连续天数</div>
            <div class="top-list">
              <div v-for="(u, i) in overview.streak" :key="u.id" class="top-item">
                <span class="rank-badge" :class="['rank-' + (i+1)]">{{ i + 1 }}</span>
                <span class="name">{{ u.username }}</span>
                <span class="value">{{ u.value }}天</span>
              </div>
              <div v-if="!overview.streak.length" class="empty-tip">暂无数据</div>
            </div>
          </div>
          <div class="overview-card today" @click="switchTab('today')">
            <div class="card-icon">📖</div>
            <div class="card-title">今日学习</div>
            <div class="top-list">
              <div v-for="(u, i) in overview.today" :key="u.id" class="top-item">
                <span class="rank-badge" :class="['rank-' + (i+1)]">{{ i + 1 }}</span>
                <span class="name">{{ u.username }}</span>
                <span class="value">{{ u.value }}词</span>
              </div>
              <div v-if="!overview.today.length" class="empty-tip">暂无数据</div>
            </div>
          </div>
          <div class="overview-card mastered" @click="switchTab('mastered')">
            <div class="card-icon">🧠</div>
            <div class="card-title">累计掌握</div>
            <div class="top-list">
              <div v-for="(u, i) in overview.mastered" :key="u.id" class="top-item">
                <span class="rank-badge" :class="['rank-' + (i+1)]">{{ i + 1 }}</span>
                <span class="name">{{ u.username }}</span>
                <span class="value">{{ u.value }}词</span>
              </div>
              <div v-if="!overview.mastered.length" class="empty-tip">暂无数据</div>
            </div>
          </div>
          <div class="overview-card exp" @click="switchTab('exp')">
            <div class="card-icon">⭐</div>
            <div class="card-title">经验值</div>
            <div class="top-list">
              <div v-for="(u, i) in overview.exp" :key="u.id" class="top-item">
                <span class="rank-badge" :class="['rank-' + (i+1)]">{{ i + 1 }}</span>
                <span class="name">{{ u.username }}</span>
                <span class="value">{{ u.value }}XP</span>
              </div>
              <div v-if="!overview.exp.length" class="empty-tip">暂无数据</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 排行榜主区域 -->
      <div class="leaderboard-main">
        <div class="tabs-bar">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            @click="switchTab(tab.key)"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>

        <!-- 前三名展示 -->
        <div v-if="podium.length >= 3" class="podium-section">
          <div class="podium second">
            <div class="podium-avatar">{{ podium[1]?.username?.charAt(0) || '?' }}</div>
            <div class="podium-crown">🥈</div>
            <div class="podium-name">{{ podium[1]?.username }}</div>
            <div class="podium-value">{{ podium[1]?.displayValue }}</div>
            <div class="podium-level">Lv.{{ podium[1]?.level }}</div>
            <div class="pedestal">2</div>
          </div>
          <div class="podium first">
            <div class="podium-avatar gold">{{ podium[0]?.username?.charAt(0) || '?' }}</div>
            <div class="podium-crown">👑</div>
            <div class="podium-name">{{ podium[0]?.username }}</div>
            <div class="podium-value">{{ podium[0]?.displayValue }}</div>
            <div class="podium-level">Lv.{{ podium[0]?.level }}</div>
            <div class="pedestal">1</div>
          </div>
          <div class="podium third">
            <div class="podium-avatar">{{ podium[2]?.username?.charAt(0) || '?' }}</div>
            <div class="podium-crown">🥉</div>
            <div class="podium-name">{{ podium[2]?.username }}</div>
            <div class="podium-value">{{ podium[2]?.displayValue }}</div>
            <div class="podium-level">Lv.{{ podium[2]?.level }}</div>
            <div class="pedestal">3</div>
          </div>
        </div>

        <!-- 排行列表 -->
        <div class="rank-list">
          <div v-if="loading" class="loading-state">
            <el-icon class="is-loading" :size="24"><Loading /></el-icon>
            <span>加载中...</span>
          </div>

          <div v-else-if="leaderboard.length === 0" class="empty-state">
            <div class="empty-icon">🌱</div>
            <p>还没有排行数据，快去学习吧！</p>
          </div>

          <template v-else>
            <div
              v-for="item in leaderboard"
              :key="item.id"
              :class="['rank-row', { 'is-me': item.is_me }]"
            >
              <div :class="['rank-num', { top: item.rank <= 3 }]">
                <span v-if="item.rank <= 3" class="medal">
                  {{ ['🥇','🥈','🥉'][item.rank - 1] }}
                </span>
                <span v-else>{{ item.rank }}</span>
              </div>
              <div class="rank-avatar">{{ item.username?.charAt(0) || '?' }}</div>
              <div class="rank-info">
                <span class="rank-name">
                  {{ item.username }}
                  <el-tag v-if="item.is_me" size="small" type="success" class="me-tag">我</el-tag>
                </span>
                <span class="rank-level">Lv.{{ item.level }}</span>
              </div>
              <div class="rank-value">
                <span class="value-num">{{ item.displayValue }}</span>
                <span class="value-unit">{{ valueUnit }}</span>
              </div>
              <div v-if="item.streak_days && activeTab !== 'streak'" class="rank-streak">
                🔥{{ item.streak_days }}
              </div>
            </div>
          </template>
        </div>

        <!-- 我的排名 -->
        <div v-if="myRank" class="my-rank-bar">
          <span class="my-rank-label">我的排名</span>
          <span class="my-rank-value">第 {{ myRank }} 名</span>
          <router-link to="/study" class="study-btn">去学习 →</router-link>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { Loading } from '@element-plus/icons-vue'
import AppLayout from '../components/AppLayout.vue'

const tabs = [
  { key: 'streak', label: '连续天数', icon: '🔥' },
  { key: 'today', label: '今日学习', icon: '📖' },
  { key: 'mastered', label: '累计掌握', icon: '🧠' },
  { key: 'exp', label: '经验值', icon: '⭐' }
]

const activeTab = ref('streak')
const loading = ref(false)
const leaderboard = ref([])
const myRank = ref(null)
const overview = ref(null)

const valueUnit = computed(() => {
  const map = { streak: '天', today: '词', mastered: '词', exp: 'XP' }
  return map[activeTab.value] || ''
})

const podium = computed(() => {
  return leaderboard.value.slice(0, 3)
})

// 格式化排行数据
function formatItem(item) {
  const displayMap = {
    streak: item.streak_days,
    today: item.today_count,
    mastered: item.mastered,
    exp: item.exp
  }
  return {
    ...item,
    displayValue: displayMap[activeTab.value] ?? item.exp ?? 0
  }
}

async function fetchOverview() {
  try {
    const { data } = await axios.get('/api/leaderboard/overview')
    if (data.success) {
      overview.value = data.data
    }
  } catch (e) {
    console.error('获取总览失败:', e)
  }
}

async function fetchLeaderboard() {
  loading.value = true
  try {
    const { data } = await axios.get('/api/leaderboard', {
      params: { type: activeTab.value, limit: 50 }
    })
    if (data.success) {
      leaderboard.value = data.data.leaderboard.map(formatItem)
      myRank.value = data.data.myRank
    }
  } catch (e) {
    console.error('获取排行榜失败:', e)
    leaderboard.value = []
  } finally {
    loading.value = false
  }
}

function switchTab(key) {
  activeTab.value = key
}

onMounted(() => {
  fetchOverview()
  fetchLeaderboard()
})

watch(activeTab, () => {
  fetchLeaderboard()
})
</script>

<style scoped>
.leaderboard-page {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
  min-height: calc(100vh - 64px);
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
  padding: 24px 0;
}
.page-header h1 {
  font-size: 32px;
  color: #fff;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.subtitle {
  color: rgba(255,255,255,0.85);
  margin: 8px 0 0;
  font-size: 16px;
}

/* 总览卡片 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}
.overview-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.overview-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.card-icon { font-size: 28px; margin-bottom: 8px; }
.card-title { font-size: 14px; color: #666; font-weight: 600; margin-bottom: 12px; }
.top-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
}
.rank-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.rank-badge.rank-1 { background: linear-gradient(135deg, #FFD700, #FFA500); }
.rank-badge.rank-2 { background: linear-gradient(135deg, #C0C0C0, #A0A0A0); }
.rank-badge.rank-3 { background: linear-gradient(135deg, #CD7F32, #B87333); }
.top-item .name { flex: 1; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-item .value { color: #1890ff; font-weight: 600; }
.empty-tip { color: #ccc; font-size: 12px; text-align: center; padding: 8px 0; }

/* 主区域 */
.leaderboard-main {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

/* 标签栏 */
.tabs-bar {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  padding: 0 16px;
  overflow-x: auto;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px 24px;
  border: none;
  background: none;
  font-size: 15px;
  color: #666;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.25s;
  white-space: nowrap;
}
.tab-btn:hover { color: #1890ff; }
.tab-btn.active {
  color: #1890ff;
  border-bottom-color: #1890ff;
  font-weight: 600;
}
.tab-icon { font-size: 16px; }

/* 领奖台 */
.podium-section {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 32px 24px 0;
  gap: 16px;
}
.podium {
  text-align: center;
  position: relative;
  flex: 1;
  max-width: 180px;
}
.podium-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a0a0a0, #c0c0c0);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  margin: 0 auto 8px;
  border: 3px solid #e0e0e0;
}
.podium-avatar.gold {
  width: 72px;
  height: 72px;
  font-size: 28px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  border-color: #FFD700;
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
}
.podium-crown { font-size: 24px; margin-bottom: 4px; }
.podium-name { font-size: 14px; font-weight: 600; color: #333; }
.podium-value { font-size: 18px; font-weight: 700; color: #1890ff; margin: 2px 0; }
.podium-level { font-size: 12px; color: #999; margin-bottom: 8px; }
.pedestal {
  background: linear-gradient(180deg, #f5f5f5, #e8e8e8);
  border-radius: 8px 8px 0 0;
  padding: 16px 0;
  font-size: 24px;
  font-weight: 700;
  color: #bbb;
}
.podium.first .pedestal {
  background: linear-gradient(180deg, #FFF9E6, #FFEFB3);
  color: #FFD700;
  padding: 24px 0;
}
.podium.second .pedestal {
  background: linear-gradient(180deg, #F8F8F8, #E8E8E8);
  color: #C0C0C0;
}
.podium.third .pedestal {
  background: linear-gradient(180deg, #FFF3E6, #FFE4C4);
  color: #CD7F32;
}

/* 排行列表 */
.rank-list {
  padding: 16px 0;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  transition: background 0.2s;
  border-bottom: 1px solid #fafafa;
}
.rank-row:hover { background: #f9f9f9; }
.rank-row.is-me {
  background: #f0f7ff;
  border-left: 3px solid #1890ff;
}

.rank-num {
  width: 32px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #999;
}
.rank-num.top { font-size: 20px; }
.medal { font-size: 20px; }

.rank-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.rank-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.rank-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
}
.me-tag { font-size: 11px; }
.rank-level {
  font-size: 12px;
  color: #999;
}

.rank-value {
  text-align: right;
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.value-num {
  font-size: 18px;
  font-weight: 700;
  color: #1890ff;
}
.value-unit {
  font-size: 12px;
  color: #999;
}

.rank-streak {
  font-size: 12px;
  color: #ff6b35;
}

/* 我的排名 */
.my-rank-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border-radius: 0 0 20px 20px;
}
.my-rank-label { font-size: 14px; }
.my-rank-value { font-size: 20px; font-weight: 700; }
.study-btn {
  color: #fff;
  text-decoration: none;
  background: rgba(255,255,255,0.2);
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}
.study-btn:hover { background: rgba(255,255,255,0.3); }

/* 加载和空状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  color: #999;
  font-size: 14px;
}
.empty-state {
  text-align: center;
  padding: 48px;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state p { color: #999; font-size: 15px; }

/* 响应式 */
@media (max-width: 768px) {
  .leaderboard-page { padding: 16px; }
  .page-header h1 { font-size: 24px; }
  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .podium-section { gap: 8px; padding: 20px 12px 0; }
  .podium-avatar { width: 44px; height: 44px; font-size: 18px; }
  .podium-avatar.gold { width: 56px; height: 56px; font-size: 22px; }
  .tabs-bar { padding: 0 8px; }
  .tab-btn { padding: 12px 14px; font-size: 13px; }
  .rank-row { padding: 10px 16px; gap: 8px; }
  .rank-avatar { width: 32px; height: 32px; font-size: 13px; }
  .rank-name { font-size: 13px; }
  .value-num { font-size: 15px; }
}
</style>
