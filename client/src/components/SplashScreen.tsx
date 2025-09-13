import { motion } from 'framer-motion';

export default function SplashScreen() {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center h-screen bg-gradient-to-br from-brand-50 to-white"
    >
      <motion.div
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="card text-center"
      >
        <div className="text-3xl font-bold text-brand-600">Quiz Modern</div>
        <div className="mt-2 text-sm text-muted">آزمون آنلاین — تجربه‌ای سریع و روان</div>
      </motion.div>
    </motion.div>
  );
}
