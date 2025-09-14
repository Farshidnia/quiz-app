// client/src/pages/Quiz.tsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionCard from '../components/QuestionCard';
import type { Question } from '../components/QuestionCard';
import Timer from '../components/Timer';
import Loading from '../components/Loading';

export default function Quiz() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const name = searchParams.get('name') ?? '';
  const quizId = searchParams.get('quiz') ?? 'default';

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    if (!name) {
      navigate('/');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get<Question[]>(
          `/api/questions/${encodeURIComponent(quizId)}`
        );
        if (!mounted) return;
        setQuestions(Array.isArray(data) ? data : []);
        setIndex(0);
      } catch (err) {
        console.error(err);
        alert('خطا در بارگذاری سوالات');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [quizId, name, navigate]);

  const totalTime = useMemo(() => Math.max(60, questions.length * 60), [questions]);

  function selectAnswer(val: string) {
    const q = questions[index];
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.id]: val }));
  }

  async function finish() {
    setSubmitting(true);
    try {
      const payload = { name, quizId, answers };
      const { data } = await api.post('/api/submit', payload);
      setResult({ score: data.score, total: data.total });
    } catch (err) {
      console.error(err);
      alert('خطا در ارسال پاسخ‌ها');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="mt-12"><Loading /></div>;

  if (!questions || questions.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center">
        <h3 className="text-xl font-semibold">هیچ سوالی برای این آزمون موجود نیست.</h3>
        <div className="mt-4">
          <button onClick={() => navigate('/')} className="btn-primary">بازگشت</button>
        </div>
      </motion.div>
    );
  }

  if (result) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center">
        <h3 className="text-2xl font-semibold mb-2">نتیجه شما</h3>
        <div className="text-4xl font-bold text-brand-500">{result.score} / {result.total}</div>
        <div className="mt-4">
          <button onClick={() => navigate('/')} className="btn-primary">بازگشت به صفحه اصلی</button>
        </div>
      </motion.div>
    );
  }

  const q = questions[index];

  return (
    <div className="space-y-4">
      <Timer seconds={totalTime} onExpire={finish} />

      <AnimatePresence>
        {q && (
          <QuestionCard
            key={q.id}
            q={q}
            selected={answers[q.id] ?? null}
            onSelect={selectAnswer}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted">{index + 1} از {questions.length}</div>

        <div className="flex gap-2">
          {index > 0 && (
            <button onClick={() => setIndex(i => Math.max(0, i - 1))} className="btn-ghost">
              قبلی
            </button>
          )}

          {index < questions.length - 1 ? (
            <button onClick={() => setIndex(i => Math.min(questions.length - 1, i + 1))} className="btn-primary">
              بعدی
            </button>
          ) : (
            <button onClick={finish} className="btn-primary" disabled={submitting}>
              {submitting ? 'در حال ارسال...' : 'پایان آزمون'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
