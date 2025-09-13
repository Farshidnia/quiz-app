import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import AdminPage from './pages/AdminPage';
import SplashScreen from './components/SplashScreen';
import Navbar from './components/Navbar';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <AnimatePresence>
        {showSplash ? (
          <SplashScreen key="splash" />
        ) : (
          <>
            <Navbar />
            <main className="container-sm py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </main>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
