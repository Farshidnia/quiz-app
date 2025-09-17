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

app.use('/api/static', express.static(PUBLIC_DIR));

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
   فعال کردن JSON و پوشه public
--------------------------- */
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

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
--------------------------- */
app.post('/api/submit', async (req, res) => {
  const { name, quizId, answers } = req.body;
  if (!name || !quizId || !answers) {
    return res.status(400).json({ error: 'invalid payload' });
  }

  const filePath = path.join(DATA_DIR, `${quizId}.json`);
  const questions = await readJSON(filePath, []);

  let score = 0;
  questions.forEach(q => {
    if (answers[q.id] === q.correct) score++;
  });

  try {
    if (pool) {
      const insertSQL = `
        INSERT INTO submissions(name, quiz_id, score, total, answers)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING id, time;
      `;
      const vals = [name, quizId, score, questions.length, JSON.stringify(answers)];
      const r = await pool.query(insertSQL, vals);
      const inserted = r.rows[0];
      return res.json({ score, total: questions.length, id: inserted.id, time: inserted.time });
    } else {
      if (!fsSync.existsSync(DATA_DIR)) {
        fsSync.mkdirSync(DATA_DIR, { recursive: true });
      }
      const subsPath = path.join(DATA_DIR, 'submissions.json');
      let subs = await readJSON(subsPath, []);

      const record = {
        id: Date.now(),
        name,
        quizId,
        score,
        total: questions.length,
        answers,
        time: new Date().toISOString()
      };

      subs.push(record);
      await fs.writeFile(subsPath, JSON.stringify(subs, null, 2), 'utf8');

      return res.json({ score, total: questions.length, id: record.id, time: record.time });
    }
  } catch (err) {
    console.error('Error saving submission:', err);
    return res.status(500).json({ error: 'خطا در ذخیره‌سازی نتیجه' });
  }
});

/* ---------------------------
   گرفتن نتایج
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

    if (pool) {
      const q = `SELECT id, name, quiz_id AS "quizId", score, total, answers, time FROM submissions ORDER BY time DESC;`;
      const r = await pool.query(q);
      const rows = r.rows.map(row => ({
        id: row.id,
        name: row.name,
        quizId: row.quizId,
        score: row.score,
        total: row.total,
        answers: row.answers,
        time: row.time instanceof Date ? row.time.toISOString() : row.time
      }));
      return res.json(rows);
    } else {
      const subsPath = path.join(DATA_DIR, 'submissions.json');
      const submissions = await readJSON(subsPath, []);
      return res.json(submissions);
    }
  } catch (err) {
    console.error('Error fetching results:', err);
    return res.status(403).json({ error: 'توکن نامعتبر یا خطا در سرور' });
  }
});

/* ---------------------------
   نمایش جزئیات یک نتیجه خاص
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
  const { quizId, questions } = req.body;

  if (!quizId || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'اطلاعات آزمون معتبر نیست' });
  }

  const filePath = path.join(DATA_DIR, `${quizId}.json`);
  await fs.writeFile(filePath, JSON.stringify(questions, null, 2), 'utf8');

  res.json({ success: true, message: 'آزمون با موفقیت ساخته شد' });
});

/* ---------------------------
   🔹 API جدید: لیست تمام آزمون‌ها
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
