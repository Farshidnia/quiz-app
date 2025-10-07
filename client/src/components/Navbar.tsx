import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Navbar() {
  const loc = useLocation();
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 bg-gradient-to-r from-[#89f7fe] via-[#fbc2eb] to-[#f6d365] shadow-lg backdrop-blur-sm"
    >
      <div className="container-sm flex items-center justify-between px-6 py-3">
        {/* لوگو و عنوان */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/30 text-white font-extrabold flex items-center justify-center shadow-inner">
            Q
          </div>
          <div className="text-xl font-bold text-white drop-shadow-sm">
            Quiz Modern
          </div>
        </Link>

        {/* لینک‌های ناوبری */}
        <nav className="flex items-center gap-3 text-white font-semibold">
          <Link
            to="/"
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              loc.pathname === '/'
                ? 'bg-white/30 shadow-md backdrop-blur-sm'
                : 'hover:bg-white/20'
            }`}
          >
            خانه
          </Link>
          <Link
            to="/admin"
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              loc.pathname === '/admin'
                ? 'bg-white/30 shadow-md backdrop-blur-sm'
                : 'hover:bg-white/20'
            }`}
          >
            ادمین
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
