<template>
  <div class="home-page">
    <!-- 导航栏 -->
    <header class="hero-nav">
      <div class="nav-inner">
        <div class="nav-logo">
          <span class="logo-icon">📖</span>
          <span class="logo-text">得单词者得天下</span>
        </div>
        <div class="nav-links">
          <a href="#features">功能</a>
          <a href="#how-it-works">原理</a>
          <router-link to="/study" class="btn-start">开始学习</router-link>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-bg">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
      </div>
      <div class="hero-content">
        <div class="hero-badge">🚀 2026 最智能的背单词工具</div>
        <h1 class="hero-title">
          <span class="title-line">AI 驱动 · 科学记忆</span>
          <span class="title-highlight">得单词者得天下</span>
        </h1>
        <p class="hero-subtitle">
          全球最先进的 FSRS-4.5 记忆算法 × AI 智能解析 × 互动仿真实验<br>
          比传统艾宾浩斯记忆效率提升 <strong>3 倍</strong>
        </p>
        <div class="hero-cta">
          <router-link to="/study" class="cta-primary">
            免费开始学习
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </router-link>
          <a href="#features" class="cta-secondary">了解更多 ↓</a>
        </div>
        <div class="hero-stats">
          <div class="stat"><span class="stat-num">10,000+</span><span class="stat-label">核心词汇</span></div>
          <div class="stat-divider"></div>
          <div class="stat"><span class="stat-num">3×</span><span class="stat-label">记忆效率</span></div>
          <div class="stat-divider"></div>
          <div class="stat"><span class="stat-num">7合1</span><span class="stat-label">学习模式</span></div>
        </div>
      </div>

      <div class="hero-visual">
        <div class="screen-mockup">
          <div class="mockup-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></div>
          <div class="mockup-body">
            <div class="mock-card">
              <div class="mock-word">ephemeral</div>
              <div class="mock-phonetic">/ɪˈfem.ər.əl/</div>
              <div class="mock-meaning">短暂的，转瞬即逝的</div>
              <div class="mock-tags"><span>六级高频</span><span>考研核心</span></div>
            </div>
            <div class="mock-features">
              <div class="mf active"><span>🧠</span>AI 解析</div>
              <div class="mf"><span>🔬</span>互动模拟</div>
              <div class="mf"><span>🎤</span>口语评分</div>
              <div class="mf"><span>🤖</span>学习助手</div>
              <div class="mf"><span>📊</span>学习报告</div>
              <div class="mf"><span>🏆</span>排行榜</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 核心功能 -->
    <section class="features" id="features">
      <div class="section-header">
        <div class="section-badge">四大核心引擎</div>
        <h2 class="section-title">为什么选择得单词？</h2>
        <p class="section-subtitle">全球唯一集成 FSRS + AI + 仿真 + 口语的背单词平台</p>
      </div>
      <div class="feature-grid">
        <div class="feature-card featured">
          <div class="fi-wrap g1"><span class="fe">🧠</span></div>
          <h3>FSRS-4.5 记忆引擎</h3>
          <p>全球最先进的间隔重复算法，比传统艾宾浩斯精确 3 倍。精准预测遗忘临界点，在最需要时推送复习。</p>
          <div class="fd"><span class="db">领先竞品</span><span>墨墨/扇贝仍在使用旧版艾宾浩斯</span></div>
        </div>
        <div class="feature-card">
          <div class="fi-wrap g2"><span class="fe">🔬</span></div>
          <h3>互动仿真实验</h3>
          <p>学 "gravity" 时模拟重力，学 "oscillation" 时看弹簧振子。交互式可视化深度理解词义。</p>
          <div class="fd"><span class="db green">独家</span><span>竞品完全没有的沉浸式体验</span></div>
        </div>
        <div class="feature-card">
          <div class="fi-wrap g3"><span class="fe">🎤</span></div>
          <h3>AI 口语评分</h3>
          <p>跟读单词即刻评分，多引擎自动降级保障。精确到音素级反馈，练就地道发音。</p>
          <div class="fd"><span class="db green">独家</span><span>传统 App 只能听不能练</span></div>
        </div>
        <div class="feature-card">
          <div class="fi-wrap g4"><span class="fe">📝</span></div>
          <h3>AI 真题出题</h3>
          <p>每个单词都能生成四六级/考研/雅思真题风格选择题，即时批改+详细解析。</p>
          <div class="fd"><span class="db green">独家</span><span>其他 App 只有固定题库</span></div>
        </div>
        <div class="feature-card">
          <div class="fi-wrap g5"><span class="fe">🤖</span></div>
          <h3>AI 学习助手</h3>
          <p>智能复习建议 + 个性化学习计划 + 单词问答。AI 实时分析你的学习数据，给出最优策略。</p>
          <div class="fd"><span class="db green">独家</span><span>你的 24 小时私教</span></div>
        </div>
        <div class="feature-card">
          <div class="fi-wrap g6"><span class="fe">📊</span></div>
          <h3>数据可视化 + 学习报告</h3>
          <p>趋势图、掌握分布、时段分析、效率追踪。一键生成 AI 学习报告，精准定位薄弱点。</p>
          <div class="fd"><span class="db green">独家</span><span>竞品只有简单的数字统计</span></div>
        </div>
        <div class="feature-card">
          <div class="fi-wrap g7"><span class="fe">🏆</span></div>
          <h3>排行榜 & 社交竞争</h3>
          <p>连续打卡、今日学习、累计掌握、经验等级四大维度排行。与全球学习者同台竞技。</p>
          <div class="fd"><span class="db">竞争力</span><span>用社交驱动力保持学习动力</span></div>
        </div>
      </div>
    </section>

    <!-- 工作原理 -->
    <section class="how-it-works" id="how-it-works">
      <div class="section-header">
        <div class="section-badge">科学原理</div>
        <h2 class="section-title">FSRS 如何帮你记住？</h2>
        <p class="section-subtitle">基于数千名学习者大数据训练，精准建模你的记忆曲线</p>
      </div>
      <div class="steps">
        <div class="step"><div class="sn">1</div><h3>学习新词</h3><p>翻卡查看释义，AI 即时解析词根词缀、搭配用法</p></div>
        <div class="step-arrow">→</div>
        <div class="step"><div class="sn">2</div><h3>自评记忆</h3><p>4 级评分：不认识/困难/良好/简单，算法实时调整</p></div>
        <div class="step-arrow">→</div>
        <div class="step"><div class="sn">3</div><h3>精准复习</h3><p>FSRS 在遗忘临界点推送，不早不晚效率最高</p></div>
        <div class="step-arrow">→</div>
        <div class="step"><div class="sn">4</div><h3>深度掌握</h3><p>口语练习 + 真题测试 + 仿真实验，多维度巩固</p></div>
      </div>
    </section>

    <!-- 竞品对比 -->
    <section class="comparison">
      <div class="section-header">
        <div class="section-badge">竞品对比</div>
        <h2 class="section-title">得单词 vs 其他 App</h2>
      </div>
      <div class="compare-table">
        <div class="ct-header">
          <div class="ct-feature">功能</div>
          <div class="ct-app highlight">得单词</div>
          <div class="ct-app">墨墨</div>
          <div class="ct-app">百词斩</div>
          <div class="ct-app">不背单词</div>
        </div>
        <div class="ct-row">
          <div class="ct-feature">记忆算法</div>
          <div class="ct-cell highlight"><span class="badge best">FSRS-4.5</span></div>
          <div class="ct-cell">艾宾浩斯</div>
          <div class="ct-cell">艾宾浩斯</div>
          <div class="ct-cell">艾宾浩斯</div>
        </div>
        <div class="ct-row">
          <div class="ct-feature">AI 真题出题</div>
          <div class="ct-cell highlight"><span class="check">✓</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
        </div>
        <div class="ct-row">
          <div class="ct-feature">AI 口语评分</div>
          <div class="ct-cell highlight"><span class="check">✓</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
        </div>
        <div class="ct-row">
          <div class="ct-feature">互动仿真实验</div>
          <div class="ct-cell highlight"><span class="check">✓</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
        </div>
        <div class="ct-row">
          <div class="ct-feature">图背单词</div>
          <div class="ct-cell highlight"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="check">✓</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
        </div>
        <div class="ct-row">
          <div class="ct-feature">AI 学习助手</div>
          <div class="ct-cell highlight"><span class="check">✓</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
        </div>
        <div class="ct-row">
          <div class="ct-feature">AI 学习报告</div>
          <div class="ct-cell highlight"><span class="check">✓</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
          <div class="ct-cell"><span class="cross">✗</span></div>
        </div>
        <div class="ct-row">
          <div class="ct-feature">数据可视化</div>
          <div class="ct-cell highlight"><span class="badge best">专业级</span></div>
          <div class="ct-cell">基础</div>
          <div class="ct-cell">基础</div>
          <div class="ct-cell">基础</div>
        </div>
        <div class="ct-row">
          <div class="ct-feature">免费额度</div>
          <div class="ct-cell highlight"><span class="badge free">全功能免费</span></div>
          <div class="ct-cell">限600词</div>
          <div class="ct-cell">限2词库</div>
          <div class="ct-cell">限1500词</div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="cta-content">
        <h2>现在开始，免费体验</h2>
        <p>无需下载 App，打开浏览器即可学习。支持手机、平板、电脑。</p>
        <router-link to="/study" class="cta-primary large">
          立即开始背单词
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="logo-icon">📖</span>
          <span>得单词者得天下</span>
        </div>
        <div class="footer-links">
          <router-link to="/study">开始学习</router-link>
          <router-link to="/vocabularies">词库</router-link>
          <a href="https://dedanci.com" target="_blank">dedanci.com</a>
        </div>
        <div class="footer-copy">© 2026 dedanci.com · 基于 FSRS-4.5 算法</div>
      </div>
    </footer>
  </div>
</template>

<script setup>
</script>

<style scoped>
/* === 基础 === */
.home-page {
  min-height: 100vh;
  background: #0a0a1a;
  color: #e0e0e0;
  overflow-x: hidden;
}

/* === 导航 === */
.hero-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  backdrop-filter: blur(20px);
  background: rgba(10, 10, 26, 0.8);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-icon { font-size: 24px; }
.logo-text { font-size: 18px; font-weight: 700; color: #fff; }
.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
}
.nav-links a {
  color: #aaa;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}
.nav-links a:hover { color: #fff; }
.btn-start {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff !important;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
}
.btn-start:hover { opacity: 0.9; }

/* === Hero === */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 24px 60px;
  position: relative;
}
.hero-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
}
.orb-1 { width: 600px; height: 600px; background: #667eea; top: -200px; left: -200px; }
.orb-2 { width: 400px; height: 400px; background: #764ba2; bottom: -100px; right: -100px; }
.orb-3 { width: 300px; height: 300px; background: #1890ff; top: 50%; left: 50%; transform: translate(-50%, -50%); }

.hero-content {
  flex: 1;
  z-index: 1;
}
.hero-badge {
  display: inline-block;
  background: rgba(102, 126, 234, 0.15);
  border: 1px solid rgba(102, 126, 234, 0.3);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: #a0b0ff;
  margin-bottom: 24px;
}
.hero-title {
  margin-bottom: 20px;
}
.title-line {
  display: block;
  font-size: 20px;
  color: #999;
  font-weight: 400;
  letter-spacing: 4px;
  margin-bottom: 8px;
}
.title-highlight {
  display: block;
  font-size: 52px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff 0%, #a0b0ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}
.hero-subtitle {
  font-size: 17px;
  color: #888;
  line-height: 1.8;
  margin-bottom: 32px;
}
.hero-subtitle strong { color: #a0b0ff; }
.hero-cta {
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
}
.cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
}
.cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 28px rgba(102, 126, 234, 0.5);
}
.cta-primary.large { padding: 16px 40px; font-size: 18px; }
.cta-secondary {
  display: inline-flex;
  align-items: center;
  color: #aaa;
  text-decoration: none;
  padding: 14px 24px;
  font-size: 16px;
  transition: color 0.2s;
}
.cta-secondary:hover { color: #fff; }

.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}
.stat { text-align: center; }
.stat-num { display: block; font-size: 28px; font-weight: 800; color: #fff; }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }
.stat-divider { width: 1px; height: 36px; background: rgba(255,255,255,0.1); }

/* Mockup */
.hero-visual {
  flex: 1;
  z-index: 1;
  perspective: 1000px;
}
.screen-mockup {
  background: #1a1a2e;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  transform: rotateY(-5deg) rotateX(3deg);
  transition: transform 0.4s;
}
.screen-mockup:hover { transform: rotateY(0deg) rotateX(0deg); }
.mockup-bar {
  padding: 12px 16px;
  display: flex;
  gap: 6px;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.r { background: #ff5f57; }
.dot.y { background: #ffbd2e; }
.dot.g { background: #28c840; }
.mockup-body { padding: 24px; }
.mock-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
}
.mock-word { font-size: 28px; font-weight: 800; color: #333; }
.mock-phonetic { font-size: 14px; color: #999; margin: 4px 0 8px; }
.mock-meaning { font-size: 16px; color: #666; }
.mock-tags { margin-top: 12px; display: flex; gap: 6px; justify-content: center; }
.mock-tags span {
  background: #e6f7ff;
  color: #1890ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.mock-features { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.mf {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  font-size: 13px;
  color: #888;
  border: 1px solid transparent;
}
.mf.active {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
  color: #a0b0ff;
}

/* === 功能区 === */
.features {
  padding: 100px 24px;
  max-width: 1200px;
  margin: 0 auto;
}
.section-header { text-align: center; margin-bottom: 60px; }
.section-badge {
  display: inline-block;
  background: rgba(102, 126, 234, 0.12);
  border: 1px solid rgba(102, 126, 234, 0.25);
  padding: 4px 14px;
  border-radius: 16px;
  font-size: 12px;
  color: #a0b0ff;
  margin-bottom: 16px;
}
.section-title {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 12px;
}
.section-subtitle { font-size: 16px; color: #666; }

.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.feature-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 28px;
  transition: all 0.3s;
}
.feature-card:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-4px);
}
.feature-card.featured {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
  border-color: rgba(102, 126, 234, 0.2);
}
.fi-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.g1 { background: linear-gradient(135deg, #667eea, #764ba2); }
.g2 { background: linear-gradient(135deg, #11998e, #38ef7d); }
.g3 { background: linear-gradient(135deg, #ee0979, #ff6a00); }
.g4 { background: linear-gradient(135deg, #2193b0, #6dd5ed); }
.g5 { background: linear-gradient(135deg, #f093fb, #f5576c); }
.g6 { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.g7 { background: linear-gradient(135deg, #fa709a, #fee140); }
.fe { font-size: 24px; }
.feature-card h3 { font-size: 20px; color: #fff; margin-bottom: 8px; }
.feature-card p { font-size: 14px; color: #888; line-height: 1.7; margin-bottom: 16px; }
.fd { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #666; }
.db {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(102, 126, 234, 0.15);
  color: #a0b0ff;
}
.db.green { background: rgba(82, 196, 26, 0.15); color: #73d13d; }

/* === 原理 === */
.how-it-works {
  padding: 100px 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.steps {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.step {
  flex: 1;
  min-width: 180px;
  text-align: center;
  padding: 24px 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
}
.sn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 16px;
  margin: 0 auto 12px;
  color: #fff;
}
.step h3 { font-size: 16px; color: #fff; margin-bottom: 6px; }
.step p { font-size: 13px; color: #888; line-height: 1.6; }
.step-arrow { color: #444; font-size: 24px; padding-top: 40px; }

/* === 竞品对比 === */
.comparison {
  padding: 100px 24px;
  max-width: 900px;
  margin: 0 auto;
}
.compare-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}
.ct-header, .ct-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr;
  align-items: center;
}
.ct-header {
  background: rgba(102, 126, 234, 0.08);
  font-weight: 600;
  font-size: 14px;
  color: #aaa;
}
.ct-row {
  border-top: 1px solid rgba(255,255,255,0.04);
  font-size: 14px;
  transition: background 0.2s;
}
.ct-row:hover { background: rgba(255,255,255,0.02); }
.ct-header > div, .ct-row > div {
  padding: 14px 16px;
}
.ct-feature { color: #aaa; }
.ct-cell { text-align: center; color: #888; }
.ct-cell.highlight { color: #a0b0ff; font-weight: 600; }
.ct-app.highlight { color: #a0b0ff; text-align: center; }
.ct-app { text-align: center; }
.check { color: #52c41a; font-weight: bold; font-size: 18px; }
.cross { color: #444; font-size: 16px; }
.badge.best {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
}
.badge.free {
  background: rgba(82, 196, 26, 0.15);
  color: #73d13d;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
}

/* === CTA === */
.cta-section {
  padding: 100px 24px;
  text-align: center;
  background: linear-gradient(180deg, transparent 0%, rgba(102, 126, 234, 0.05) 100%);
}
.cta-content h2 { font-size: 36px; color: #fff; margin-bottom: 12px; }
.cta-content p { font-size: 16px; color: #888; margin-bottom: 32px; }

/* === Footer === */
.site-footer {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 40px 24px;
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.footer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}
.footer-links {
  display: flex;
  gap: 24px;
}
.footer-links a {
  color: #666;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}
.footer-links a:hover { color: #fff; }
.footer-copy { font-size: 13px; color: #444; }

/* === 移动端 === */
@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    padding-top: 80px;
    gap: 40px;
    text-align: center;
  }
  .hero-content { order: 2; }
  .hero-visual { order: 1; width: 100%; }
  .title-highlight { font-size: 36px; }
  .title-line { font-size: 16px; }
  .hero-cta { justify-content: center; flex-wrap: wrap; }
  .hero-stats { justify-content: center; }
  .feature-grid { grid-template-columns: 1fr; }
  .feature-card.featured { grid-column: 1; }
  .section-title { font-size: 28px; }
  .steps { flex-direction: column; align-items: center; }
  .step-arrow { transform: rotate(90deg); padding: 0; }
  .compare-table { font-size: 12px; overflow-x: auto; }
  .ct-header, .ct-row { grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr; min-width: 500px; }
  .footer-inner { flex-direction: column; text-align: center; }
  .screen-mockup { transform: none; }
  .cta-primary.large { padding: 14px 32px; font-size: 16px; }
}
</style>
