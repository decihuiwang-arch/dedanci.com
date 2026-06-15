/**
 * 数据库初始化 - dedanci.com
 * 使用 sql.js (纯 JS 实现，无需编译)
 */

import initSqlJs from 'sql.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '../../data/dedanci.db')
let db = null
let SQL = null

/**
 * 初始化数据库
 */
export async function initDatabase() {
  SQL = await initSqlJs()

  // 尝试加载现有数据库
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      last_study_date TEXT,
      settings TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS vocabularies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'custom',
      level TEXT,
      word_count INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 0,
      creator_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      phonetic TEXT,
      pos TEXT,
      meaning TEXT NOT NULL,
      example TEXT,
      example_translation TEXT,
      difficulty INTEGER DEFAULT 5,
      frequency INTEGER DEFAULT 0,
      tags TEXT,
      category TEXT DEFAULT '',
      english_meaning TEXT DEFAULT '',
      phet_sim_id TEXT DEFAULT '',
      phet_context TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 兼容旧数据库：如果缺少新字段则自动添加
  const alterStatements = [
    `ALTER TABLE words ADD COLUMN category TEXT DEFAULT ''`,
    `ALTER TABLE words ADD COLUMN english_meaning TEXT DEFAULT ''`,
    `ALTER TABLE words ADD COLUMN phet_sim_id TEXT DEFAULT ''`,
    `ALTER TABLE words ADD COLUMN phet_context TEXT DEFAULT ''`
  ]
  for (const sql of alterStatements) {
    try { db.run(sql) } catch (e) { /* 字段已存在则忽略 */ }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS vocabulary_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vocabulary_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      UNIQUE(vocabulary_id, word_id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS user_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      vocabulary_id INTEGER,
      state INTEGER DEFAULT 0,
      difficulty REAL DEFAULT 0,
      stability REAL DEFAULT 0,
      last_review INTEGER,
      next_review INTEGER,
      scheduled_days INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      notes TEXT,
      is_starred INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      UNIQUE(user_id, word_id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS study_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      state INTEGER,
      duration_ms INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (word_id) REFERENCES words(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS error_book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      error_count INTEGER DEFAULT 1,
      last_error_at TEXT DEFAULT CURRENT_TIMESTAMP,
      error_types TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      UNIQUE(user_id, word_id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      cache_type TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      UNIQUE(word_id, cache_type)
    )
  `)

  // 成就表
  db.run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT,
      exp_reward INTEGER DEFAULT 0,
      unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, achievement_id)
    )
  `)

  // 保存初始数据库
  saveDatabase()

  console.log('✅ 数据库表初始化完成')
  return db
}

/**
 * 获取数据库实例
 */
export function getDatabase() {
  return db
}

/**
 * 重新加载数据库（从文件同步）
 */
export function reloadDatabase() {
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
    console.log('✅ 数据库已重新加载')
  }
  return db
}

/**
 * 保存数据库到文件
 */
export function saveDatabase() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(dbPath, buffer)
  }
}

/**
 * 关闭数据库
 */
export function closeDatabase() {
  if (db) {
    saveDatabase()
    db.close()
  }
}

// 兼容 better-sqlite3 API 的封装
export function createStatement(db, sql) {
  return {
    run: (...params) => {
      db.run(sql, params)
      return { changes: db.getRowsModified(), lastInsertRowid: getLastInsertRowId(db) }
    },
    get: (...params) => {
      const result = db.exec(sql, params)
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns
        const values = result[0].values[0]
        const obj = {}
        columns.forEach((col, i) => {
          obj[col] = values[i]
        })
        return obj
      }
      return undefined
    },
    all: (...params) => {
      const result = db.exec(sql, params)
      if (result.length > 0) {
        const columns = result[0].columns
        return result[0].values.map(values => {
          const obj = {}
          columns.forEach((col, i) => {
            obj[col] = values[i]
          })
          return obj
        })
      }
      return []
    }
  }
}

function getLastInsertRowId(db) {
  const result = db.exec('SELECT last_insert_rowid() as id')
  return result[0]?.values[0]?.[0] || 0
}

export default { initDatabase, getDatabase, saveDatabase, closeDatabase, createStatement }
