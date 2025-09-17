import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

type QuizItem = {
  id: string;
  title: string;
};


export default function Home() {
  const [name, setName] = useState('');
  const [quizId, setQuizId] = useState('default');
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]); // مقدار اولیه حتماً آرایه باشه
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // گرفتن لیست آزمون‌ها از سرور
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await fetch('/api/quizzes');
        const data = await res.json();
        
        // بررسی اینکه داده آرایه هست
        if (Array.isArray(data)) {
          setQuizzes(data);
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
    navigate(`/quiz?name=${encodeURIComponent(name)}&quiz=${encodeURIComponent(quizId)}`);
  }

  if (loading) {
    return (
      <div className="text-center mt-12">
        <p>در حال بارگذاری آزمون‌ها...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card mx-auto mt-8">
      <h2 className="text-2xl font-semibold mb-4">آزمون آنلاین</h2>
      <div className="space-y-4">
        <label className="block">
          <div className="text-sm text-gray-600">نام</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            placeholder="مثال: جواد"
          />
        </label>

        <label className="block">
          <div className="text-sm text-gray-600">انتخاب آزمون</div>
          <select
            value={quizId}
            onChange={e => setQuizId(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          >
            {quizzes.length === 0 && <option>هیچ آزمونی موجود نیست</option>}
            {quizzes.map(q => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-3">
          <button onClick={start} className="btn-primary">شروع آزمون</button>
          <button onClick={() => { setName(''); setQuizId('default'); }} className="btn-ghost">پاک کردن</button>
        </div>
      </div>
    </motion.div>
  );
}
