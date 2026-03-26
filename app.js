const APP_KEY = 'leikskola_math_pwa_v1';
const EMOJIS = ['🍎','⭐','🐻','🚗','🟡','🐶','🦋','🍓','⚽','🌼'];
const MODES = [
  'Telja hluti',
  'Finna réttan fjölda',
  'Hvað kemur næst?',
  'Hvað kemur á undan?',
  'Hvað er stærra?',
  'Jafnmargir?',
  'Mynstur'
];

const state = {
  data: loadData(),
  selectedStudent: '',
  mode: MODES[0],
  questionCount: 10,
  session: null,
  installPrompt: null,
};

function loadData() {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.students ||= {};
      parsed.sessions ||= [];
      parsed.lastStudent ||= '';
      return parsed;
    }
  } catch {}
  return { students: {}, sessions: [], lastStudent: '' };
}
function saveData() { localStorage.setItem(APP_KEY, JSON.stringify(state.data)); }
function studentTemplate() {
  return { sessions: 0, correct: 0, wrong: 0, bestCpm: {}, lastPlayed: '' };
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample(arr, n) { return shuffle(arr).slice(0, n); }
function pickDistinctNumbers(min, max, count, exclude=[]) {
  const pool = [];
  for (let i=min;i<=max;i++) if (!exclude.includes(i)) pool.push(i);
  return sample(pool, count);
}
function makeObjects(n, emoji=null) {
  const em = emoji || EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
  return Array.from({length:n}, () => em).join(' ');
}
function formatDate(dt) { return new Date(dt).toLocaleString('is-IS'); }

function render() {
  const app = document.getElementById('app');
  if (!state.selectedStudent) state.selectedStudent = state.data.lastStudent || Object.keys(state.data.students)[0] || '';
  if (state.session) return renderGame(app);
  return renderHome(app);
}

function shell(inner) {
  return `<div class="app-shell">
    <div class="topbar">
      <div class="title">Grunn stærðfræði</div>
      <div class="row">
        <button class="btn btn-ghost" id="progressBtn">Yfirlit</button>
        <button class="btn btn-secondary" id="installBtn" style="display:none">Setja upp app</button>
      </div>
    </div>
    ${inner}
  </div>`;
}

function renderHome(app) {
  const students = Object.keys(state.data.students).sort((a,b)=>a.localeCompare(b));
  app.innerHTML = shell(`
    <div class="home-grid">
      <div class="card">
        <div class="section-title">Veldu nemanda</div>
        <div class="row">
          <div style="flex:1; min-width:240px">
            <label class="small">Núverandi nemandi</label>
            <select id="studentSelect">
              <option value="">Veldu nemanda</option>
              ${students.map(s=>`<option value="${escapeHtml(s)}" ${s===state.selectedStudent?'selected':''}>${escapeHtml(s)}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1; min-width:220px">
            <label class="small">Nýr nemandi</label>
            <input id="newStudent" placeholder="Skrifa nafn" />
          </div>
          <div style="display:flex; align-items:end">
            <button class="btn btn-success" id="addStudentBtn">Nýr nemandi</button>
          </div>
        </div>

        <div style="height:18px"></div>
        <div class="row" style="align-items:end">
          <div style="min-width:200px; flex:1">
            <label class="small">Fjöldi spurninga</label>
            <select id="questionCount">
              ${[5,10,15].map(n=>`<option value="${n}" ${n===state.questionCount?'selected':''}>${n}</option>`).join('')}
            </select>
          </div>
          <div>
            <button class="btn btn-primary big-start" id="startBtn">Byrja</button>
          </div>
        </div>

        <div style="height:22px"></div>
        <div class="section-title">Veldu æfingu</div>
        <div class="mode-grid" id="modeGrid">
          ${MODES.map(m=>`<button class="mode-tile ${m===state.mode?'active':''}" data-mode="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="section-title">Hvað er inni í forritinu?</div>
        <div style="font-size:1.15rem; line-height:1.6">
          • Telja hluti<br>
          • Para tölu og fjölda<br>
          • Hvað kemur næst?<br>
          • Hvað kemur á undan?<br>
          • Hvað er stærra?<br>
          • Jafnmargir?<br>
          • Einföld mynstur
        </div>
        <div style="height:22px"></div>
        <div class="small"><strong>Síðasti nemandi:</strong> ${state.data.lastStudent ? escapeHtml(state.data.lastStudent) : 'Enginn enn'}</div>
        <div style="height:12px"></div>
        <div class="small">Forritið vistar niðurstöður á þessu tæki og heldur utan um einfalt yfirlit fyrir hvern nemanda.</div>
      </div>
    </div>
  `);
  bindHome();
}

function bindHome() {
  document.getElementById('studentSelect').addEventListener('change', e => {
    state.selectedStudent = e.target.value;
    state.data.lastStudent = state.selectedStudent;
    saveData();
  });
  document.getElementById('addStudentBtn').addEventListener('click', () => {
    const name = document.getElementById('newStudent').value.trim();
    if (!name) return alert('Skrifaðu nafn nemanda.');
    state.data.students[name] ||= studentTemplate();
    state.selectedStudent = name;
    state.data.lastStudent = name;
    saveData();
    render();
  });
  document.getElementById('questionCount').addEventListener('change', e => state.questionCount = Number(e.target.value));
  document.getElementById('startBtn').addEventListener('click', startSession);
  document.querySelectorAll('.mode-tile').forEach(btn => btn.addEventListener('click', () => { state.mode = btn.dataset.mode; render(); }));
  document.getElementById('progressBtn').addEventListener('click', showProgressModal);
  const installBtn = document.getElementById('installBtn');
  if (state.installPrompt) {
    installBtn.style.display = 'inline-block';
    installBtn.onclick = async () => {
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      installBtn.style.display = 'none';
    };
  }
}

function buildQuestion(mode) {
  const n = Math.floor(Math.random()*9)+1;
  switch(mode) {
    case 'Telja hluti': {
      const correct = n;
      const options = shuffle([correct, ...pickDistinctNumbers(1, 10, 2, [correct])]);
      return { prompt: 'Hvað eru margir hlutir?', display: makeObjects(n), options, correct, type:'number' };
    }
    case 'Finna réttan fjölda': {
      const target = n;
      const emoji = EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
      const correct = makeObjects(target, emoji);
      const wrongNums = pickDistinctNumbers(1, 10, 2, [target]);
      const options = shuffle([correct, ...wrongNums.map(x => makeObjects(x, emoji))]);
      return { prompt: `Finndu mynd með ${target}`, display: String(target), options, correct, type:'objects' };
    }
    case 'Hvað kemur næst?': {
      const start = Math.floor(Math.random()*8)+1;
      const correct = start + 1;
      const options = shuffle([correct, ...pickDistinctNumbers(1, 10, 2, [correct])]);
      return { prompt: 'Hvað kemur næst?', display: String(start), options, correct, type:'number' };
    }
    case 'Hvað kemur á undan?': {
      const num = Math.floor(Math.random()*8)+2;
      const correct = num - 1;
      const options = shuffle([correct, ...pickDistinctNumbers(1, 10, 2, [correct])]);
      return { prompt: 'Hvaða tala kemur á undan?', display: String(num), options, correct, type:'number' };
    }
    case 'Hvað er stærra?': {
      let a = Math.floor(Math.random()*9)+1;
      let b = Math.floor(Math.random()*9)+1;
      while (a===b) b = Math.floor(Math.random()*9)+1;
      const correct = Math.max(a,b);
      return { prompt: 'Hvaða tala er stærri?', display: `${a}    eða    ${b}`, options:[a,b], correct, type:'number' };
    }
    case 'Jafnmargir?': {
      const equal = Math.random() < 0.5;
      const left = Math.floor(Math.random()*8)+1;
      const right = equal ? left : pickDistinctNumbers(1,10,1,[left])[0];
      const correct = equal ? 'Já' : 'Nei';
      return { prompt: 'Eru jafnmargir hlutir?', display: `${makeObjects(left)}\n\n${makeObjects(right)}`, options:['Já','Nei'], correct, type:'text' };
    }
    case 'Mynstur': {
      const sets = [
        { seq:['🔴','🔵','🔴','🔵'], next:'🔴', wrong:['🔵','🟢'] },
        { seq:['⭐','⭐','🌙','⭐','⭐','🌙'], next:'⭐', wrong:['🌙','☀️'] },
        { seq:['🟨','🟩','🟨','🟩'], next:'🟨', wrong:['🟩','🟥'] },
        { seq:['🍎','🍌','🍎','🍌'], next:'🍎', wrong:['🍌','🍓'] },
      ];
      const s = sets[Math.floor(Math.random()*sets.length)];
      const options = shuffle([s.next, ...s.wrong]);
      return { prompt: 'Hvað kemur næst í mynstrinu?', display: s.seq.join('  '), options, correct: s.next, type:'text' };
    }
  }
}

function startSession() {
  if (!state.selectedStudent) return alert('Veldu eða búðu til nemanda fyrst.');
  state.data.students[state.selectedStudent] ||= studentTemplate();
  state.data.lastStudent = state.selectedStudent;
  saveData();
  const questions = [];
  const used = new Set();
  let tries = 0;
  while (questions.length < state.questionCount && tries < 200) {
    const q = buildQuestion(state.mode);
    const key = JSON.stringify([q.prompt, q.display, q.correct]);
    if (!used.has(key)) {
      used.add(key);
      questions.push(q);
    }
    tries++;
  }
  state.session = {
    student: state.selectedStudent,
    mode: state.mode,
    startedAt: Date.now(),
    questionIndex: 0,
    questions,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    feedback: '',
    feedbackClass: '',
    selected: null,
    locked: false,
  };
  render();
}

function renderGame(app) {
  const s = state.session;
  const q = s.questions[s.questionIndex];
  app.innerHTML = shell(`
    <div class="card game-card">
      <div class="row" style="width:100%; justify-content:space-between; align-items:center;">
        <button class="btn btn-ghost" id="backBtn">Til baka</button>
        <div class="progress">${escapeHtml(s.student)} · ${escapeHtml(s.mode)} · Spurning ${s.questionIndex+1}/${s.questions.length}</div>
        <div class="progress">Rétt: ${s.correct} · Rangt: ${s.wrong}</div>
      </div>
      <div class="prompt">${escapeHtml(q.prompt)}</div>
      <div class="object-display">${escapeHtml(q.display).replaceAll('\n','<br>')}</div>
      <div class="option-grid" id="optionGrid">
        ${q.options.map(opt => {
          const selectedClass = s.selected===opt ? (opt===q.correct ? 'selected-correct' : 'selected-wrong') : '';
          return `<button class="option-btn ${selectedClass}" data-opt="${encodeURIComponent(String(opt))}">${escapeHtml(String(opt)).replaceAll('\n','<br>')}</button>`;
        }).join('')}
      </div>
      <div class="feedback ${s.feedbackClass}">${escapeHtml(s.feedback)}</div>
      <div class="small">Röð: ${s.streak} · Besta röð: ${s.bestStreak}</div>
    </div>
  `);
  document.getElementById('backBtn').onclick = () => { if (confirm('Hætta í lotu?')) { state.session = null; render(); } };
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = s.locked;
    btn.onclick = () => answerClicked(decodeURIComponent(btn.dataset.opt));
  });
}

function answerClicked(rawOpt) {
  const s = state.session;
  if (!s || s.locked) return;
  const q = s.questions[s.questionIndex];
  const selected = convertType(rawOpt, q.correct);
  s.selected = selected;
  if (selected === q.correct) {
    s.correct++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.feedback = 'Rétt!';
    s.feedbackClass = 'correct';
    s.locked = true;
    render();
    setTimeout(() => nextQuestion(), 650);
  } else {
    s.wrong++;
    s.streak = 0;
    s.feedback = 'Rangt, reyndu aftur.';
    s.feedbackClass = 'wrong';
    render();
  }
}
function convertType(raw, correct) {
  if (typeof correct === 'number') return Number(raw);
  return raw;
}
function nextQuestion() {
  const s = state.session;
  s.questionIndex++;
  s.selected = null;
  s.locked = false;
  s.feedback = '';
  s.feedbackClass = '';
  if (s.questionIndex >= s.questions.length) return finishSession();
  render();
}

function finishSession() {
  const s = state.session;
  const mins = Math.max((Date.now() - s.startedAt) / 60000, 1/60);
  const cpm = s.correct / mins;
  const student = state.data.students[s.student] ||= studentTemplate();
  student.sessions += 1;
  student.correct += s.correct;
  student.wrong += s.wrong;
  student.lastPlayed = new Date().toISOString();
  const bestKey = s.mode;
  const prevBest = student.bestCpm[bestKey] || 0;
  const isRecord = cpm > prevBest;
  if (isRecord) student.bestCpm[bestKey] = cpm;
  state.data.sessions.push({
    when: new Date().toISOString(), student: s.student, mode: s.mode,
    total: s.questions.length, correct: s.correct, wrong: s.wrong,
    cpm: Number(cpm.toFixed(2)), bestStreak: s.bestStreak
  });
  state.data.lastStudent = s.student;
  saveData();

  const app = document.getElementById('app');
  app.innerHTML = shell(`
    <div class="card center">
      <div class="section-title">Lota búin!</div>
      <div class="summary-grid">
        <div class="summary-box"><div class="small">Rétt</div><div class="prompt">${s.correct}</div></div>
        <div class="summary-box"><div class="small">Rangt</div><div class="prompt">${s.wrong}</div></div>
        <div class="summary-box"><div class="small">Rétt á mínútu</div><div class="prompt">${cpm.toFixed(1)}</div></div>
        <div class="summary-box"><div class="small">Besta röð</div><div class="prompt">${s.bestStreak}</div></div>
      </div>
      <div style="height:16px"></div>
      <div class="feedback ${isRecord?'correct':''}">${isRecord ? 'Nýtt met!' : `Best áður: ${prevBest.toFixed(1)} rétt á mínútu`}</div>
      <div style="height:16px"></div>
      <div class="row" style="justify-content:center;">
        <button class="btn btn-primary" id="playAgainBtn">Spila aftur</button>
        <button class="btn btn-ghost" id="homeBtn">Heim</button>
      </div>
    </div>
  `);
  document.getElementById('playAgainBtn').onclick = () => { state.session = null; startSession(); };
  document.getElementById('homeBtn').onclick = () => { state.session = null; render(); };
}

function showProgressModal() {
  const students = Object.keys(state.data.students).sort((a,b)=>a.localeCompare(b));
  const rows = students.map(name => {
    const st = state.data.students[name];
    return `<tr><td>${escapeHtml(name)}</td><td>${st.sessions}</td><td>${st.correct}</td><td>${st.wrong}</td><td>${st.lastPlayed ? formatDate(st.lastPlayed) : '-'}</td></tr>`;
  }).join('') || '<tr><td colspan="5">Engin gögn enn.</td></tr>';
  const recent = state.data.sessions.slice(-10).reverse().map(s =>
    `<tr><td>${formatDate(s.when)}</td><td>${escapeHtml(s.student)}</td><td>${escapeHtml(s.mode)}</td><td>${s.correct}/${s.total}</td><td>${s.cpm}</td></tr>`
  ).join('') || '<tr><td colspan="5">Engar lotur enn.</td></tr>';

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; padding:16px; z-index:9999;';
  overlay.innerHTML = `
    <div class="card" style="max-width:1100px; width:100%; max-height:90vh; overflow:auto;">
      <div class="topbar" style="margin-bottom:8px;"><div class="section-title">Yfirlit</div><button class="btn btn-danger" id="closeModal">Loka</button></div>
      <div class="row">
        <div style="flex:1; min-width:320px;" class="card">
          <div class="section-title">Nemendur</div>
          <table class="table"><thead><tr><th>Nafn</th><th>Lotur</th><th>Rétt</th><th>Rangt</th><th>Síðast</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
        <div style="flex:1; min-width:320px;" class="card">
          <div class="section-title">Síðustu lotur</div>
          <table class="table"><thead><tr><th>Tími</th><th>Nemandi</th><th>Æfing</th><th>Útkoma</th><th>RPM</th></tr></thead><tbody>${recent}</tbody></table>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#closeModal').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.installPrompt = e;
  const btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'inline-block';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}

render();
