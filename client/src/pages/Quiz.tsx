// client/src/pages/Quiz.tsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionCard from '../components/QuestionCard';
import type { Question } from '../components/QuestionCard';
import Timer from '../components/Timer';
import Loading from '../components/Loading';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { X } from 'lucide-react';

// worker از فایل محلی (نام فایل دقیقاً همان است که در public/pdfjs گذاشتی)
pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdfjs/pdf.worker.min.mjs`;

type PdfQuizObject = {
  mode?: 'pdf' | string;
  pdfUrl?: string;
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);

  // PDF modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);

  // from env (set this in Render as VITE_API_BASE_URL = https://quiz-app-server-3pa9.onrender.com)
  const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') || 'https://quiz-app-server-3pa9.onrender.com';

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
          setIsPdfMode(false);
          setPdfUrl(null);
        } else {
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
                correct: qObj.correct ?? undefined,
              } as Question & { correct?: string });
            }

            // resolve pdf URL robustly (try several candidates)
            const raw = obj.pdfUrl ?? '';
            let finalUrl: string | null = null;

            if (raw) {
              const rawPath = raw.startsWith('/') ? raw : `/${raw}`;

              const candidates = [
                // if raw already absolute
                ...(raw.startsWith('http') ? [raw] : []),
                // API base + rawPath (most likely)
                `${API_BASE}${rawPath}`,
                // API base + /api/static + rawPath (server may expose under /api/static)
                `${API_BASE}/api/static${rawPath}`,
                // client origin + rawPath (in case file is served by client static)
                `${window.location.origin}${rawPath}`,
                // raw as-is (relative) - fallback
                raw
              ].filter(Boolean);

              console.log('[PDF] candidates to try:', candidates);

              // test candidates quickly (HEAD first, fallback to GET)
              for (const u of candidates) {
                try {
                  // try HEAD (lighter)
                  const head = await fetch(u, { method: 'HEAD' });
                  if (head && head.ok) {
                    finalUrl = u;
                    break;
                  }
                } catch (e) {
                  // HEAD might fail / be blocked. try GET as fallback.
                  try {
                    const get = await fetch(u, { method: 'GET' });
                    if (get && get.ok) {
                      finalUrl = u;
                      break;
                    }
                  } catch (_e) {
                    // ignore and continue
                  }
                }
              }

              // If nothing found, fallback to API_BASE + rawPath (most likely correct)
              if (!finalUrl) {
                finalUrl = `${API_BASE}${rawPath}`;
              }
            }

            console.log('[PDF] resolved pdfUrl:', finalUrl, ' raw:', raw);
            setQuestions(baseQuestions);
            setIsPdfMode(true);
            setPdfUrl(finalUrl);
          } else if (obj.questions && Array.isArray(obj.questions)) {
            setQuestions(obj.questions as any as Question[]);
            setIsPdfMode(false);
            setPdfUrl(null);
          } else {
            setQuestions([]);
            setIsPdfMode(false);
            setPdfUrl(null);
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

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
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
          <button
            onClick={() => setShowPdfModal(true)}
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

      {/* PDF Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h2 className="text-lg font-semibold">صورت سوالات آزمون</h2>
              <button onClick={() => setShowPdfModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PDF Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {pdfUrl ? (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<div className="text-center py-4">در حال بارگذاری PDF...</div>}
                >
                  {Array.from(new Array(numPages ?? 0), (el, pidx) => (
                    <Page
                      key={`page_${pidx + 1}`}
                      pageNumber={pidx + 1}
                      width={Math.min(window.innerWidth - 100, 800)}
                    />
                  ))}
                </Document>
              ) : (
                <div className="text-center py-6">آدرس فایل PDF نامشخص است.</div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t flex justify-end">
              <button
                onClick={() => setShowPdfModal(false)}
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
