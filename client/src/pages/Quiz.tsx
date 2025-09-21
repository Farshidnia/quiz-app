// client/src/pages/Quiz.tsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionCard from '../components/QuestionCard';
import type { Question } from '../components/QuestionCard';
import Timer from '../components/Timer';
import Loading from '../components/Loading';
import { X } from 'lucide-react';

type ImageQuizObject = {
  mode?: 'image' | string;
  imageUrls?: string[];
  count?: number;
  questions?: Array<{ id?: number | string; correct?: string }>;
};

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

  // حالت جدید برای تصاویر
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isImageMode, setIsImageMode] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const API_BASE =
    (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') ||
    'https://quiz-app-server-3pa9.onrender.com';

  // -------------------------------
  // Load Quiz Data
  // -------------------------------
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
          setQuestions(data as Question[]);
          setIsImageMode(false);
          setImageUrls([]);
        } else {
          const obj = data as ImageQuizObject;
          if (obj && (obj.mode === 'image' || obj.imageUrls)) {
            // حالت آزمون تصویری
            const count = obj.count ?? (Array.isArray(obj.questions) ? obj.questions.length : 20);
            const baseQuestions: Question[] = [];

            for (let i = 0; i < count; i++) {
              const qObj = (obj.questions && obj.questions[i]) || {};
              baseQuestions.push({
                id: (qObj.id ?? i + 1) as number,
                question: `سوال شماره ${i + 1}`,
                options: ['الف', 'ب', 'ج', 'د'],
                correct: qObj.correct ?? undefined,
              } as Question & { correct?: string });
            }

            // مسیر تصاویر
            const fullUrls = (obj.imageUrls || []).map(img =>
              img.startsWith('http') ? img : `${API_BASE}${img.startsWith('/') ? img : '/' + img}`
            );

            setQuestions(baseQuestions);
            setIsImageMode(true);
            setImageUrls(fullUrls);
          } else if (obj.questions && Array.isArray(obj.questions)) {
            setQuestions(obj.questions as any as Question[]);
            setIsImageMode(false);
            setImageUrls([]);
          } else {
            setQuestions([]);
            setIsImageMode(false);
            setImageUrls([]);
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

    return () => {
      mounted = false;
    };
  }, [quizId, name, navigate, API_BASE]);

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

      {isImageMode && imageUrls.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowImageModal(true)}
            className="btn-primary"
          >
            نمایش صورت سوال
          </button>
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

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h2 className="text-lg font-semibold">صورت سوالات آزمون</h2>
              <button onClick={() => setShowImageModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image display */}
            <div className="flex-1 flex flex-col items-center justify-center overflow-auto p-4">
              {imageUrls.length > 0 ? (
                <>
                  <img
                    src={imageUrls[currentImageIndex]}
                    alt={`صفحه ${currentImageIndex + 1}`}
                    className="max-w-full max-h-[80vh] rounded shadow object-contain"
                  />
                  <div className="mt-4 flex justify-center gap-4">
                    <button
                      onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                      className="btn-ghost"
                      disabled={currentImageIndex === 0}
                    >
                      قبلی
                    </button>
                    <span>{currentImageIndex + 1} / {imageUrls.length}</span>
                    <button
                      onClick={() => setCurrentImageIndex(i => Math.min(imageUrls.length - 1, i + 1))}
                      className="btn-ghost"
                      disabled={currentImageIndex === imageUrls.length - 1}
                    >
                      بعدی
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">هیچ تصویری برای نمایش موجود نیست.</div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t flex justify-end">
              <button
                onClick={() => setShowImageModal(false)}
                className="btn-primary"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
