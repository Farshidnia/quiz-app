import { useEffect, useState } from 'react';

export default function Timer({seconds, onExpire}:{seconds:number, onExpire:()=>void}){
  const [left, setLeft] = useState(seconds);

  useEffect(()=>{
    setLeft(seconds);
    const t = setInterval(()=> setLeft(s => {
      if(s <= 1){ clearInterval(t); onExpire(); return 0; }
      return s - 1;
    }), 1000);
    return ()=> clearInterval(t);
  }, []);

  const m = Math.floor(left/60);
  const s = left % 60;
  const pct = Math.max(0, (seconds-left)/seconds*100);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
        <div>زمان باقی‌مانده: <strong>{m}:{s<10?`0${s}`:s}</strong></div>
        <div className="text-xs text-muted">{Math.round(pct)}% پیش رفته</div>
      </div>
      <div className="progress">
        <i style={{width:`${pct}%`}} />
      </div>
    </div>
  );
}
