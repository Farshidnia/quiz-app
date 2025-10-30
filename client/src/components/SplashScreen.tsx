import { motion } from 'framer-motion';

export default function SplashScreen() {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-brand-50 to-white"
    >
      {/* لوگو با افکت درخشان و ضربان‌دار */}
      <motion.img
        src="/logo.png"
        alt="لوگو"
        initial={{ scale: 0, opacity: 0, y: -40 }}
        animate={{
          scale: [0, 1.1, 1],
          opacity: [0, 1, 1],
          y: 0,
          boxShadow: [
            "0 0 0px rgba(0,0,0,0)",
            "0 0 25px rgba(59,130,246,0.5)",
            "0 0 0px rgba(0,0,0,0)"
          ],
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="w-32 h-32 mb-6 rounded-full object-contain"
      />

      {/* متن موجود (بدون تغییر) */}
      <motion.div
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="card text-center"
      >
        <div className="text-3xl font-bold text-brand-600">هوش برتر</div>
        <div className="mt-2 text-sm text-muted">آزمون آنلاین — تجربه‌ای سریع و روان</div>
      </motion.div>
    </motion.div>
  );
}
