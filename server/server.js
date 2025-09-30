// server.js - نسخهٔ نهایی با تنظیمات CORS و سرو استاتیک دقیق و رفع خطای ORB
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

// -----------------------------
// Static files
// expose /api/static/* -> PUBLIC_DIR
// also expose root static for other assets
// -----------------------------

// Ensure preflight OPTIONS for static route and add CORS headers for these responses
app.options('/api/static', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_CLIENT_ORIGIN || 'https://quiz-app-client-bwgb.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.sendStatus(204);
});

// For any request to /api/static, attach CORS headers so PDF/image requests from client won't be blocked
app.use('/api/static', (req, res, next) => {
  const origin = process.env.ALLOWED_CLIENT_ORIGIN || 'https://quiz-app-client-bwgb.onrender.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  // مهم برای رفع خطای ORB هنگام لود تصاویر در مرورگر
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  next();
});

// Serve static
app.use('/api/static', express.static(PUBLIC_DIR));
app.use(express.static(PUBLIC_DIR));

// -----------------------------
// Body parser
// -----------------------------
app.use(express.json());

// -----------------------------
// Global CORS for API endpoints (controlled origins)
// -----------------------------
const allowedOrigins = [
  process.env.ALLOWED_CLIENT_ORIGIN || "https://quiz-app-client-bwgb.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost"
];

const ALLOWED_CLIENT_ORIGIN = process.env.ALLOWED_CLIENT_ORIGIN || '*';
app.use(cors({
  origin: ALLOWED_CLIENT_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// extra headers for all responses (API)
app.use((req, res, next) => {
  const origin = process.env.ALLOWED_CLIENT_ORIGIN || '*';
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  next();
});

// -----------------------------
// PostgreSQL init (if DATABASE_URL is set)
// -----------------------------
let pool = null;
async function initPostgres() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL not set — using local JSON files for submissions.');
    return;
  }

  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await pool.query('SELECT 1');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS submissions (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        quiz_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        answers JSONB NOT NULL,
        time TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;
    await pool.query(createTableSQL);
    console.log('✅ Connected to PostgreSQL and ensured submissions table exists.');
  } catch (err) {
    console.error('❌ PostgreSQL init error:', err);
    pool = null;
  }
}

// -----------------------------
// Helper read JSON
// -----------------------------
async function readJSON(filePath, defaultValue = null) {
  try {
    const txt = await fs.readFile(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    return defaultValue;
  }
}

// -----------------------------
// authorize role middleware
// -----------------------------
function authorizeRole(requiredRole) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'توکن وارد نشده است' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== requiredRole) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(403).json({ error: 'توکن نامعتبر است' });
    }
  };
}

// -----------------------------
// Admin login
// -----------------------------
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  let role = null;

  if (username === process.env.SUPER_ADMIN_USERNAME && password === process.env.SUPER_ADMIN_PASSWORD) {
    role = 'SUPER_ADMIN';
  } else if (username === process.env.VIEW_ONLY_USERNAME && password === process.env.VIEW_ONLY_PASSWORD) {
    role = 'VIEW_ONLY';
  } else {
    return res.status(401).json({ success: false, message: 'نام کاربری یا رمز اشتباه است' });
  }

  const token = jwt.sign({ role, username }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ success: true, token, role });
});

// -----------------------------
// GET questions
// -----------------------------
app.get('/api/questions/:quizId', async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const filePath = path.join(DATA_DIR, `${quizId}.json`);
    const quiz = await readJSON(filePath, null);

    if (!quiz) return res.status(404).json({ error: 'quiz not found' });

    res.json(quiz);
  } catch (err) {
    console.error('/api/questions error:', err);
    res.status(500).json({ error: 'خطا در خواندن آزمون' });
  }
});

// -----------------------------
// POST submit
// -----------------------------
app.post('/api/submit', async (req, res) => {
  try {
    const { name, quizId, answers } = req.body;
    if (!name || !quizId || !answers) {
      return res.status(400).json({ error: 'invalid payload' });
    }

    const filePath = path.join(DATA_DIR, `${quizId}.json`);
    const quizData = await readJSON(filePath, null);

    if (!quizData) {
      console.error('[submit] quiz not found:', filePath);
      return res.status(404).json({ error: 'quiz not found' });
    }

    // normalize questions array
    let questions = [];
    if (Array.isArray(quizData)) {
      questions = quizData;
    } else if (quizData.questions && Array.isArray(quizData.questions)) {
      const base = quizData.questions;
      const count = typeof quizData.count === 'number' ? quizData.count : base.length;
      const out = [];
      for (let i = 0; i < count; i++) {
        const src = base[i] || {};
        out.push({
          id: src.id ?? (i + 1),
          question: src.question ?? `سوال شماره ${i + 1}`,
          options: src.options ?? ['الف', 'ب', 'ج', 'د'],
          correct: src.correct ?? undefined
        });
      }
      questions = out;
    } else {
      console.error('[submit] unsupported quiz format:', typeof quizData);
      return res.status(500).json({ error: 'Invalid quiz format' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('[submit] questions invalid or empty');
      return res.status(500).json({ error: 'Invalid quiz questions' });
    }

    // scoring
    let score = 0;
    for (const q of questions) {
      const qid = String(q.id);
      const correct = q.correct;
      const userAns = answers[qid] ?? answers[q.id] ?? answers[Number(q.id)];
      if (typeof correct !== 'undefined' && userAns != null && String(userAns) === String(correct)) {
        score++;
      }
    }
    const total = questions.length;

    // save
    if (pool) {
      const insertSQL = `
        INSERT INTO submissions(name, quiz_id, score, total, answers)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING id, time;
      `;
      const vals = [name, quizId, score, total, JSON.stringify(answers)];
      const r = await pool.query(insertSQL, vals);
      const inserted = r.rows[0];
      return res.json({ score, total, id: inserted.id, time: inserted.time });
    } else {
      if (!fsSync.existsSync(DATA_DIR)) {
        fsSync.mkdirSync(DATA_DIR, { recursive: true });
      }
      const subsPath = path.join(DATA_DIR, 'submissions.json');
      let subs = await readJSON(subsPath, []);
      if (!Array.isArray(subs)) subs = [];

      const record = {
        id: Date.now(),
        name,
        quizId,
        score,
        total,
        answers,
        time: new Date().toISOString()
      };

      subs.push(record);
      await fs.writeFile(subsPath, JSON.stringify(subs, null, 2), 'utf8');
      return res.json({ score, total, id: record.id, time: record.time });
    }
  } catch (err) {
    console.error('Error saving submission:', err);
    return res.status(500).json({ error: 'خطا در ذخیره‌سازی نتیجه' });
  }
});

// -----------------------------
// GET results (with quizTitle)
// -----------------------------
app.get('/api/results', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'توکن وارد نشده است' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!['SUPER_ADMIN', 'VIEW_ONLY'].includes(decoded.role)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    const getQuizTitle = async (quizId) => {
      const filePath = path.join(DATA_DIR, `${quizId}.json`);
      try {
        const data = await readJSON(filePath, null);
        return data?.title || quizId;
      } catch {
        return quizId;
      }
    };

    let results = [];
    if (pool) {
      const q = `SELECT id, name, quiz_id AS "quizId", score, total, answers, time FROM submissions ORDER BY time DESC;`;
      const r = await pool.query(q);
      results = await Promise.all(r.rows.map(async row => ({
        id: row.id,
        name: row.name,
        quizId: row.quizId,
        quizTitle: await getQuizTitle(row.quizId),
        score: row.score,
        total: row.total,
        answers: row.answers,
        time: row.time instanceof Date ? row.time.toISOString() : row.time
      })));
    } else {
      const subsPath = path.join(DATA_DIR, 'submissions.json');
      const submissions = await readJSON(subsPath, []);
      results = await Promise.all((Array.isArray(submissions) ? submissions : []).map(async row => ({
        ...row,
        quizTitle: await getQuizTitle(row.quizId)
      })));
    }

    return res.json(results);
  } catch (err) {
    console.error('Error fetching results:', err);
    return res.status(403).json({ error: 'توکن نامعتبر یا خطا در سرور' });
  }
});

// -----------------------------
// GET result detail
// -----------------------------
app.get('/api/results/:id', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'توکن وارد نشده است' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['SUPER_ADMIN', 'VIEW_ONLY'].includes(decoded.role)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    if (pool) {
      const idParam = req.params.id;
      const q = `SELECT id, name, quiz_id AS "quizId", score, total, answers, time FROM submissions WHERE id = $1 LIMIT 1;`;
      const r = await pool.query(q, [idParam]);
      if (r.rowCount === 0) return res.status(404).json({ error: 'submission not found' });

      const submission = {
        ...r.rows[0],
        time: r.rows[0].time instanceof Date ? r.rows[0].time.toISOString() : r.rows[0].time
      };

      const quizPath = path.join(DATA_DIR, `${submission.quizId}.json`);
      const quiz = await readJSON(quizPath, []);
      return res.json({ submission, quiz });
    } else {
      const subsPath = path.join(DATA_DIR, 'submissions.json');
      const submissions = await readJSON(subsPath, []);
      const submission = submissions.find(s => String(s.id) === req.params.id);
      if (!submission) return res.status(404).json({ error: 'submission not found' });

      const quizPath = path.join(DATA_DIR, `${submission.quizId}.json`);
      const quiz = await readJSON(quizPath, []);
      return res.json({ submission, quiz });
    }
  } catch (err) {
    console.error('Error fetching submission detail:', err);
    return res.status(403).json({ error: 'توکن نامعتبر است' });
  }
});

// -----------------------------
// Create quiz (SUPER_ADMIN)
// -----------------------------
app.post('/api/quiz/create', authorizeRole('SUPER_ADMIN'), async (req, res) => {
  const body = req.body;

  if (!body || !body.quizId) {
    return res.status(400).json({ error: 'اطلاعات آزمون معتبر نیست (نیاز به quizId)' });
  }

  const quizId = body.quizId;
  const filePath = path.join(DATA_DIR, `${quizId}.json`);
  let toWrite = body.content ?? body.questions ?? body;

  if (Array.isArray(toWrite)) {
    toWrite = { title: body.title || quizId, questions: toWrite };
  } else if (typeof toWrite === 'object') {
    if (!toWrite.title) toWrite.title = body.title || quizId;
  }

  try {
    await fs.writeFile(filePath, JSON.stringify(toWrite, null, 2), 'utf8');
    res.json({ success: true, message: 'آزمون با موفقیت ساخته شد' });
  } catch (err) {
    console.error('Error creating quiz file:', err);
    res.status(500).json({ error: 'خطا در ذخیره فایل آزمون' });
  }
});

// -----------------------------
// List quizzes
// -----------------------------
app.get('/api/quizzes', async (req, res) => {
  try {
    let files = [];
    try { files = await fs.readdir(DATA_DIR); } catch (e) { files = []; }
    if (!files || files.length === 0) {
      try { files = await fs.readdir(__dirname); } catch (e) { files = []; }
    }
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'submissions.json');

    const quizzes = [];
    for (const file of jsonFiles) {
      const filePath = path.join(DATA_DIR, file);
      const data = await readJSON(filePath, null);
      if (data) {
        quizzes.push({
          id: path.basename(file, '.json'),
          title: data.title || path.basename(file, '.json')
        });
      }
    }

    res.json(quizzes);
  } catch (err) {
    console.error('Error reading quizzes:', err);
    res.status(500).json({ error: 'خطا در خواندن لیست آزمون‌ها' });
  }
});

// -----------------------------
// Ensure data folder & submissions file
// -----------------------------
async function ensureDataFiles() {
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
  }
  const subsPath = path.join(DATA_DIR, 'submissions.json');
  if (!fsSync.existsSync(subsPath)) {
    await fs.writeFile(subsPath, '[]', 'utf8');
  }
}

// -----------------------------
// Start app
// -----------------------------
ensureDataFiles()
  .then(() => initPostgres())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Startup error:', err);
    process.exit(1);
  });
