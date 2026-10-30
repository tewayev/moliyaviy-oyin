/* js/core/store.js */
/* O'yin holati: yagona manba, barcha o'zgarishlar shu yerdagi amallar orqali.
   Holat har amaldan keyin brauzerda saqlanadi (sahifa yangilansa tiklanadi). */
(function (MS) {
  'use strict';

  const C = MS.config;
  const listeners = new Set();
  const views = new Map();   // savol id -> ko'rsatish uchun tayyor ko'rinish (kesh)

  const fresh = () => ({
    v: 3,
    phase: 'setup',      // setup | board | question | results
    teams: [],           // [{ name, balance, correct, wrong, skipped }]
    current: 0,          // navbatdagi jamoa indeksi
    deal: {},            // qid ("mavzu:qiymat") -> shu o'yin uchun serverdan kelgan savol
    used: {},            // qid -> { team, outcome }
    active: null,        // { qid, selected, outcome, delta }
    history: [],         // "Bekor qilish" uchun nusxalar
    finished: false
  });

  let state = fresh();

  /* ---------- saqlash ---------- */
  function save() {
    try { localStorage.setItem(C.storageKey, JSON.stringify(state)); } catch (e) { /* saqlash mumkin emas */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(C.storageKey);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.v !== 3 || !Array.isArray(s.teams) || !s.teams.length || !s.deal) return null;
      if (s.active && !question(s.active.qid, s)) { s.active = null; s.phase = 'board'; }
      return Object.assign(fresh(), s);
    } catch (e) { return null; }
  }

  function clear() {
    try { localStorage.removeItem(C.storageKey); } catch (e) { /* e'tiborsiz */ }
  }

  /* ---------- obuna ---------- */
  function commit(patch) {
    state = Object.assign({}, state, patch);
    save();
    listeners.forEach((fn) => fn(state));
  }

  const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  const get = () => state;

  /* ---------- hisob-kitob yordamchilari ---------- */
  /* Katakka shu o'yinda tushgan savol (ko'rsatish uchun tayyor ko'rinishda) */
  function question(qid, s = state) {
    const f = s.deal && s.deal[qid];
    if (!f) return null;
    if (!views.has(f.id)) views.set(f.id, MS.format.question(f));
    return views.get(f.id);
  }

  const cells = (s = state) => Object.keys(s.deal || {});

  function remaining(s = state) {
    return cells(s).filter((id) => !s.used[id]).length;
  }

  function snapshot() {
    return JSON.stringify({ teams: state.teams, used: state.used, active: state.active });
  }

  /* ---------- amallar ---------- */
  const actions = {
    init() {
      const saved = load();
      if (saved) state = saved;
      listeners.forEach((fn) => fn(state));
    },

    /* Serverdan shu o'yin uchun savollarni oladi. Xato bo'lsa, Error tashlanadi. */
    async startGame(names) {
      const res = await MS.api.deal(MS.seen.read());
      MS.seen.reset(res.reset);
      if (!Object.keys(res.questions || {}).length) throw new Error('Bazada hali savol yo‘q. Admin panelda savol qo‘shing');
      const teams = names.map((name) => ({
        name, balance: C.startCapital, correct: 0, wrong: 0, skipped: 0
      }));
      views.clear();
      state = Object.assign(fresh(), { phase: 'board', teams, deal: res.questions });
      commit({});
    },

    openQuestion(qid) {
      if (state.phase !== 'board' || state.used[qid] || !question(qid)) return;
      MS.seen.mark(qid, state.deal[qid].id);
      commit({ phase: 'question', active: { qid, selected: null, outcome: null, delta: 0 } });
    },

    select(letter) {
      const a = state.active;
      const q = a && question(a.qid);
      if (!q || a.outcome || C.letters.indexOf(letter) < 0 || C.letters.indexOf(letter) >= q.options.length) return;
      commit({ active: Object.assign({}, a, { selected: a.selected === letter ? null : letter }) });
    },

    confirm() {
      const a = state.active;
      if (!a || a.outcome || !a.selected) return;
      const q = question(a.qid);
      if (!q) return;
      resolve(a.selected === q.answer ? 'correct' : 'wrong');
    },

    skip() {
      const a = state.active;
      if (!a || a.outcome || !question(a.qid)) return;
      resolve('skip');
    },

    undo() {
      const a = state.active;
      if (!a || !a.outcome || !state.history.length) return;
      const history = state.history.slice();
      const prev = JSON.parse(history.pop());
      commit({
        teams: prev.teams,
        used: prev.used,
        active: Object.assign({}, prev.active, { selected: a.selected, outcome: null, delta: 0 }),
        history
      });
    },

    next() {
      if (!state.active || !state.active.outcome) return;
      const n = state.teams.length;
      const current = (state.current + 1) % n;
      const left = remaining();
      // Barcha jamoalar teng marta o'ynashi uchun: yangi raund boshida savol yetmasa, o'yin tugaydi.
      const finished = left === 0 || (current === 0 && left < n);
      commit({ current, active: null, phase: finished ? 'results' : 'board', finished });
    },

    showResults() {
      if (state.phase === 'board') commit({ phase: 'results' });
    },

    backToBoard() {
      if (state.phase === 'results' && !state.finished) commit({ phase: 'board' });
    },

    reset() {
      clear();
      state = fresh();
      listeners.forEach((fn) => fn(state));
    }
  };

  function resolve(outcome) {
    const a = state.active;
    const q = question(a.qid);
    const delta = outcome === 'correct' ? q.value : outcome === 'wrong' ? -q.value : 0;
    const history = state.history.concat(snapshot()).slice(-C.historyLimit);

    const teams = state.teams.map((t, i) => {
      if (i !== state.current) return t;
      const key = outcome === 'correct' ? 'correct' : outcome === 'wrong' ? 'wrong' : 'skipped';
      return Object.assign({}, t, { balance: t.balance + delta, [key]: t[key] + 1 });
    });

    const used = Object.assign({}, state.used, { [a.qid]: { team: state.current, outcome } });
    commit({ teams, used, history, active: Object.assign({}, a, { outcome, delta }) });
  }

  MS.store = { get, subscribe, actions, remaining, question, cells };
})(window.MS);
