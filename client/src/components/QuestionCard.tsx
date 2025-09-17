// client/src/components/QuestionCard.tsx
import { motion } from 'framer-motion';

export type Question = {
  id: number | string;
  question?: string;
  options?: string[]; // در حالت PDF معمولاً ['الف','ب','ج','د']
  // ممکن است فیلد correct هم وجود داشته باشد (برای نمایش در مودال)
  correct?: string | number;
};

type Props = {
  q: Question;
  selected?: string | null;
  onSelect: (val:string)=>void;
};

export default function QuestionCard({q, selected, onSelect}:Props){
  const options = q.options ?? ['الف', 'ب', 'ج', 'د'];
  const questionText = q.question ?? `سوال شماره ${q.id}`;

  return (
    <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="card">
      <div className="text-lg font-medium mb-4">{questionText}</div>
      <div className="grid gap-3">
        {options.map((opt, idx) => (
          // key را امن انتخاب می‌کنیم (ممکن است متن گزینه تکراری باشد)
          <label key={String(q.id) + '-opt-' + idx} className={`flex items-center gap-3 p-3 rounded-lg border ${selected===opt? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'}`}>
            <input type="radio" name={`q${q.id}`} checked={selected===opt} onChange={()=>onSelect(opt)} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </motion.div>
  )
}
