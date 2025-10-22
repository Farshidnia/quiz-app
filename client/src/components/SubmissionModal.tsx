// client/src/components/SubmissionModal.tsx
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import moment from 'moment-jalaali';

type Question = {
  id: number | string;
  question?: string;
  options?: string[];
  correct?: string | number;
};

type Submission = {
  id: number | string;
  name: string;
  quizId: string;
  quizTitle?: string;
  score: number;
  total: number;
  answers: Record<string, any>;
  time: string;
  phone?: string;
};

export default function SubmissionModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data?: { submission: Submission; quiz: Question[] } | null;
}) {
  if (!open || !data) return null;

  const sub = data.submission;
  const quiz = data.quiz;

  const stats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    quiz.forEach(q => {
      const qid = String(q.id);
      const studentAnswer = sub.answers[qid];
      const correctAnswer = q.correct;

      if (studentAnswer == null || studentAnswer === '') {
        unanswered++;
      } else if (String(studentAnswer) === String(correctAnswer)) {
        correct++;
      } else {
        wrong++;
      }
    });

    return { correct, wrong, unanswered };
  }, [quiz, sub]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-6">
      {/* پس‌زمینه کلیک‌پذیر برای بستن */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* مودال واکنش‌گرا */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="relative w-full h-[95vh] sm:h-auto sm:max-h-[90vh] max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* بخش بالایی - اطلاعات شرکت‌کننده */}
        <div className="p-4 border-b bg-gray-50 sticky top-0 z-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="text-lg font-semibold">جزئیات آزمون — {sub.name}</div>
              <div className="text-sm text-gray-700">
                شماره تماس: {sub.phone || 'بدون شماره تماس'}
              </div>
              <div className="text-sm text-gray-600">
                آزمون: {sub.quizTitle || sub.quizId} —{' '}
                {moment(sub.time).locale('fa').format('jYYYY/jMM/jDD HH:mm')}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm">نمره:</div>
              <div className="px-3 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold">
                {((sub.score / Math.max(1, sub.total)) * 100).toFixed(2)}%
              </div>
              <button
                onClick={onClose}
                className="btn-ghost px-3 py-1 border rounded-md hover:bg-gray-100 transition"
              >
                بستن
              </button>
            </div>
          </div>

          {/* آمار پاسخ‌ها */}
          <div className="mt-3 flex justify-around text-center text-sm bg-white rounded-lg py-2 shadow-sm">
            <div className="text-green-700 font-semibold">صحیح: {stats.correct}</div>
            <div className="text-red-700 font-semibold">غلط: {stats.wrong}</div>
            <div className="text-gray-600 font-semibold">بدون پاسخ: {stats.unanswered}</div>
          </div>
        </div>

        {/* بخش پاسخ‌ها (اسکرول‌پذیر) */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          {quiz.length === 0 && (
            <div className="text-center text-gray-500">
              سوالی برای نمایش وجود ندارد.
            </div>
          )}

          {quiz.map((q, idx) => {
            const qid = String(q.id);
            const studentAnswer = sub.answers[qid];
            const correctAnswer = q.correct ?? '-';
            const isCorrect = studentAnswer && String(studentAnswer) === String(correctAnswer);
            const options = q.options ?? ['الف', 'ب', 'ج', 'د'];

            return (
              <div key={qid} className="p-4 mb-4 rounded-lg border bg-white shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium">سوال {idx + 1}</div>
                  <div
                    className={`text-sm font-medium ${
                      isCorrect
                        ? 'text-green-600'
                        : studentAnswer
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {studentAnswer
                      ? isCorrect
                        ? 'صحیح'
                        : 'غلط'
                      : 'بدون پاسخ'}
                  </div>
                </div>

                <div className="mb-3 text-gray-800">
                  {q.question && !q.question.startsWith('سوال شماره')
                    ? q.question
                    : null}
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-600">گزینه‌ها:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {options.map((opt, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded bg-gray-50 text-gray-800 text-sm"
                      >
                        <strong className="ml-2">{opt}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 text-sm text-gray-600">پاسخ صحیح:</div>
                  <div className="px-3 py-2 rounded bg-green-50 text-green-800 text-sm">
                    {correctAnswer ?? '-'}
                  </div>

                  <div className="text-sm text-gray-600 mt-2">پاسخ دانش‌آموز:</div>
                  <div
                    className={`px-3 py-2 rounded text-sm ${
                      !studentAnswer
                        ? 'bg-gray-50 text-gray-500'
                        : isCorrect
                        ? 'bg-green-50 text-green-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    {studentAnswer || 'بدون پاسخ'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
