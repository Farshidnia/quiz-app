import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Navbar(){
  const loc = useLocation();
  return (
    <motion.header initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} transition={{duration:0.4}} className="py-4">
      <div className="container-sm flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold">Q</div>
          <div className="text-lg font-semibold">Quiz Modern</div>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/" className={`px-3 py-2 rounded ${loc.pathname === '/' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>خانه</Link>
          <Link to="/admin" className={`px-3 py-2 rounded ${loc.pathname === '/admin' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>ادمین</Link>
        </nav>
      </div>
    </motion.header>
  )
}
