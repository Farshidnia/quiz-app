require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // اضافه شد برای رفع مشکل CORS

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

const ADMIN_SECRET = process.env.ADMIN_SECRET;

/* ---------------------------
   فعال کردن JSON و پوشه public
--------------------------- */
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

/* ---------------------------
   تنظیمات CORS
--------------------------- */
const allowedOrigins = [
  "https://quiz-app-client-bwgb.onrender.com", // آدرس فرانت روی Render
  "http://localhost:5173" // برای تست لوکال
];

app.use(
  cors({
    origin: function (origin, callback) {
      // اگر درخواست بدون origin بود (مثل Postman)، اجازه بده
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

// اضافه کردن دستی هدر برای اطمینان بیشتر
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://quiz-app-client-bwgb.onrender.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

  res.json({ score, total: questions.length });
});

/* ---------------------------
   گرفتن نتایج (SUPER_ADMIN و VIEW_ONLY)
--------------------------- */
app.get('/api/results', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'توکن وارد نشده است' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!['SUPER_ADMIN', 'VIEW_ONLY'].includes(decoded.role)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    const subsPath = path.join(DATA_DIR, 'submissions.json');
    readJSON(subsPath, []).then(submissions => {
      res.json(submissions);
    });

  } catch (err) {
    return res.status(403).json({ error: 'توکن نامعتبر است' });
  }
});

/* ---------------------------
   نمایش جزئیات یک نتیجه خاص
--------------------------- */
app.get('/api/results/:id', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'توکن وارد نشده است' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['SUPER_ADMIN', 'VIEW_ONLY'].includes(decoded.role)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    const id = Number(req.params.id);
    const subsPath = path.join(DATA_DIR, 'submissions.json');

    readJSON(subsPath, []).then(async (submissions) => {
      const submission = Array.isArray(submissions) ? submissions.find(s => Number(s.id) === id) : null;
      if (!submission) {
        return res.status(404).json({ error: 'submission not found' });
      }

      // خواندن فایل آزمون مرتبط
      const quizPath = path.join(DATA_DIR, `${submission.quizId}.json`);
      const quiz = await readJSON(quizPath, []);

      res.json({ submission, quiz });
    }).catch(err => {
      console.error('Error reading submissions:', err);
      res.status(500).json({ error: 'خطا در سرور' });
    });

  } catch (err) {
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
   اطمینان از وجود پوشه data و فایل submissions
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
ensureDataFiles().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
