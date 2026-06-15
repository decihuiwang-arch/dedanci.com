<template>
  <div class="share-card-wrapper">
    <!-- 触发按钮 -->
    <el-button type="primary" :icon="Share" @click="openShareDialog" round>
      打卡分享
    </el-button>

    <!-- 分享弹窗 -->
    <el-dialog v-model="showDialog" title="每日打卡" width="480px" :close-on-click-modal="false" class="share-dialog">
      <div class="share-preview">
        <!-- Canvas 绘制区域（隐藏） -->
        <canvas ref="shareCanvas" width="750" height="1334" style="display:none;"></canvas>
        <!-- 预览图 -->
        <div v-if="previewUrl" class="preview-container">
          <img :src="previewUrl" alt="打卡卡片" class="preview-image" />
        </div>
        <div v-else class="loading-placeholder">
          <el-icon class="is-loading" :size="32"><Loading /></el-icon>
          <span>生成打卡卡片中...</span>
        </div>
      </div>

      <div class="share-actions">
        <el-button type="primary" @click="downloadImage" :disabled="!previewUrl" size="large">
          <el-icon><Download /></el-icon> 保存图片
        </el-button>
        <el-button @click="copyLink" size="large">
          <el-icon><Link /></el-icon> 复制链接
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Share, Download, Link, Loading } from '@element-plus/icons-vue'
import axios from 'axios'
import { useAuth } from '../stores/auth'

const { } = useAuth()

const showDialog = ref(false)
const shareCanvas = ref(null)
const previewUrl = ref('')

const checkinData = ref(null)

const openShareDialog = async () => {
  showDialog.value = true
  previewUrl.value = ''
  await loadCheckinData()
}

const loadCheckinData = async () => {
  try {
    const res = await axios.get('/api/study/checkin')
    if (res.data.success) {
      checkinData.value = res.data.data
      await nextTick()
      await drawShareCard()
    }
  } catch (e) {
    console.error('加载打卡数据失败:', e)
    ElMessage.error('加载打卡数据失败')
  }
}

const drawShareCard = async () => {
  const canvas = shareCanvas.value
  if (!canvas || !checkinData.value) return

  const ctx = canvas.getContext('2d')
  const W = 750
  const H = 1334
  const data = checkinData.value

  // ===== 背景 =====
  // 渐变背景
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, '#1a1a2e')
  bgGrad.addColorStop(0.5, '#16213e')
  bgGrad.addColorStop(1, '#0f3460')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // 装饰圆
  drawOrb(ctx, 600, 200, 300, 'rgba(102, 126, 234, 0.15)')
  drawOrb(ctx, 150, 900, 250, 'rgba(118, 75, 162, 0.12)')
  drawOrb(ctx, 650, 1100, 200, 'rgba(230, 100, 120, 0.08)')

  // ===== 顶部标题 =====
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'

  // 日期
  const now = new Date()
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const weekStr = `星期${weekDays[now.getDay()]}`

  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.fillText(`${dateStr}  ${weekStr}`, W / 2, 120)

  // 主标题
  ctx.font = 'bold 56px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('得单词者得天下', W / 2, 200)

  // 副标题
  ctx.font = '28px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fillText('AI 驱动 · 科学记忆 · FSRS-4.5', W / 2, 248)

  // ===== 核心数据区域 =====
  // 大圆 - 今日学习量
  const centerX = W / 2
  const centerY = 420
  const bigR = 100

  // 外圈
  ctx.beginPath()
  ctx.arc(centerX, centerY, bigR + 8, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)'
  ctx.lineWidth = 3
  ctx.stroke()

  // 进度圈
  const totalWords = Math.max(data.today.total || 0, 1)
  const progress = Math.min(totalWords / 50, 1) // 目标50个
  ctx.beginPath()
  ctx.arc(centerX, centerY, bigR + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
  const progGrad = ctx.createLinearGradient(centerX - bigR, centerY, centerX + bigR, centerY)
  progGrad.addColorStop(0, '#667eea')
  progGrad.addColorStop(1, '#e6648e')
  ctx.strokeStyle = progGrad
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.stroke()

  // 内圆填充
  ctx.beginPath()
  ctx.arc(centerX, centerY, bigR, 0, Math.PI * 2)
  const innerGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, bigR)
  innerGrad.addColorStop(0, 'rgba(102, 126, 234, 0.2)')
  innerGrad.addColorStop(1, 'rgba(102, 126, 234, 0.05)')
  ctx.fillStyle = innerGrad
  ctx.fill()

  // 数字
  ctx.font = 'bold 72px "PingFang SC", "SF Pro Display", sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(String(data.today.total || 0), centerX, centerY + 10)
  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.fillText('今日复习', centerX, centerY + 45)

  // ===== 三栏数据 =====
  const statY = 580
  const statItems = [
    { label: '正确率', value: (data.today.accuracy || 0) + '%', color: '#52c41a' },
    { label: '连续打卡', value: (data.user?.streak_days || 0) + '天', color: '#faad14' },
    { label: '已掌握', value: String(data.total?.mastered || 0), color: '#1890ff' }
  ]

  const colW = W / 3
  statItems.forEach((item, i) => {
    const x = colW * i + colW / 2

    ctx.font = 'bold 44px "PingFang SC", "SF Pro Display", sans-serif'
    ctx.fillStyle = item.color
    ctx.fillText(item.value, x, statY)

    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.fillText(item.label, x, statY + 38)
  })

  // ===== 7日趋势图 =====
  const trendY = 680
  const trendH = 140
  const trendW = W - 120
  const trendX = 60

  // 标题
  ctx.textAlign = 'left'
  ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fillText('最近7日学习趋势', trendX, trendY)

  // 趋势图背景
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
  roundRect(ctx, trendX, trendY + 15, trendW, trendH, 12)
  ctx.fill()

  // 绘制柱状图
  const weeklyData = data.weeklyTrend || []
  const maxCount = Math.max(...weeklyData.map(d => d.count), 10)
  const barW = trendW / 7 * 0.5
  const barGap = trendW / 7

  for (let i = 0; i < 7; i++) {
    const dayData = weeklyData[i]
    const count = dayData?.count || 0
    const barH = Math.max(count / maxCount * (trendH - 50), 4)
    const x = trendX + barGap * i + (barGap - barW) / 2
    const y = trendY + 15 + trendH - 25 - barH

    // 日期标签
    ctx.textAlign = 'center'
    ctx.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    const dayLabel = i === 6 ? '今' : `${7 - i}日前`
    ctx.fillText(dayLabel, x + barW / 2, trendY + 15 + trendH - 5)

    if (count > 0) {
      const barGrad = ctx.createLinearGradient(x, y, x, y + barH)
      barGrad.addColorStop(0, '#667eea')
      barGrad.addColorStop(1, '#764ba2')
      ctx.fillStyle = barGrad
      roundRect(ctx, x, y, barW, barH, 4)
      ctx.fill()
    }
  }

  // ===== 今日学过的单词 =====
  const wordsY = trendY + trendH + 60

  ctx.textAlign = 'left'
  ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fillText('今日学过的单词', 60, wordsY)

  const words = data.todayWords || []
  if (words.length > 0) {
    words.forEach((w, i) => {
      const wy = wordsY + 50 + i * 60
      // 单词
      ctx.font = 'bold 28px "SF Pro Display", "PingFang SC", sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.fillText(w.word, 80, wy)
      // 音标
      if (w.phonetic) {
        ctx.font = '20px "SF Pro Display", sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
        const wordWidth = ctx.measureText(w.word).width
        ctx.fillText(w.phonetic, 80 + wordWidth + 12, wy)
      }
      // 释义
      ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.textAlign = 'right'
      const meaning = w.meaning.length > 12 ? w.meaning.substring(0, 12) + '...' : w.meaning
      ctx.fillText(meaning, W - 80, wy)
    })
  } else {
    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.textAlign = 'center'
    ctx.fillText('今天还没有学习记录，快来背单词吧！', W / 2, wordsY + 60)
  }

  // ===== 底部品牌区 =====
  const footerY = H - 180

  // 分割线
  ctx.beginPath()
  ctx.moveTo(60, footerY)
  ctx.lineTo(W - 60, footerY)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  ctx.stroke()

  // 品牌
  ctx.textAlign = 'center'
  ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fillText('📖 得单词者得天下', W / 2, footerY + 50)

  ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.fillText('dedanci.com', W / 2, footerY + 85)

  // 用户名
  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.fillText(`@${data.user?.username || '学习者'}  Lv.${data.user?.level || 1}`, W / 2, footerY + 125)

  // 生成预览
  previewUrl.value = canvas.toDataURL('image/png')
}

// 辅助：绘制装饰圆
function drawOrb(ctx, x, y, r, color) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
  grad.addColorStop(0, color)
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

// 辅助：圆角矩形
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// 下载图片
const downloadImage = () => {
  if (!previewUrl.value) return
  const a = document.createElement('a')
  a.href = previewUrl.value
  const now = new Date()
  a.download = `得单词打卡_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  ElMessage.success('图片已保存')
}

// 复制链接
const copyLink = () => {
  const text = `我在「得单词者得天下」已连续学习 ${checkinData.value?.user?.streak_days || 0} 天，今日复习 ${checkinData.value?.today?.total || 0} 次，正确率 ${checkinData.value?.today?.accuracy || 0}%！快来一起背单词吧 👉 dedanci.com`
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('链接已复制')
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制')
  })
}
</script>

<style scoped>
.share-card-wrapper {
  display: inline-block;
}

.share-dialog :deep(.el-dialog__body) {
  padding: 16px 20px;
}

.share-preview {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.preview-container {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.preview-image {
  max-width: 100%;
  height: auto;
  display: block;
}

.loading-placeholder {
  width: 300px;
  height: 530px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f5f7fa;
  border-radius: 12px;
  color: #999;
  font-size: 14px;
}

.share-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.share-actions .el-button {
  min-width: 140px;
}

@media (max-width: 768px) {
  .share-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin: 16px auto !important;
  }
  .preview-image {
    max-height: 60vh;
  }
}
</style>
