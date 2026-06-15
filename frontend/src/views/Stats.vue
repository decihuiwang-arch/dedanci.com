<template>
  <AppLayout>
    <div class="stats-page">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1>📊 学习统计</h1>
        <div class="header-actions">
          <el-radio-group v-model="trendDays" size="small" @change="loadTrend">
            <el-radio-button :value="7">7天</el-radio-button>
            <el-radio-button :value="30">30天</el-radio-button>
            <el-radio-button :value="90">90天</el-radio-button>
          </el-radio-group>
          <el-button type="primary" @click="generateReport" :loading="loadingReport">
            🤖 AI 学习报告
          </el-button>
        </div>
      </div>

      <!-- 概览卡片 -->
      <div class="overview-grid">
        <div class="overview-card blue">
          <div class="card-icon">📚</div>
          <div class="card-value">{{ stats.total_words || 0 }}</div>
          <div class="card-label">已学单词</div>
          <div class="card-trend" v-if="trendData?.dailyTrend?.length">
            较昨日 <span :class="trendDir('words')">{{ wordsTrend }}</span>
          </div>
        </div>
        <div class="overview-card green">
          <div class="card-icon">✅</div>
          <div class="card-value">{{ stats.mastered || 0 }}</div>
          <div class="card-label">已掌握</div>
          <div class="card-progress">
            <div class="mini-bar">
              <div class="mini-fill" :style="{ width: masteryPercent + '%' }"></div>
            </div>
            <span>{{ masteryPercent }}%</span>
          </div>
        </div>
        <div class="overview-card orange">
          <div class="card-icon">🔥</div>
          <div class="card-value">{{ streakDays }}</div>
          <div class="card-label">连续天数</div>
        </div>
        <div class="overview-card purple">
          <div class="card-icon">🎯</div>
          <div class="card-value">{{ accuracy }}%</div>
          <div class="card-label">正确率</div>
        </div>
      </div>

      <!-- 学习趋势图 -->
      <div class="chart-section">
        <div class="section-header">
          <h2>📈 学习趋势</h2>
        </div>
        <div class="trend-chart">
          <div class="chart-container" ref="trendChartRef">
            <div v-if="!trendData?.dailyTrend?.length" class="chart-empty">
              暂无学习数据，快去 <router-link to="/study">背单词</router-link> 吧！
            </div>
            <svg v-else class="trend-svg" :viewBox="`0 0 ${chartWidth} ${chartHeight}`">
              <!-- 网格线 -->
              <line v-for="i in 5" :key="'grid-'+i"
                :x1="chartPadding.left" :y1="chartPadding.top + (i-1) * (chartHeight - chartPadding.top - chartPadding.bottom) / 4"
                :x2="chartWidth - chartPadding.right" :y2="chartPadding.top + (i-1) * (chartHeight - chartPadding.top - chartPadding.bottom) / 4"
                stroke="#f0f0f0" stroke-width="1"
              />
              <!-- Y轴标签 -->
              <text v-for="i in 5" :key="'y-'+i"
                :x="chartPadding.left - 8" :y="chartPadding.top + (i-1) * (chartHeight - chartPadding.top - chartPadding.bottom) / 4 + 4"
                text-anchor="end" font-size="11" fill="#999">
                {{ Math.round(maxTrendValue * (5 - i) / 4) }}
              </text>
              <!-- 面积 -->
              <path :d="areaPath" fill="url(#areaGradient)" opacity="0.3" />
              <!-- 折线 -->
              <path :d="linePath" fill="none" stroke="#667eea" stroke-width="2.5" stroke-linejoin="round" />
              <!-- 数据点 -->
              <g v-for="(p, i) in chartPoints" :key="'point-'+i">
                <circle :cx="p.x" :cy="p.y" r="4" fill="#667eea" stroke="#fff" stroke-width="2" />
                <title>{{ p.date }}: {{ p.value }}词</title>
              </g>
              <!-- X轴标签 -->
              <text v-for="(p, i) in chartPoints" :key="'x-'+i"
                :x="p.x" :y="chartHeight - 8"
                text-anchor="middle" font-size="10" fill="#999">
                {{ p.label }}
              </text>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#667eea" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="#667eea" stop-opacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <!-- 图例 -->
          <div class="chart-legend">
            <span class="legend-item"><span class="dot" style="background:#667eea"></span> 复习词数</span>
          </div>
        </div>
      </div>

      <!-- 双列图表 -->
      <div class="dual-chart">
        <!-- 词汇掌握分布 -->
        <div class="chart-section half">
          <div class="section-header">
            <h2>🧩 词汇掌握</h2>
          </div>
          <div class="donut-chart">
            <svg viewBox="0 0 200 200" class="donut-svg">
              <circle cx="100" cy="100" r="70" fill="none" stroke="#f0f0f0" stroke-width="20" />
              <circle v-for="(seg, i) in donutSegments" :key="i"
                cx="100" cy="100" r="70" fill="none"
                :stroke="seg.color" stroke-width="20"
                :stroke-dasharray="seg.dashArray"
                :stroke-dashoffset="seg.dashOffset"
                :transform="`rotate(${seg.rotate}, 100, 100)`"
                stroke-linecap="round"
              />
              <text x="100" y="95" text-anchor="middle" font-size="28" font-weight="700" fill="#333">
                {{ stats.total_words || 0 }}
              </text>
              <text x="100" y="115" text-anchor="middle" font-size="12" fill="#999">
                总词量
              </text>
            </svg>
            <div class="donut-legend">
              <div class="legend-item">
                <span class="dot" style="background:#52c41a"></span>
                已掌握 {{ masteryDist.mastered || 0 }}
              </div>
              <div class="legend-item">
                <span class="dot" style="background:#faad14"></span>
                学习中 {{ masteryDist.learning || 0 }}
              </div>
              <div class="legend-item">
                <span class="dot" style="background:#e0e0e0"></span>
                未学 {{ masteryDist.new_words || 0 }}
              </div>
            </div>
          </div>
        </div>

        <!-- 学习时段分布 -->
        <div class="chart-section half">
          <div class="section-header">
            <h2>⏰ 学习时段</h2>
          </div>
          <div class="hourly-chart">
            <div v-for="h in 24" :key="h" class="hour-bar-wrapper">
              <div class="hour-bar"
                :style="{ height: getHourHeight(h-1) + '%' }"
                :class="{ active: isCurrentHour(h-1) }"
                :title="`${h-1}:00 - ${getHourCount(h-1)}次`"
              ></div>
              <span class="hour-label" v-if="h % 4 === 1 || h === 24">{{ h-1 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 效率分析 -->
      <div class="chart-section" v-if="trendData?.efficiencyTrend?.length">
        <div class="section-header">
          <h2>⚡ 学习效率</h2>
        </div>
        <div class="efficiency-grid">
          <div v-for="(day, i) in trendData.efficiencyTrend.slice(-7)" :key="i" class="efficiency-day">
            <div class="eff-ring" :class="getEffClass(day.accuracy)">
              <span class="eff-value">{{ day.accuracy }}%</span>
            </div>
            <span class="eff-label">{{ formatDate(day.date) }}</span>
            <span class="eff-count">{{ day.total }}词</span>
          </div>
        </div>
      </div>

      <!-- 今日详情 -->
      <div class="detail-section">
        <div class="section-header">
          <h2>📋 今日详情</h2>
        </div>
        <div class="today-grid">
          <div class="today-item">
            <div class="item-value blue">{{ todayStats.total || 0 }}</div>
            <div class="item-label">复习次数</div>
          </div>
          <div class="today-item">
            <div class="item-value green">{{ todayStats.good || 0 }}</div>
            <div class="item-label">良好</div>
          </div>
          <div class="today-item">
            <div class="item-value orange">{{ todayStats.hard || 0 }}</div>
            <div class="item-label">困难</div>
          </div>
          <div class="today-item">
            <div class="item-value red">{{ todayStats.again || 0 }}</div>
            <div class="item-label">忘记</div>
          </div>
        </div>
      </div>

      <!-- 总体统计 -->
      <div class="detail-section">
        <div class="section-header">
          <h2>📊 总体统计</h2>
        </div>
        <div class="stats-table">
          <div class="stats-row">
            <span class="stats-label">总复习次数</span>
            <span class="stats-value">{{ stats.total_reps || 0 }}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">总错误次数</span>
            <span class="stats-value warn">{{ stats.total_lapses || 0 }}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">正确率</span>
            <span class="stats-value">{{ accuracy }}%</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">日均学习</span>
            <span class="stats-value">{{ avgDaily }}词</span>
          </div>
        </div>
      </div>

      <!-- 打卡分享 -->
      <div class="checkin-bar">
        <div class="checkin-left">
          <span class="checkin-streak">🔥 连续 {{ streakDays }} 天</span>
          <span class="checkin-label">坚持就是胜利！</span>
        </div>
        <ShareCard />
      </div>

      <!-- AI 学习报告弹窗 -->
      <el-dialog v-model="showReport" title="🤖 AI 学习报告" width="600px" :close-on-click-modal="false">
        <div v-if="loadingReport" class="report-loading">
          <el-icon class="is-loading" :size="32"><Loading /></el-icon>
          <p>AI 正在分析你的学习数据，生成个性化报告...</p>
        </div>
        <div v-else-if="report" class="report-content" v-html="report"></div>
        <div v-else class="report-empty">
          <p>生成失败，请稍后重试</p>
        </div>
      </el-dialog>

      <!-- 热力图 -->
      <div class="chart-section" style="margin-top: 20px;">
        <HeatmapCalendar />
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Loading } from '@element-plus/icons-vue'
import HeatmapCalendar from '../components/HeatmapCalendar.vue'
import ShareCard from '../components/ShareCard.vue'
import { useAuth } from '../stores/auth'

const { streakDays: userStreak } = useAuth()

const stats = ref({})
const todayStats = ref({})
const streakDays = computed(() => stats.value.streak || userStreak.value || 0)
const trendDays = ref(7)
const trendData = ref(null)
const masteryDist = ref({ new_words: 0, learning: 0, mastered: 0 })

const showReport = ref(false)
const loadingReport = ref(false)
const report = ref('')

const chartWidth = 800
const chartHeight = 300
const chartPadding = { top: 20, right: 20, bottom: 40, left: 40 }

const accuracy = computed(() => {
  const total = stats.value.total_reps || 0
  const lapses = stats.value.total_lapses || 0
  if (total === 0) return 0
  return Math.round((total - lapses) / total * 100)
})

const masteryPercent = computed(() => {
  const total = stats.value.total_words || 0
  const mastered = stats.value.mastered || 0
  if (total === 0) return 0
  return Math.round(mastered / total * 100)
})

const avgDaily = computed(() => {
  if (!trendData.value?.dailyTrend?.length) return 0
  const total = trendData.value.dailyTrend.reduce((s, d) => s + (d.total || 0), 0)
  return Math.round(total / trendData.value.dailyTrend.length)
})

const wordsTrend = computed(() => {
  if (!trendData.value?.dailyTrend || trendData.value.dailyTrend.length < 2) return '—'
  const days = trendData.value.dailyTrend
  const today = days[days.length - 1]?.total || 0
  const yesterday = days[days.length - 2]?.total || 0
  const diff = today - yesterday
  if (diff > 0) return `+${diff}`
  if (diff < 0) return `${diff}`
  return '持平'
})

function trendDir(field) {
  const v = wordsTrend.value
  if (v.startsWith('+')) return 'up'
  if (v.startsWith('-')) return 'down'
  return ''
}

// 趋势图数据
const maxTrendValue = computed(() => {
  if (!trendData.value?.dailyTrend?.length) return 10
  const max = Math.max(...trendData.value.dailyTrend.map(d => d.total || 0))
  return Math.max(max, 10)
})

const chartPoints = computed(() => {
  if (!trendData.value?.dailyTrend?.length) return []
  const data = trendData.value.dailyTrend
  const plotW = chartWidth - chartPadding.left - chartPadding.right
  const plotH = chartHeight - chartPadding.top - chartPadding.bottom
  const step = data.length > 1 ? plotW / (data.length - 1) : plotW

  return data.map((d, i) => {
    const x = chartPadding.left + i * step
    const y = chartPadding.top + plotH - (d.total || 0) / maxTrendValue.value * plotH
    const dateStr = d.date || ''
    const label = dateStr.substring(5) || ''
    return { x, y, value: d.total || 0, date: dateStr, label }
  })
})

const linePath = computed(() => {
  if (chartPoints.value.length === 0) return ''
  return chartPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
})

const areaPath = computed(() => {
  if (chartPoints.value.length === 0) return ''
  const bottom = chartHeight - chartPadding.bottom
  const pts = chartPoints.value
  let path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  path += ` L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`
  return path
})

// 甜甜圈图
const donutSegments = computed(() => {
  const d = masteryDist.value
  const total = (d.mastered || 0) + (d.learning || 0) + (d.new_words || 0)
  if (total === 0) return []
  const circumference = 2 * Math.PI * 70 // r=70
  const segments = [
    { value: d.mastered || 0, color: '#52c41a' },
    { value: d.learning || 0, color: '#faad14' },
    { value: d.new_words || 0, color: '#e0e0e0' }
  ]
  let rotate = -90
  return segments.map(seg => {
    const length = (seg.value / total) * circumference
    const gap = total > 0 && seg.value > 0 ? 4 : 0
    const result = {
      dashArray: `${Math.max(0, length - gap)} ${circumference - length + gap}`,
      dashOffset: 0,
      rotate,
      color: seg.color
    }
    rotate += (seg.value / total) * 360
    return result
  })
})

// 时段分布
function getHourHeight(hour) {
  if (!trendData.value?.hourlyDist) return 0
  const maxCount = Math.max(...trendData.value.hourlyDist.map(h => h.count || 0), 1)
  const hourData = trendData.value.hourlyDist.find(h => h.hour === hour)
  return hourData ? Math.max((hourData.count / maxCount) * 100, 2) : 0
}

function getHourCount(hour) {
  if (!trendData.value?.hourlyDist) return 0
  const hourData = trendData.value.hourlyDist.find(h => h.hour === hour)
  return hourData?.count || 0
}

function isCurrentHour(hour) {
  return new Date().getHours() === hour
}

// 效率
function getEffClass(accuracy) {
  if (accuracy >= 80) return 'excellent'
  if (accuracy >= 60) return 'good'
  if (accuracy >= 40) return 'fair'
  return 'poor'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 加载数据
const loadStats = async () => {
  try {
    const res = await axios.get('/api/study/stats')
    if (res.data.success) {
      stats.value = res.data.data.total || {}
      todayStats.value = res.data.data.today || {}
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

const loadTrend = async () => {
  try {
    const res = await axios.get('/api/study/trend', { params: { days: trendDays.value } })
    if (res.data.success) {
      trendData.value = res.data.data
      masteryDist.value = res.data.data.masteryDist || { new_words: 0, learning: 0, mastered: 0 }
    }
  } catch (error) {
    console.error('加载趋势失败:', error)
  }
}

// AI 学习报告
const generateReport = async () => {
  showReport.value = true
  loadingReport.value = true
  report.value = ''

  try {
    // 收集数据
    const reportData = {
      stats: stats.value,
      todayStats: todayStats.value,
      trend: trendData.value,
      streakDays: streakDays.value,
      accuracy: accuracy.value,
      masteryPercent: masteryPercent.value
    }

    const res = await axios.post('/api/ai/study-report', reportData)
    if (res.data.success) {
      report.value = res.data.data?.report || res.data.data?.content || '生成失败'
    } else {
      report.value = '<p style="color:#999;">报告生成失败，请稍后重试</p>'
    }
  } catch (e) {
    report.value = '<p style="color:#999;">网络错误，请稍后重试</p>'
  } finally {
    loadingReport.value = false
  }
}

onMounted(() => {
  loadStats()
  loadTrend()
})
</script>

<style scoped>
.stats-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 28px;
  color: #fff;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 概览卡片 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.overview-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  position: relative;
  overflow: hidden;
}
.overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}
.overview-card.blue::before { background: #1890ff; }
.overview-card.green::before { background: #52c41a; }
.overview-card.orange::before { background: #faad14; }
.overview-card.purple::before { background: #667eea; }

.card-icon { font-size: 28px; margin-bottom: 8px; }
.card-value { font-size: 32px; font-weight: 700; color: #333; line-height: 1.2; }
.card-label { font-size: 13px; color: #999; margin-top: 4px; }
.card-trend { font-size: 12px; color: #999; margin-top: 8px; }
.card-trend .up { color: #52c41a; }
.card-trend .down { color: #ff4d4f; }

.card-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.mini-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}
.mini-fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a, #73d13d);
  border-radius: 3px;
  transition: width 0.5s;
}
.card-progress span { font-size: 12px; color: #52c41a; font-weight: 600; }

/* 图表区域 */
.chart-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  margin-bottom: 24px;
}
.section-header h2 {
  font-size: 18px;
  color: #333;
  margin: 0 0 16px;
}

.dual-chart {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.chart-section.half {
  margin-bottom: 0;
}

/* 趋势图 */
.trend-chart {
  width: 100%;
  overflow: hidden;
}
.chart-container {
  width: 100%;
}
.trend-svg {
  width: 100%;
  height: auto;
}
.chart-empty {
  text-align: center;
  padding: 48px;
  color: #999;
}
.chart-empty a { color: #667eea; }

.chart-legend {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
  margin-top: 8px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}
.legend-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

/* 甜甜圈图 */
.donut-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.donut-svg {
  width: 180px;
  height: 180px;
}
.donut-legend {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}

/* 时段分布 */
.hourly-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 120px;
  padding: 0 4px;
}
.hour-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}
.hour-bar {
  width: 100%;
  max-width: 20px;
  min-height: 2px;
  background: linear-gradient(180deg, #667eea, #764ba2);
  border-radius: 4px 4px 0 0;
  transition: height 0.3s;
  opacity: 0.6;
}
.hour-bar.active {
  opacity: 1;
  box-shadow: 0 0 8px rgba(102, 126, 234, 0.4);
}
.hour-label {
  font-size: 9px;
  color: #999;
  margin-top: 4px;
}

/* 效率分析 */
.efficiency-grid {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 8px 0;
}
.efficiency-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 64px;
}
.eff-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 4px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.eff-ring.excellent { border-color: #52c41a; }
.eff-ring.good { border-color: #1890ff; }
.eff-ring.fair { border-color: #faad14; }
.eff-ring.poor { border-color: #ff4d4f; }
.eff-value { font-size: 14px; font-weight: 700; color: #333; }
.eff-label { font-size: 11px; color: #999; }
.eff-count { font-size: 10px; color: #bbb; }

/* 今日详情 */
.detail-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  margin-bottom: 24px;
}
.today-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.today-item {
  text-align: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;
}
.item-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}
.item-value.blue { color: #1890ff; }
.item-value.green { color: #52c41a; }
.item-value.orange { color: #faad14; }
.item-value.red { color: #ff4d4f; }
.item-label { font-size: 13px; color: #999; margin-top: 4px; }

/* 总体统计 */
.stats-table {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}
.stats-row:last-child { border-bottom: none; }
.stats-label { font-size: 14px; color: #666; }
.stats-value { font-size: 16px; font-weight: 600; color: #333; }
.stats-value.warn { color: #ff4d4f; }

/* 打卡分享 */
.checkin-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}
.checkin-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.checkin-streak {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}
.checkin-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

/* AI 报告 */
.report-loading {
  text-align: center;
  padding: 48px;
  color: #999;
}
.report-loading p { margin-top: 16px; }
.report-content {
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}
.report-content :deep(h2) {
  font-size: 18px;
  color: #333;
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #667eea;
}
.report-content :deep(h3) {
  font-size: 15px;
  color: #555;
  margin: 16px 0 8px;
}
.report-content :deep(ul) {
  padding-left: 20px;
}
.report-content :deep(li) {
  margin-bottom: 4px;
}
.report-empty {
  text-align: center;
  padding: 32px;
  color: #999;
}

@media (max-width: 768px) {
  .stats-page { padding: 16px; }
  .overview-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .dual-chart { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .today-grid { grid-template-columns: repeat(2, 1fr); }
  .checkin-bar { flex-direction: column; gap: 12px; text-align: center; }
  .card-value { font-size: 24px; }
}
</style>
