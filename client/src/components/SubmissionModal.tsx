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
  score: number;
  total: number;
  answers: Record<string, any>;
  time: string;
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

  // محاسبه تعداد پاسخ‌های صحیح، غلط و نزده
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative max-w-4xl w-full bg-white rounded-lg shadow-lg overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* هدر مودال */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">جزئیات آزمون — {sub.name}</div>
            <div className="text-sm text-gray-600">
              آزمون: {sub.quizId} — {moment(sub.time).locale('fa').format('jYYYY/jMM/jDD HH:mm')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">نمره:</div>
            <div className="px-3 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold">
              {sub.score}/{sub.total}
            </div>
            <button className="btn-ghost" onClick={onClose}>بستن</button>
          </div>
        </div>

        {/* آمار کلی */}
        <div className="p-4 border-b flex justify-around text-center text-sm bg-gray-50">
          <div className="text-green-700 font-semibold">
            صحیح: {stats.correct}
          </div>
          <div className="text-red-700 font-semibold">
            غلط: {stats.wrong}
          </div>
          <div className="text-gray-600 font-semibold">
            بدون پاسخ: {stats.unanswered}
          </div>
        </div>

        {/* محتوای سوالات */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {quiz.length === 0 && (
            <div className="text-center text-gray-500">سوالی برای نمایش وجود ندارد.</div>
          )}

          {quiz.map((q, idx) => {
            const qid = String(q.id);
            const studentAnswer = sub.answers[qid];
            const correctAnswer = q.correct ?? '-';
            const isCorrect = studentAnswer && String(studentAnswer) === String(correctAnswer);
            const options = q.options ?? ['الف', 'ب', 'ج', 'د'];
            const questionText = q.question ?? `سوال ${idx + 1}`;

            return (
              <div key={qid} className="p-4 mb-4 rounded-lg border bg-white shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium">سوال {idx + 1}</div>
                  <div className={`text-sm font-medium ${isCorrect ? 'text-green-600' : (studentAnswer ? 'text-red-600' : 'text-gray-500')}`}>
                    {studentAnswer ? (isCorrect ? 'صحیح' : 'غلط') : 'بدون پاسخ'}
                  </div>
                </div>

                <div className="mb-3 text-gray-800">
                  {questionText}
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-600">گزینه‌ها:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {options.map((opt, i) => (
                      <div key={i} className="px-3 py-2 rounded bg-gray-50 text-gray-800 text-sm">
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
