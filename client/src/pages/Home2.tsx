import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [quizId, setQuizId] = useState("");
  const [quizzes, setQuizzes] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/quizzes");
        setQuizzes(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function startQuiz() {
    if (!name || !quizId) {
      alert("لطفا نام و آزمون را وارد کنید.");
      return;
    }
    navigate(`/quiz?name=${encodeURIComponent(name)}&quiz=${encodeURIComponent(quizId)}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 animate-gradient"
    >
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-300 to-pink-300 flex items-center justify-center text-2xl">
            🎯
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800">
            آزمون آنلاین
          </h1>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          خوش‌آمدی – اسم خودت رو وارد کن و یکی از آزمون‌ها رو انتخاب کن
        </p>

        {loading ? (
          <div className="text-center mt-12">
            <p>در حال بارگذاری آزمون‌ها...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">نام و نام خانوادگی</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: جواد حسینی"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">انتخاب آزمون</label>
                <select
                  value={quizId}
                  onChange={(e) => setQuizId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
                >
                  <option value="">یک آزمون انتخاب کنید</option>
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={startQuiz}
                className="flex-1 btn-primary bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 rounded-lg hover:opacity-90 transition"
              >
                شروع آزمون
              </button>
              <button
                onClick={() => {
                  setName("");
                  setQuizId("");
                }}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                پاک کردن
              </button>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-yellow-100 to-pink-100 text-gray-700 text-sm">
              <p className="font-semibold mb-2">چه انتظاری داشته باشی؟</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>آزمون‌ها کوتاه و مناسب سن شما هستند</li>
                <li>برای هر سوال زمان محدود وجود دارد</li>
                <li>بعد از پایان، نمره به‌صورت درصد نمایش داده می‌شود</li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                توی هر آزمون حتما اسم رو درست وارد کن تا نتیجه ذخیره بشه.
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
