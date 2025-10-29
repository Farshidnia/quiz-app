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
// نوع داده برای آزمون تصویری
interface ImageQuizObject {
  mode?: 'image' | string;
  imageUrls?: string[];
  count?: number;
  questions?: Array<{ id?: number | string; correct?: string; imageUrl?: string }>;
}

export default function Quiz() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const name = searchParams.get('name') ?? '';
  const phone = searchParams.get('phone') ?? ''; // optional

  const quizId = searchParams.get('quiz') ?? 'default';

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number | string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [timeUpPercent, setTimeUpPercent] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  // حالت آزمون تصویری (قبلی: مجموعه صفحات)
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isImageMode, setIsImageMode] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);



  // آدرس پایه سرور
  const API_BASE =
    (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') ||
    'https://quiz-app-server-3pa9.onrender.com';

  // -------------------------------
  // بارگذاری اطلاعات آزمون
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
          // قدیمی: آرایه سوالات (متنی)
          setQuestions(data as Question[]);
          setIsImageMode(false);
          setImageUrls([]);
        } else {
          const obj = data as ImageQuizObject;

          if (obj && (obj.mode === 'image' || obj.imageUrls)) {
            // حالت آزمون تصویری کلی (آرشیو صفحات PDF -> تصاویر)
            const count = obj.count ?? (Array.isArray(obj.questions) ? obj.questions.length : 20);
            const baseQuestions: Question[] = [];

            for (let i = 0; i < count; i++) {
              const qObj = (obj.questions && obj.questions[i]) || {};
              baseQuestions.push({
                id: (qObj.id ?? i + 1) as number,
                question: `سوال شماره ${i + 1}`,
                options: ['الف', 'ب', 'ج', 'د'],
                correct: qObj.correct ?? undefined,
                // اگر هر سوال imageUrl داشت آن را ضمیمه کن
                ...(qObj.imageUrl ? { imageUrl: qObj.imageUrl } : {}),
              } as Question & { correct?: string; imageUrl?: string });
            }

            // ساخت آدرس کامل تصاویر (مجموعه صفحات)
            const fullUrls = (obj.imageUrls || []).map(img =>
              img.startsWith('http') ? img : `${API_BASE}${img.startsWith('/') ? img : '/' + img}`
            );

            setQuestions(baseQuestions);
            setIsImageMode(true);
            setImageUrls(fullUrls);
          } else if (obj.questions && Array.isArray(obj.questions)) {
            // اگر ساختار جدید: questions شامل item هایی با imageUrl برای هر سوال
            // تبدیل مستقیم به questions
            const mapped = (obj.questions as any[]).map((q, i) => ({
              id: q.id ?? i + 1,
              question: q.question ?? `سوال شماره ${i + 1}`,
              options: q.options ?? ['الف', 'ب', 'ج', 'د'],
              correct: q.correct,
              ...(q.imageUrl ? { imageUrl: q.imageUrl } : {}),
            })) as Question[];
            setQuestions(mapped);
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

  // زمان کل آزمون
  const totalTime = useMemo(() => Math.max(60, questions.length * 60), [questions]);

  // انتخاب جواب
  function selectAnswer(val: string) {
    const q = questions[index];
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.id]: val }));
  }



  // پایان آزمون (وقتی کاربر خودش می‌زنه)
  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { name, phone, quizId, answers }; // include phone
      const { data } = await api.post('/api/submit', payload);
      setResult({ score: data.score, total: data.total });
    } catch (err) {
      console.error(err);
      alert('خطا در ارسال پاسخ‌ها');
    } finally {
      setSubmitting(false);
    }
  }

  // ارسال هنگام اتمام تایمر
  async function submitOnTimeUp() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { name, phone, quizId, answers };
      const { data } = await api.post('/api/submit', payload);
      const percent = ((data.score / Math.max(1, data.total)) * 100).toFixed(2);
      setTimeUpPercent(percent);
    } catch (err) {
      console.error('[timeup submit] error:', err);
      setTimeUpPercent(null);
    } finally {
      setSubmitting(false);
      setTimeUp(true);
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

  // وقتی زمان تموم شده و submitOnTimeUp قبلاً اجرا شده
  if (timeUp) {
    const percent =
      timeUpPercent ??
      (
        (Object.entries(answers).filter(([id, val]) => val !== null).length / Math.max(1, questions.length)) *
        100
      ).toFixed(2);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center">
        <h3 className="text-2xl font-semibold mb-2 text-red-600">
          با عرض پوزش، زمان آزمون به پایان رسید. برای دریافت پاسخنامه و مشاوره در تلگرام به پشتیبان پیام دهید: Zheidary20@
        </h3>
        <div className="text-5xl font-bold text-brand-500 mt-2">{percent}%</div>
        <div className="mt-6">
          <button onClick={() => navigate('/')} className="btn-primary">بازگشت به صفحه اصلی</button>
        </div>
      </motion.div>
    );
  }

  if (result) {
    const percent = ((result.score / Math.max(1, result.total)) * 100).toFixed(2);
    const message = `از شرکت شما در آزمون متشکریم، برای دریافت پاسخنامه و مشاوره در تلگرام به پشتیبان پیام دهید: Zheidary20@`;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center">
        <h3 className="text-2xl font-semibold mb-2">نتیجه شما</h3>
        <div className="text-6xl font-extrabold text-brand-500">{percent}%</div>
        <div className="mt-4 text-sm text-muted">{message}</div>
        <div className="mt-6">
          <button onClick={() => navigate('/')} className="btn-primary">بازگشت به صفحه اصلی</button>
        </div>
      </motion.div>
    );
  }

  const q = questions[index];

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-[#a1c4fd] via-[#c2e9fb] to-[#fbc2eb] p-4 pt-28">
      <div className="space-y-4 bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg p-6 w-full max-w-2xl border border-white/40">
        {/* تغییر: وقتی تایمر تموم شد باید submitOnTimeUp اجرا شود */}
        <Timer seconds={totalTime} onExpire={() => submitOnTimeUp()} />

        {/* اگر سوال فعلی imageUrl داشته باشه، تصویر اختصاصی را نمایش بده */}
        {q && (q as any).imageUrl && (
          <div className="flex justify-center mb-4">
            <div className="w-full max-w-[720px]">
              <div className="relative rounded-lg overflow-hidden bg-gray-100 border">
                <img
                  src={(q as any).imageUrl.startsWith('http') ? (q as any).imageUrl : `${API_BASE}${(q as any).imageUrl.startsWith('/') ? (q as any).imageUrl : '/' + (q as any).imageUrl}`}
                  alt={`صورت سوال ${index + 1}`}
                  className="w-full h-44 sm:h-64 object-contain cursor-zoom-in"
                />
              </div>
            </div>
          </div>
        )}

        {/* نمایش کارت سوال */}
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

        {/* دکمه‌های ناوبری */}
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

        {/* مودال نمایش تصاویر (مجموع صفحات قدیمی) */}
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

              {/* نمایش تصویر */}
              <div className="flex-1 flex flex-col items-center justify-center overflow-auto p-4">
                {imageUrls.length > 0 ? (
                  <>
                    <img
                      src={imageUrls[currentImageIndex]}
                      alt={`صفحه ${currentImageIndex + 1}`}
                      className="max-w-full max-h-[80vh] rounded shadow object-contain"
                      crossOrigin="anonymous"
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
    </div>
  );
}
