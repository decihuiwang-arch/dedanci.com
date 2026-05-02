# 得单词者得天下 - dedanci.com

智能背单词系统，基于 FSRS 算法 + 千问 API

## 项目结构

```
dedanci.com/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── index.js        # 入口文件
│   │   ├── database/
│   │   │   └── init.js     # 数据库初始化
│   │   ├── routes/
│   │   │   ├── study.js    # 学习路由（核心）
│   │   │   ├── vocabulary.js # 词库路由
│   │   │   └── ai.js       # AI 服务路由
│   │   ├── services/
│   │   │   └── qwen.js     # 千问 API 服务
│   │   └── utils/
│   │       └── fsrs.js     # FSRS 算法实现
│   ├── data/               # SQLite 数据库
│   ├── .env                # 环境变量
│   └── package.json
│
└── frontend/               # 前端服务
    ├── src/
    │   ├── main.js
    │   ├── App.vue
    │   ├── router/
    │   │   └── index.js
    │   └── views/
    │       ├── Study.vue      # 背单词（核心）
    │       ├── Vocabularies.vue # 词库管理
    │       ├── Stats.vue      # 统计
    │       └── ErrorBook.vue  # 错题本
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 技术栈

- **前端**: Vue 3 + Vite + Element Plus
- **后端**: Node.js + Express + SQLite
- **算法**: FSRS-4.5 (Free Spaced Repetition Scheduler)
- **AI**: 阿里云千问 API (qwen-plus)

## 核心功能

### 1. FSRS 记忆算法
- 智能计算复习间隔
- 4 级评分：不认识/困难/良好/简单
- 动态调整难度参数

### 2. AI 智能功能
- 单词解析（词根/记忆技巧/搭配/同义词）
- 真题例句生成
- 错题智能分析
- 记忆口诀生成

### 3. 学习管理
- 词库管理
- 学习统计
- 错题本
- 连续学习天数

## 快速开始

### 后端

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 填入 QWEN_API_KEY

npm start
# 服务运行在 http://localhost:5000
```

### 前端

```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:3002
```

## API 文档

### 学习模块

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/study/today | GET | 获取今日学习任务 |
| /api/study/review | POST | 提交复习结果 |
| /api/study/preview | POST | 预览复习间隔 |
| /api/study/stats | GET | 获取学习统计 |

### 词库模块

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/vocabularies | GET | 获取词库列表 |
| /api/vocabularies | POST | 创建词库 |
| /api/vocabularies/extract | POST | 从文本提取生词 |

### AI 模块

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/ai/analyze/:word | GET | 智能单词解析 |
| /api/ai/examples/:word | GET | 生成例句 |
| /api/ai/memory/:word | GET | 生成记忆口诀 |
| /api/ai/analyze-errors | POST | 错题分析 |

## 数据库设计

### 核心表

- **users**: 用户表
- **vocabularies**: 词库表
- **words**: 单词表
- **user_cards**: 用户学习卡片（FSRS 参数）
- **study_logs**: 学习记录
- **error_book**: 错题本
- **ai_cache**: AI 缓存

## 下一步开发

1. [ ] 用户登录/注册
2. [ ] 词库导入（支持 Anki .apkg）
3. [ ] 发音功能
4. [ ] 移动端适配
5. [ ] 学习报告导出

## License

MIT
