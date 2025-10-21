import { useState, useEffect } from 'react';
// ✅ added phone input handling (optional)
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

type QuizItem = {
  id: string;
  title: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function Home() {
  const [name, setName] = useState('');
  // ✅ added phone state
  const [phone, setPhone] = useState('');

  // start with empty quizId; will be set to first available quiz after fetch
  const [quizId, setQuizId] = useState('');
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/quizzes`);
        const data = await res.json();

        console.log('داده دریافتی از سرور:', data); // 🛠️ برای تست

        if (Array.isArray(data)) {
          setQuizzes(data);
          if (data.length > 0 && !quizId) setQuizId(data[0].id);
        } else {
          console.error('API did not return an array:', data);
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
    // ✅ validate phone if provided (must start with 09 and be 11 digits)
    if (phone && !/^09\d{9}$/.test(phone)) {
      alert('شماره تماس نامعتبر است. فرمت درست: 09121234567');
      return;
    }
    // ✅ include phone as optional query param
    navigate(`/quiz?name=${encodeURIComponent(name)}&quiz=${encodeURIComponent(quizId)}&phone=${encodeURIComponent(phone)}`);
  }

  if (loading) {
    return (
      <div className="text-center mt-12">
        <p>در حال بارگذاری آزمون‌ها...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto mt-12 bg-white/90 rounded-2xl shadow-lg p-6 backdrop-blur-sm border border-white/30">
      <h2 className="text-2xl font-semibold mb-4">آزمون آنلاین خانم سجادی</h2>
      <div className="space-y-4">
        <label className="block">
          <div className="text-sm text-gray-600">نام و نام خانوادگی</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            placeholder="مثال: جواد فرشیدنیا"
          />
        </label>

        <label className="block">
          <div className="text-sm text-gray-600">شماره تماس (اختیاری)</div>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            placeholder="مثال: 09211234567"
          />
        </label>

        <label className="block">
          <div className="text-sm text-gray-600">انتخاب آزمون</div>
          <select
            value={quizId}
            onChange={e => setQuizId(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          >
            {quizzes.length > 0 ? (
              quizzes.map(q => (
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
          <button onClick={start} className="btn-primary">شروع آزمون</button>
          <button onClick={() => { setName(''); setQuizId(''); }} className="btn-ghost">پاک کردن</button>
        </div>
      </div>
    </motion.div>
  );
}
