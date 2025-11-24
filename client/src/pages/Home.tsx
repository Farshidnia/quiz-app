import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

type QuizItem = {
  id: string;
  title: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// تنظیمات محدودیت زمانی آزمون (در صورت نیاز)
const EXAM_TIME_LIMIT_ENABLED = false;
const EXAM_START_HOUR = 10;
const EXAM_END_HOUR = 23;

export default function Home() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [quizId, setQuizId] = useState('');
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/quizzes`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setQuizzes(data);
          if (data.length > 0 && !quizId) setQuizId(data[0].id);
        } else {
          setQuizzes([]);
        }
      } catch (err) {
        console.error('Error fetching quizzes:', err);
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  function start() {
    if (!name.trim()) {
      alert('لطفا نام خود را وارد کنید');
      return;
    }
    if (!quizId) {
      alert('لطفا یک آزمون را انتخاب کنید');
      return;
    }
    if (phone && !/^09\d{9}$/.test(phone)) {
      alert('شماره تماس نامعتبر است. فرمت درست: 09121234567');
      return;
    }

    // محدودیت زمانی
    if (EXAM_TIME_LIMIT_ENABLED) {
      const now = new Date();
      const tehranOffset = 3.5;
      const tehranHour = (now.getUTCHours() + tehranOffset) % 24;
      if (tehranHour < EXAM_START_HOUR) {
        alert(`🕗 آزمون هنوز شروع نشده — شروع از ساعت ${EXAM_START_HOUR}:00`);
        return;
      }
      if (tehranHour >= EXAM_END_HOUR) {
        alert(`⏰ مهلت شرکت در آزمون پایان یافت — تا ساعت ${EXAM_END_HOUR}:00 فعال بود.`);
        return;
      }
    }

    navigate(
      `/quiz?name=${encodeURIComponent(name)}&quiz=${encodeURIComponent(
        quizId
      )}&phone=${encodeURIComponent(phone)}`
    );
  }

  if (loading) {
    return (
      <div className="text-center mt-12">
        <p>در حال بارگذاری آزمون‌ها...</p>
      </div>
    );
  }

  return (
    <div>
      {/* کارت اصلی صفحه هوم */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto mt-12 bg-white/90 rounded-2xl shadow-lg p-6 backdrop-blur-sm border border-white/30"
      >
        <h2 className="text-2xl font-semibold mb-4">آزمون آنلاین خانم سجادی</h2>
        <div className="space-y-4">
          <label className="block">
            <div className="text-sm text-gray-600">نام و نام خانوادگی</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="مثال: جواد فرشیدنیا"
            />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600">شماره تماس (اختیاری)</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="مثال: 09211234567"
            />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600">انتخاب آزمون</div>
            <select
              value={quizId}
              onChange={(e) => setQuizId(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              {quizzes.length > 0 ? (
                quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))
              ) : (
                <option disabled>هیچ آزمونی موجود نیست</option>
              )}
            </select>
          </label>

          <div className="flex gap-3">
            <button onClick={start} className="btn-primary">
              شروع آزمون
            </button>
            <button
              onClick={() => {
                setName('');
                setQuizId('');
              }}
              className="btn-ghost"
            >
              پاک کردن
            </button>
          </div>
        </div>
      </motion.div>

      {/* ------- فوتر اختصاصی کافی نت ------- */}
      <div className="text-center mt-6 mb-10 text-gray-700">
        <Link to="/about" className="inline-block">
          <div className="text-base text-gray-700">
            طراحی شده با ❤️ توسط
          </div>
          <div
            className="text-2xl mt-1"
            style={{ fontFamily: 'MRT_Khodkar, sans-serif' }}
          >
            کافی نت و تایپ تکثیر جواد
          </div>
        </Link>
      </div>
    </div>
  );
}
