// جایگزین کامل server.js — only replace your server.js with this content
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const { Pool } = require('pg'); // برای PostgreSQL

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

// سرو فایل‌های استاتیک: هم به روت اصلی و هم مسیر /api/static (برای سازگاری)
app.use('/api/static', express.static(PUBLIC_DIR));
app.use(express.static(PUBLIC_DIR));

const ADMIN_SECRET = process.env.ADMIN_SECRET;

/* ---------------------------
   اتصال به PostgreSQL در صورت موجود بودن DATABASE_URL
--------------------------- */
let pool = null;
async function initPostgres() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL not set — using local JSON files for submissions.');
    return;
  }

  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
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

/* ---------------------------
   فعال کردن JSON و هدرهای استاتیک
--------------------------- */
app.use(express.json());

/* ---------------------------
   تنظیمات CORS
--------------------------- */
const allowedOrigins = [
  "https://quiz-app-client-bwgb.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  // فقط هدرهایی که لازم است
  res.setHeader("Access-Control-Allow-Origin", "https://quiz-app-client-bwgb.onrender.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  next();
});

/* ---------------------------
   تابع خواندن فایل JSON
--------------------------- */
async function readJSON(filePath, defaultValue = null) {
  try {
    const txt = await fs.readFile(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    return defaultValue;
  }
}

/* ---------------------------
   Middleware برای بررسی نقش
--------------------------- */
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

/* ---------------------------
   مسیر لاگین
--------------------------- */
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

/* ---------------------------
   گرفتن سوالات آزمون (کاربر عادی)
--------------------------- */
app.get('/api/questions/:quizId', async (req, res) => {
  const quizId = req.params.quizId;
  const filePath = path.join(DATA_DIR, `${quizId}.json`);
  const quiz = await readJSON(filePath, null);

  if (!quiz) return res.status(404).json({ error: 'quiz not found' });

  res.json(quiz);
});

/* ---------------------------
   ذخیره نتایج آزمون
   - پشتیبانی از: آرایه قدیمی، شیء با questions (PDF-mode)، و ساختن placeholder برای count
   - مقاوم در برابر خطا (try/catch) و لاگ‌گذاری
--------------------------- */
app.post('/api/submit', async (req, res) => {
  try {
    const { name, quizId, answers } = req.body;
    if (!name || !quizId || !answers) {
      return res.status(400).json({ error: 'invalid payload' });
    }

    const filePath = path.join(DATA_DIR, `${quizId}.json`);
    console.log('[submit] quizId:', quizId, 'filePath:', filePath);

    const quizData = await readJSON(filePath, null);
    if (!quizData) {
      console.error('[submit] quiz file not found or invalid JSON:', filePath);
      return res.status(404).json({ error: 'quiz not found' });
    }

    // تعیین آرایه سوالات بر اساس ساختارهای ممکن
    let questions = [];

    if (Array.isArray(quizData)) {
      // حالت قدیمی: کل فایل یک آرایه سوال است
      questions = quizData;
    } else if (quizData.questions && Array.isArray(quizData.questions)) {
      // حالت جدید: شیء دارای فیلد questions است (ممکن است کوتاه‌تر از count باشد)
      // در حالت PDF-mode ممکن است فقط id و correct موجود باشد
      const base = quizData.questions;
      const count = typeof quizData.count === 'number' ? quizData.count : base.length;

      // اگر base طولش کمتر از count است، placeholder بساز
      const out = [];
      for (let i = 0; i < count; i++) {
        const src = base[i] || {};
        // هر آیتم خروجی باید حداقل id و (اختیاری) correct داشته باشد
        out.push({
          id: src.id ?? (i + 1),
          question: src.question ?? `سوال شماره ${i + 1}`,
          options: src.options ?? ['الف', 'ب', 'ج', 'د'],
          correct: src.correct ?? undefined
        });
      }
      questions = out;
    } else {
      console.error('[submit] unsupported quiz format:', typeof quizData, quizData);
      return res.status(500).json({ error: 'Invalid quiz format' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('[submit] questions array invalid or empty:', questions);
      return res.status(500).json({ error: 'Invalid quiz questions' });
    }

    // محاسبه نمره — کلیدهای answers ممکنه رشته باشن/عددی؛ ما با String تطبیق می‌دیم
    let score = 0;
    for (const q of questions) {
      const qid = String(q.id);
      const correct = q.correct;
      const userAns = answers[qid] ?? answers[q.id] ?? answers[Number(q.id)];
      if (typeof correct !== 'undefined' && userAns != null && String(userAns) === String(correct)) {
        score++;
      }
    }

    // ذخیره در PostgreSQL یا فایل محلی
    const total = questions.length;

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

/* ---------------------------
   گرفتن نتایج
   - اضافه شدن quizTitle (خواندن از فایل‌های داده)
--------------------------- */
app.get('/api/results', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'توکن وارد نشده است' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!['SUPER_ADMIN', 'VIEW_ONLY'].includes(decoded.role)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    // build quiz titles map
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'submissions.json');
    const quizTitles = {};
    for (const file of jsonFiles) {
      const data = await readJSON(path.join(DATA_DIR, file), null);
      if (data) {
        quizTitles[path.basename(file, '.json')] = data.title || path.basename(file, '.json');
      }
    }

    if (pool) {
      const q = `SELECT id, name, quiz_id AS "quizId", score, total, answers, time FROM submissions ORDER BY time DESC;`;
      const r = await pool.query(q);
      const rows = r.rows.map(row => ({
        id: row.id,
        name: row.name,
        quizId: row.quizId,
        quizTitle: quizTitles[row.quizId] || row.quizId, // اضافه‌شده
        score: row.score,
        total: row.total,
        answers: row.answers,
        time: row.time instanceof Date ? row.time.toISOString() : row.time
      }));
      return res.json(rows);
    } else {
      const subsPath = path.join(DATA_DIR, 'submissions.json');
      const submissions = await readJSON(subsPath, []);
      const mapped = (Array.isArray(submissions) ? submissions : []).map(s => ({
        ...s,
        quizTitle: quizTitles[s.quizId] || s.quizId
      }));
      return res.json(mapped);
    }
  } catch (err) {
    console.error('Error fetching results:', err);
    return res.status(403).json({ error: 'توکن نامعتبر یا خطا در سرور' });
  }
});

/* ---------------------------
   نمایش جزئیات یک نتیجه خاص
   (همان‌طور که قبلاً بود؛ خروجی شامل submission و quiz)
--------------------------- */
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

/* ---------------------------
   ساخت آزمون جدید (فقط SUPER_ADMIN)
--------------------------- */
app.post('/api/quiz/create', authorizeRole('SUPER_ADMIN'), async (req, res) => {
  const body = req.body;

  if (!body || !body.quizId) {
    return res.status(400).json({ error: 'اطلاعات آزمون معتبر نیست (نیاز به quizId)' });
  }

  const quizId = body.quizId;
  const filePath = path.join(DATA_DIR, `${quizId}.json`);

  let toWrite = body.content ?? body.questions ?? body;
  if (Array.isArray(toWrite)) {
    toWrite = {
      title: body.title || quizId,
      questions: toWrite
    };
  } else if (typeof toWrite === 'object') {
    if (!toWrite.title) {
      toWrite.title = body.title || quizId;
    }
  }

  try {
    await fs.writeFile(filePath, JSON.stringify(toWrite, null, 2), 'utf8');
    res.json({ success: true, message: 'آزمون با موفقیت ساخته شد' });
  } catch (err) {
    console.error('Error creating quiz file:', err);
    res.status(500).json({ error: 'خطا در ذخیره فایل آزمون' });
  }
});

/* ---------------------------
   لیست آزمون‌ها
--------------------------- */
app.get('/api/quizzes', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);

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

/* ---------------------------
   اطمینان از وجود پوشه data
--------------------------- */
async function ensureDataFiles() {
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
  }
  const subsPath = path.join(DATA_DIR, 'submissions.json');
  if (!fsSync.existsSync(subsPath)) {
    await fs.writeFile(subsPath, '[]', 'utf8');
  }
}

/* ---------------------------
   شروع سرور
--------------------------- */
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
