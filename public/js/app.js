/* js/app.js */
/* Ilova: ekranlarni chizish, tugmalar va klaviatura. */
(function (MS) {
  'use strict';

  const S = MS.screens;
  const store = MS.store;
  const A = store.actions;
  const app = document.getElementById('app');
  let lastKey = '';

  /* ---------- chizish ---------- */
  function render() {
    const s = store.get();

    if (S.admin.active()) {
      app.className = 'app app--admin';
      const top = lastKey === 'admin' ? app.scrollTop : 0;
      lastKey = 'admin';
      app.innerHTML = S.admin.render();
      S.admin.mount(app);
      app.scrollTop = top;
      return;
    }

    if (s.phase === 'setup') {
      lastKey = 'setup';
      app.className = 'app app--setup';
      app.innerHTML = S.setup.render();
      S.setup.mount(app);
      return;
    }

    const key = s.phase + ':' + (s.active ? s.active.qid : '');
    const prev = app.querySelector('.stage');
    const keepScroll = key === lastKey && prev ? prev.scrollTop : 0;

    const main = s.phase === 'board' ? S.board.render(s)
      : s.phase === 'question' ? S.question.render(s)
      : S.results.render(s);

    app.className = 'app app--game';
    app.innerHTML = `${S.shell.header(s)}
      <div class="layout">
        <main class="stage${key !== lastKey ? ' enter' : ''}">${main}</main>
        ${S.shell.teams(s)}
      </div>`;

    const stage = app.querySelector('.stage');
    if (keepScroll) stage.scrollTop = keepScroll;
    if (s.phase === 'question') S.question.mount(app, s);
    lastKey = key;
  }

  /* ---------- amallar ---------- */
  function prepareTimer() {
    const a = store.get().active;
    const q = a && store.question(a.qid);
    MS.timer.prepare(MS.timer.durationFor(q ? q.value : 0));
  }

  const handlers = {
    'team-count': (el) => { S.setup.setCount(Number(el.dataset.n)); render(); },
    open: (el) => { A.openQuestion(el.dataset.qid); prepareTimer(); },
    select: (el) => A.select(el.dataset.letter),
    confirm: () => { MS.timer.freeze(); A.confirm(); },
    skip: () => { MS.timer.freeze(); A.skip(); },
    undo: () => A.undo(),
    next: () => A.next(),
    'show-results': () => { S.results.clear(); A.showResults(); },
    'back-board': () => A.backToBoard(),
    'pick-team': (el) => { S.results.pick(Number(el.dataset.index)); render(); },
    'reset-ask': () => { S.results.askReset(true); render(); },
    'reset-cancel': () => { S.results.askReset(false); render(); },
    'reset-confirm': () => { S.results.clear(); MS.timer.prepare(MS.config.timer.short); A.reset(); },
    'timer-toggle': () => MS.timer.toggle(),
    'timer-set': (el) => MS.timer.setDuration(Number(el.dataset.sec)),
    'timer-reset': () => MS.timer.reset(),
    expand: (el) => S.question.toggleClamp(el),
    fullscreen: () => {
      const d = document;
      try {
        if (d.fullscreenElement) d.exitFullscreen();
        else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {});
      } catch (e) { /* to'liq ekran qo'llab-quvvatlanmaydi */ }
    }
  };

  app.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled || !app.contains(el)) return;
    if (S.admin.active()) {
      const r = S.admin.handle(el, app);
      if (!r) return;
      render();
      if (r === 'top') app.scrollTop = 0;
      if (r === 'focus-last') {
        const opts = app.querySelectorAll('[data-opt]');
        if (opts.length) opts[opts.length - 1].focus();
      }
      return;
    }
    const fn = handlers[el.dataset.action];
    if (fn) fn(el);
  });

  /* ---------- klaviatura (moderator uchun) ----------
     1–5 yoki A–E — variant, Enter — tasdiqlash / keyingi,
     Probel — taymer */
  const KEY_LETTER = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', a: 'A', b: 'B', c: 'C', d: 'D', e: 'E' };

  document.addEventListener('keydown', (e) => {
    const s = store.get();
    if (S.admin.active() || s.phase !== 'question' || e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    const a = s.active;
    const k = e.key.toLowerCase();

    if (KEY_LETTER[k] && !a.outcome) { A.select(KEY_LETTER[k]); return; }
    if (k === 'enter') {
      e.preventDefault();
      if (a.outcome) A.next();
      else if (a.selected) handlers.confirm();
      return;
    }
    if (k === ' ' && !a.outcome) { e.preventDefault(); MS.timer.toggle(); }
  });

  /* ---------- ishga tushirish ---------- */
  S.admin.bind(render);
  window.addEventListener('hashchange', () => { S.admin.route(); render(); window.scrollTo(0, 0); app.scrollTop = 0; });
  S.admin.route();
  store.subscribe(render);
  A.init();
  if (store.get().phase === 'question' && !MS.timer.restore()) prepareTimer();
  render();
})(window.MS);
