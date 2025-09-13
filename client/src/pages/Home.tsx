import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home(){
  const [name, setName] = useState('');
  const [quizId, setQuizId] = useState('default');
  const navigate = useNavigate();

  function start(){
    if(!name.trim()){
      alert('لطفا نام خود را وارد کنید');
      return;
    }
    navigate(`/quiz?name=${encodeURIComponent(name)}&quiz=${encodeURIComponent(quizId)}`);
  }

  return (
    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="card mx-auto mt-8">
      <h2 className="text-2xl font-semibold mb-4">آزمون آنلاین</h2>
      <div className="space-y-4">
        <label className="block">
          <div className="text-sm text-gray-600">نام</div>
          <input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="مثال: جواد" />
        </label>

        <label className="block">
          <div className="text-sm text-gray-600">انتخاب آزمون</div>
          <select value={quizId} onChange={e=>setQuizId(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">
            <option value="default">آزمون نمونه</option>
            {/* در آینده می‌تونیم از API لیست آزمون‌ها رو بگیریم */}
          </select>
        </label>

        <div className="flex gap-3">
          <button onClick={start} className="btn-primary">شروع آزمون</button>
          <button onClick={()=>{ setName(''); setQuizId('default') }} className="btn-ghost">پاک کردن</button>
        </div>
      </div>
    </motion.div>
  )
}
