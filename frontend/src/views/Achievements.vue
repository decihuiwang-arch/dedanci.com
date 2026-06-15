<template>
  <AppLayout>
    <div class="achievements-page">
      <!-- 等级进度 -->
      <el-card class="level-card">
        <div class="level-display">
          <div class="level-badge">
            <span class="level-num">{{ stats.level }}</span>
            <span class="level-text">Lv</span>
          </div>
          <div class="level-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: stats.progress_percent + '%' }"></div>
            </div>
            <div class="progress-info">
              <span>经验值 {{ stats.total_exp }}</span>
              <span>下一级 {{ stats.next_level_exp === Infinity ? 'MAX' : stats.next_level_exp }}</span>
            </div>
          </div>
        </div>
        <div class="level-summary">
          已解锁 <strong>{{ stats.unlocked_count }}</strong> / {{ stats.total_count }} 个成就
        </div>
      </el-card>

      <!-- 成就网格 -->
      <div class="achievement-grid">
        <div
          v-for="ach in achievements"
          :key="ach.id"
          class="achievement-card"
          :class="{ unlocked: ach.unlocked, locked: !ach.unlocked }"
        >
          <div class="ach-icon" :class="{ glow: ach.unlocked }">{{ ach.unlocked ? ach.icon : '🔒' }}</div>
          <div class="ach-name">{{ ach.name }}</div>
          <div class="ach-desc">{{ ach.desc }}</div>
          <div class="ach-exp" v-if="ach.unlocked">+{{ ach.exp }} EXP</div>
          <div class="ach-locked-hint" v-else>未解锁</div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
// axios 拦截器已自动附加 token

const achievements = ref([])
const stats = ref({
  unlocked_count: 0,
  total_count: 0,
  total_exp: 0,
  level: 1,
  next_level_exp: 50,
  progress_percent: 0
})

const loadAchievements = async () => {
  try {
    const res = await axios.get('/api/achievements')
    if (res.data.success) {
      achievements.value = res.data.data.achievements
      stats.value = res.data.data.stats
    }
  } catch (e) {
    console.error('加载成就失败:', e)
  }
}

onMounted(loadAchievements)
</script>

<style scoped>
.achievements-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 等级卡片 */
.level-card {
  margin-bottom: 24px;
}
.level-display {
  display: flex;
  align-items: center;
  gap: 20px;
}
.level-badge {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}
.level-num {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}
.level-text {
  font-size: 11px;
  opacity: 0.8;
}
.level-progress {
  flex: 1;
}
.progress-bar {
  height: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 6px;
  transition: width 0.6s ease;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
  color: #999;
}
.level-summary {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #666;
}
.level-summary strong {
  color: #1890ff;
  font-size: 18px;
}

/* 成就网格 */
.achievement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}
.achievement-card {
  background: white;
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
  border: 2px solid #f0f0f0;
  transition: all 0.3s;
}
.achievement-card.unlocked {
  border-color: #e6f7ff;
  background: linear-gradient(180deg, #f0f8ff 0%, white 100%);
}
.achievement-card.unlocked:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
}
.achievement-card.locked {
  opacity: 0.6;
}
.ach-icon {
  font-size: 36px;
  margin-bottom: 8px;
  transition: transform 0.3s;
}
.ach-icon.glow {
  animation: iconFloat 3s ease-in-out infinite;
}
@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.ach-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}
.ach-desc {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}
.ach-exp {
  font-size: 12px;
  color: #1890ff;
  font-weight: 600;
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}
.ach-locked-hint {
  font-size: 12px;
  color: #ccc;
}

@media (max-width: 768px) {
  .achievements-page { padding: 16px; }
  .achievement-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
  .achievement-card { padding: 14px 10px; }
  .ach-icon { font-size: 28px; }
}
</style>
