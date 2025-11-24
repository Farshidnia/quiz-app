import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Home from './pages/Home';
import Quiz from './pages/Quiz';
import AdminPage from './pages/AdminPage';
import SplashScreen from './components/SplashScreen';
import Navbar from './components/Navbar';
import About from "./pages/About";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <AnimatePresence>
        {showSplash ? (
          <SplashScreen key="splash" />
        ) : (
          <>
            {/* نوار ناوبری */}
            <Navbar />

            {/* محتوای اصلی */}
            <main className="min-h-screen w-full py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/admin" element={<AdminPage />} />

                {/* مسیر صفحه درباره ما */}
                <Route path="/about" element={<About />} />

                {/* هر مسیر اشتباه → صفحه اصلی */}
                <Route path="*" element={<Home />} />
              </Routes>
            </main>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
