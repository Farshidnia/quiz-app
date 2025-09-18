// client/src/pages/Quiz.tsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionCard from '../components/QuestionCard';
import type { Question } from '../components/QuestionCard';
import Timer from '../components/Timer';
import Loading from '../components/Loading';

type PdfQuizObject = {
  mode?: 'pdf' | string;
  title?: string;
  pdfUrl?: string;
  count?: number;
  questions?: Array<{ id?: number | string; correct?: string }>;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function Quiz() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const name = searchParams.get('name') ?? '';
  const quizId = searchParams.get('quiz') ?? 'default';

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number | string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);

  useEffect(() => {
    if (!name) {
      navigate('/');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get<any>(`/api/questions/${encodeURIComponent(quizId)}`);

        if (!mounted) return;

        if (Array.isArray(data)) {
          // حالت قدیمی
          setQuestions(data as Question[]);
          setIsPdfMode(false);
          setPdfUrl(null);
        } else {
          // حالت PDF
          const obj = data as PdfQuizObject;
          if (obj && (obj.mode === 'pdf' || obj.pdfUrl)) {
            const count = obj.count ?? (Array.isArray(obj.questions) ? obj.questions.length : 20);
            const baseQuestions: Question[] = [];
            for (let i = 0; i < count; i++) {
              const qObj = (obj.questions && obj.questions[i]) || {};
              baseQuestions.push({
                id: (qObj.id ?? i + 1) as number,
                question: `سوال شماره ${i + 1}`,
                options: ['الف', 'ب', 'ج', 'د'],
                // @ts-ignore
                correct: qObj.correct ?? undefined,
              } as Question & { correct?: string });
            }
            setQuestions(baseQuestions);
            setIsPdfMode(true);
            setPdfUrl(`${API_BASE}${obj.pdfUrl ?? ''}`);
          } else {
            // حالت غیرمنتظره
            if (obj.questions && Array.isArray(obj.questions)) {
              setQuestions(obj.questions as any as Question[]);
              setIsPdfMode(false);
              setPdfUrl(null);
            } else {
              setQuestions([]);
              setIsPdfMode(false);
              setPdfUrl(null);
            }
          }
        }

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

      {isPdfMode && pdfUrl && (
        <div className="flex justify-end">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            نمایش صورت سوال (PDF)
          </a>
        </div>
      )}

      <AnimatePresence>
        {q && (
          <QuestionCard
            key={String(q.id)}
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
