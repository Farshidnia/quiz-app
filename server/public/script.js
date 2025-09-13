// public/script.js
let questions = [];
let answers = {};
let timerInterval;
let totalTime = 0;
let remainingTime = 0;
let quizId = "";

// DOM Elements
const startForm = document.getElementById('start-form');
const quizForm = document.getElementById('quiz-form');
const questionsContainer = document.getElementById('questions-container');
const resultContainer = document.getElementById('result');
const timerElement = document.getElementById('timer');

// شروع آزمون
startForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(startForm);
  const name = formData.get('name').trim();
  quizId = formData.get('quizId').trim();

  if (!name || !quizId) {
    alert('لطفا نام و آزمون را وارد کنید');
    return;
  }

  try {
    const res = await fetch(`/api/questions/${encodeURIComponent(quizId)}`);
    if (!res.ok) throw new Error('خطا در دریافت سوالات');

    questions = await res.json();

    if (questions.length === 0) {
      alert('هیچ سوالی برای این آزمون یافت نشد');
      return;
    }

    // زمان کل: 1 دقیقه به ازای هر سوال
    totalTime = questions.length * 60;
    remainingTime = totalTime;

    startForm.classList.add('hidden');
    quizForm.classList.remove('hidden');
    timerElement.classList.remove('hidden');

    renderQuestions();
    startTimer();
  } catch (err) {
    console.error(err);
    alert('خطا در برقراری ارتباط با سرور');
  }
});

function renderQuestions() {
  questionsContainer.innerHTML = '';
  questions.forEach((q, idx) => {
    const div = document.createElement('div');
    div.classList.add('question');

    const optionsHtml = q.options.map(opt => `
      <label>
        <input type="radio" name="q${q.id}" value="${opt}" />
        ${opt}
      </label>
    `).join('');

    div.innerHTML = `<p>${idx + 1}. ${q.question}</p>${optionsHtml}`;
    questionsContainer.appendChild(div);
  });
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    remainingTime--;
    updateTimerDisplay();
    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      submitQuiz();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  timerElement.textContent = `زمان باقی‌مانده: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// ارسال پاسخ‌ها
quizForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearInterval(timerInterval);

  // جمع‌آوری پاسخ‌های انتخابی
  answers = {};
  questions.forEach(q => {
    const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
    answers[q.id] = selected ? selected.value : null;
  });

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('user-name').value,
        quizId,
        answers
      })
    });

    const result = await res.json();
    quizForm.classList.add('hidden');
    timerElement.classList.add('hidden');

    resultContainer.classList.remove('hidden');
    resultContainer.textContent = `امتیاز شما: ${result.score} از ${result.total}`;
  } catch (err) {
    console.error(err);
    alert('خطا در ارسال نتایج');
  }
});
