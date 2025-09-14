// client/src/components/QuestionCard.tsx
import { motion } from 'framer-motion';

export type Question = {
  id: number;
  question: string;
  options: string[];
};

type Props = {
  q: Question;
  selected?: string | null;
  onSelect: (val:string)=>void;
};

export default function QuestionCard({q, selected, onSelect}:Props){
  return (
    <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="card">
      <div className="text-lg font-medium mb-4">{q.question}</div>
      <div className="grid gap-3">
        {q.options.map(opt => (
          <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border ${selected===opt? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'}`}>
            <input type="radio" name={`q${q.id}`} checked={selected===opt} onChange={()=>onSelect(opt)} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </motion.div>
  )
}
