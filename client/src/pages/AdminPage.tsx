// client/src/pages/AdminPage.tsx
import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import Loading from '../components/Loading';
import moment from 'moment-jalaali';
import SubmissionModal from '../components/SubmissionModal';
import type { Question } from '../components/QuestionCard';

type Submission = {
  id: number;
  name: string;
  phone?: string; // ✅ اضافه کن این خطو
  quizId: string;
  quizTitle: string; // ✅ اضافه شد برای نمایش اسم آزمون
  score: number;
  total: number;
  answers: Record<string, any>;
  time: string;
};

export default function AdminPage() {
  // login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('admin_role'));

  // data state
  const [results, setResults] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  // modal state
  const [modalData, setModalData] = useState<{ submission: Submission; quiz: Question[] } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ui controls
  const [search, setSearch] = useState('');
  const [quizFilter, setQuizFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'time' | 'score' | 'name' | 'quizTitle'>('time');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (token) {
      loadResults(token);
    }
  }, [token]);

  async function login() {
    setLoggingIn(true);
    try {
      const res = await api.post('/api/admin/login', { username, password });
      const t = res.data.token;
      const r = res.data.role ?? null;
      setToken(t);
      setRole(r);
      localStorage.setItem('admin_token', t);
      if (r) localStorage.setItem('admin_role', r);
      await loadResults(t);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'خطا در ورود');
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    setToken(null);
    setRole(null);
    setResults([]);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
  }

  async function loadResults(tkn?: string) {
    const t = tkn || token;
    if (!t) return;
    setLoading(true);
    try {
      const res = await api.get<Submission[]>('/api/results', {
        headers: { Authorization: `Bearer ${t}` },
      });
      setResults(Array.isArray(res.data) ? res.data : []);
      setPage(1);
    } catch (err: any) {
      console.error(err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        alert('دسترسی ندارید یا توکن منقضی شده. لطفاً دوباره وارد شوید.');
        logout();
      } else {
        alert('خطا در دریافت نتایج');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenModal(sub: Submission) {
  setModalLoading(true);
  try {
    const res = await api.get(`/api/questions/${encodeURIComponent(sub.quizId)}`);
    const data = res.data;

    let quiz: Question[] = [];
    if (Array.isArray(data)) quiz = data;
    else if (Array.isArray((data as any).questions)) quiz = (data as any).questions;

    // ارسال quizTitle به modalData
    setModalData({ submission: { ...sub, quizTitle: sub.quizTitle }, quiz });
  } catch (err) {
    console.error(err);
    alert('خطا در دریافت سوالات برای نمایش جزئیات');
  } finally {
    setModalLoading(false);
  }
}


  function handleCloseModal() {
    setModalData(null);
  }

  // ✅ ساخت لیست یکتا از آزمون‌ها برای فیلتر
  const quizOptions = useMemo(() => {
    const uniqueQuizzes = new Map<string, string>();
    results.forEach(r => {
      uniqueQuizzes.set(r.quizId, r.quizTitle || r.quizId);
    });
    return [{ id: 'all', title: 'همه آزمون‌ها' }, ...Array.from(uniqueQuizzes.entries()).map(([id, title]) => ({ id, title }))];
  }, [results]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return results.filter(r => {
      if (quizFilter !== 'all' && r.quizId !== quizFilter) return false;
      if (!s) return true;
      return (
        String(r.name).toLowerCase().includes(s) ||
        String(r.quizTitle).toLowerCase().includes(s) ||
        String(r.quizId).toLowerCase().includes(s)
      );
    });
  }, [results, search, quizFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortBy === 'score') return (a.score - b.score) * dir;
      if (sortBy === 'time') return (new Date(a.time).getTime() - new Date(b.time).getTime()) * dir;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'quizTitle') return a.quizTitle.localeCompare(b.quizTitle) * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
     <div className="flex flex-col items-center justify-start min-h-screen p-4 w-full overflow-x-hidden">
      <div className="w-full max-w-5xl bg-white/90 rounded-2xl shadow-lg p-6 backdrop-blur-sm border border-white/30">
      {!token ? (
        <>
          <h3 className="text-xl font-semibold mb-3">ورود ادمین</h3>
          <div className="space-y-3">
            <label className="block">
              <div className="text-sm text-gray-600">نام کاربری</div>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
            <label className="block">
              <div className="text-sm text-gray-600">رمز عبور</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
            <div className="flex gap-2">
              <button onClick={login} className="btn-primary" disabled={loggingIn}>
                {loggingIn ? 'در حال ورود...' : 'ورود'}
              </button>
              <button
                onClick={() => {
                  setUsername('');
                  setPassword('');
                }}
                className="btn-ghost"
              >
                پاک کردن
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold mb-2">داشبورد ادمین</h3>
              <div className="text-sm text-gray-600">
                نقش: <strong>{role}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={logout} className="btn-ghost">خروج</button>
            </div>
          </div>

          {/* فیلتر و جستجو */}
          <div className="mt-4 grid gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                placeholder="جستجو بر اساس نام یا آزمون"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="flex-1 border rounded-lg px-3 py-2"
              />
              <select
                value={quizFilter}
                onChange={e => {
                  setQuizFilter(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2"
              >
                {quizOptions.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* جدول نتایج */}
          <div className="w-full overflow-x-auto mt-8">
            {loading ? (
              <Loading />
            ) : (
              <table className="min-w-[600px] w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-center">زمان</th>
                    <th className="px-4 py-2 text-center">آزمون</th>
                    <th className="px-4 py-2 text-center">نام</th>
                    <th className="px-4 py-2 text-center">امتیاز</th>
                    <th className="px-4 py-2 text-center">جزئیات</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-center">
                        {moment(r.time).locale('fa').format('jYYYY/jMM/jDD HH:mm')}
                      </td>
                      <td className="px-4 py-2 text-center">{r.quizTitle}</td>
                      <td className="px-4 py-2 text-center">{r.name}</td>
                      <td className="px-4 py-2 text-center">{((r.score / Math.max(1, r.total)) * 100).toFixed(2) + '%'}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleOpenModal(r)}
                          className="btn-table"
                        >
                          جزئیات
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pageData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500">
                        نتیجه‌ای پیدا نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* دکمه‌های صفحه‌بندی (بیرون از جدول و اسکرول) */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(1)}
              className="btn-ghost"
              disabled={page === 1}
            >
              اول
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-ghost"
              disabled={page === 1}
            >
              قبلی
            </button>
            <span className="text-sm text-gray-600">
              صفحه {page} از {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn-ghost"
              disabled={page === totalPages}
            >
              بعدی
            </button>
            <button
              onClick={() => setPage(totalPages)}
              className="btn-ghost"
              disabled={page === totalPages}
            >
              آخر
            </button>
          </div>
/* modal loading */
          {modalLoading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
              <Loading />
            </div>
          )}

          <SubmissionModal open={!!modalData} onClose={handleCloseModal} data={modalData} />
        </>
      )}
      </div>
    </div>
  );
}
