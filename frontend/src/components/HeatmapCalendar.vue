<template>
  <div class="heatmap-container">
    <div class="heatmap-header">
      <h3>学习日历</h3>
      <div class="heatmap-nav">
        <button class="nav-btn" @click="prevMonth">&lt;</button>
        <span class="month-label">{{ monthLabel }}</span>
        <button class="nav-btn" @click="nextMonth">&gt;</button>
      </div>
    </div>
    <div class="heatmap-grid">
      <div class="day-labels">
        <span>一</span><span></span><span>三</span><span></span><span>五</span><span></span><span>日</span>
      </div>
      <div class="heatmap-weeks">
        <div v-for="(week, wi) in weeks" :key="wi" class="heatmap-week">
          <div
            v-for="(day, di) in week"
            :key="di"
            class="heatmap-day"
            :class="getLevelClass(day.count)"
            :title="day.date ? day.date + ': ' + day.count + ' 个单词' : ''"
          ></div>
        </div>
      </div>
    </div>
    <div class="heatmap-legend">
      <span class="legend-label">少</span>
      <div class="legend-cell level-0"></div>
      <div class="legend-cell level-1"></div>
      <div class="legend-cell level-2"></div>
      <div class="legend-cell level-3"></div>
      <div class="legend-cell level-4"></div>
      <span class="legend-label">多</span>
    </div>
    <div class="month-stats">
      <div class="ms-item">
        <span class="ms-value">{{ monthTotal }}</span>
        <span class="ms-label">本月复习</span>
      </div>
      <div class="ms-item">
        <span class="ms-value">{{ monthDays }}</span>
        <span class="ms-label">学习天数</span>
      </div>
      <div class="ms-item">
        <span class="ms-value">{{ monthAvg }}</span>
        <span class="ms-label">日均复习</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)
const calendarData = ref([])

const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
const monthLabel = computed(() => year.value + '年 ' + monthNames[month.value - 1])

const monthTotal = computed(() => calendarData.value.reduce((sum, d) => sum + d.count, 0))
const monthDays = computed(() => calendarData.value.filter(d => d.count > 0).length)
const monthAvg = computed(() => monthDays.value > 0 ? Math.round(monthTotal.value / monthDays.value) : 0)

const weeks = computed(() => {
  const firstDay = new Date(year.value, month.value - 1, 1)
  const lastDay = new Date(year.value, month.value, 0)
  const daysInMonth = lastDay.getDate()
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6
  const days = []
  for (let i = 0; i < startDow; i++) {
    days.push({ date: null, count: 0 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year.value + '-' + String(month.value).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    const found = calendarData.value.find(item => item.date === dateStr)
    days.push({ date: dateStr, count: found ? found.count : 0 })
  }
  const remainder = days.length % 7
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      days.push({ date: null, count: 0 })
    }
  }
  const result = []
  for (let i = 0; i < days.length; i += 7) {
    result.push(days.slice(i, i + 7))
  }
  return result
})

const getLevelClass = (count) => {
  if (!count) return 'level-0'
  if (count <= 5) return 'level-1'
  if (count <= 15) return 'level-2'
  if (count <= 30) return 'level-3'
  return 'level-4'
}

const loadData = async () => {
  try {
    const res = await axios.get('/api/study/calendar', {
      params: { year: year.value, month: month.value }
    })
    if (res.data.success) {
      calendarData.value = res.data.data.month || []
    }
  } catch (e) {
    console.warn('加载日历数据失败:', e)
  }
}

const prevMonth = () => {
  if (month.value === 1) { year.value--; month.value = 12 }
  else { month.value-- }
  loadData()
}

const nextMonth = () => {
  if (month.value === 12) { year.value++; month.value = 1 }
  else { month.value++ }
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.heatmap-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.heatmap-header h3 { font-size: 16px; color: #333; margin: 0; }
.heatmap-nav { display: flex; align-items: center; gap: 8px; }
.nav-btn {
  width: 28px; height: 28px;
  border: 1px solid #e8e8e8; border-radius: 6px;
  background: white; cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.nav-btn:hover { border-color: #1890ff; color: #1890ff; }
.month-label { font-size: 14px; color: #333; font-weight: 500; min-width: 80px; text-align: center; }
.heatmap-grid { display: flex; gap: 4px; overflow-x: auto; }
.day-labels { display: flex; flex-direction: column; gap: 2px; font-size: 10px; color: #999; }
.day-labels span { height: 13px; display: flex; align-items: center; justify-content: flex-end; }
.heatmap-weeks { display: flex; gap: 3px; }
.heatmap-week { display: flex; flex-direction: column; gap: 2px; }
.heatmap-day { width: 13px; height: 13px; border-radius: 2px; transition: all 0.15s; cursor: default; }
.heatmap-day:not(.level-0) { cursor: pointer; }
.heatmap-day:not(.level-0):hover { transform: scale(1.3); outline: 2px solid rgba(0,0,0,0.15); }
.level-0 { background: #ebedf0; }
.level-1 { background: #9be9a8; }
.level-2 { background: #40c463; }
.level-3 { background: #30a14e; }
.level-4 { background: #216e39; }
.heatmap-legend { display: flex; align-items: center; gap: 4px; margin-top: 12px; justify-content: flex-end; }
.legend-label { font-size: 11px; color: #999; }
.legend-cell { width: 13px; height: 13px; border-radius: 2px; }
.month-stats { display: flex; gap: 32px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
.ms-item { text-align: center; }
.ms-value { display: block; font-size: 24px; font-weight: 700; color: #1890ff; }
.ms-label { font-size: 12px; color: #999; margin-top: 2px; }
@media (max-width: 768px) {
  .heatmap-container { padding: 16px; }
  .heatmap-day { width: 11px; height: 11px; }
  .month-stats { gap: 20px; }
  .ms-value { font-size: 20px; }
}
</style>
