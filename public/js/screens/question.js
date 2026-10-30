/* js/screens/question.js */
/* Savol ekrani: chapda savol va variantlar, o'ngda taymer yoki natija. */
(function (MS) {
  'use strict';

  const C = MS.config;
  const { esc, signed } = MS.dom;

  /* ---------- matn bloklari ---------- */
  function block(b) {
    if (typeof b === 'string') return `<p>${esc(b)}</p>`;
    if (b.list) return `<ul class="q-list">${b.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    if (b.cards) {
      return `<div class="q-cards" style="--n:${b.cards.length}">${b.cards.map((c) => `
        <div class="q-card">
          <h4>${esc(c.title)}</h4>
          <ul>${c.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>`).join('')}</div>`;
    }
    if (b.calc) return `<div class="calc">${b.calc.map((x) => `<div>${esc(x)}</div>`).join('')}</div>`;
    return '';
  }

  function optionClass(letter, a, answer) {
    if (!a.outcome) return letter === a.selected ? ' is-selected' : '';
    if (letter === answer) return ' is-correct';
    if (letter === a.selected && a.outcome === 'wrong') return ' is-wrong';
    return ' is-dim';
  }

  function options(q, a) {
    const mark = { 'is-correct': 'check', 'is-wrong': 'x' };
    return q.options.map((text, i) => {
      const L = C.letters[i];
      const cls = optionClass(L, a, q.answer).trim();
      const ic = mark[cls] ? `<span class="opt__mark">${MS.icon(mark[cls])}</span>` : '';
      return `
        <button class="opt ${cls}" data-action="select" data-letter="${L}" ${a.outcome ? 'disabled' : ''} aria-pressed="${L === a.selected}">
          <span class="opt__key">${L}</span>
          <span class="opt__text">${esc(text)}</span>${ic}
        </button>`;
    }).join('');
  }

  /* ---------- o'ng panel: taymer ---------- */
  function controlPanel(a) {
    return `
      <div class="panel panel--timer">
        <div data-timer-root>${MS.timer.markup()}</div>
        <div class="panel__foot">
          <button class="btn btn--accent btn--lg btn--block" data-action="confirm" ${a.selected ? '' : 'disabled'}>
            ${MS.icon('check')}<span>${a.selected ? `${a.selected} javobni tasdiqlash` : 'Javobni tanlang'}</span>
          </button>
          <button class="btn btn--ghost btn--block" data-action="skip">${MS.icon('skip')}<span>Javobsiz yakunlash</span></button>
          <p class="hint">Vaqt tugasa ham javobni tanlash mumkin. Javob berilmasa, «Javobsiz» balansni o‘zgartirmaydi.</p>
        </div>
      </div>`;
  }

  /* ---------- o'ng panel: natija ---------- */
  const RESULT = {
    correct: ['check', 'To‘g‘ri!'],
    wrong: ['x', 'Noto‘g‘ri'],
    skip: ['minus', 'Javobsiz']
  };

  function clampBox(key, head, icon, inner) {
    return `
      <section class="note" data-clamp-box="${key}">
        <h3 class="note__head">${MS.icon(icon)}<span>${head}</span></h3>
        <div class="note__body" data-clamp>${inner}</div>
        <button class="more" data-action="expand" hidden><span>Batafsil</span>${MS.icon('chevronDown')}</button>
      </section>`;
  }

  function resultPanel(s, q, a) {
    const team = s.teams[s.current];
    const nextTeam = s.teams[(s.current + 1) % s.teams.length];
    const [ic, label] = RESULT[a.outcome];

    const explain = q.explain.map(block).join('');
    const terms = q.terms.map((t) => `
      <div class="term">
        <div class="term__name">${esc(t.name)}${t.en ? ` <span class="term__en">${esc(t.en)}</span>` : ''}</div>
        <p>${esc(t.def)}</p>
      </div>`).join('') + q.notes.map((n) => `<p class="${q.terms.length ? 'term__note' : ''}">${esc(n)}</p>`).join('');

    return `
      <div class="panel panel--result">
        <div class="result result--${a.outcome}">
          <span class="result__icon">${MS.icon(ic)}</span>
          <div class="result__text">
            <span class="result__label">${label}</span>
            <span class="result__team">${esc(team.name)}</span>
          </div>
          <span class="result__amount">${signed(a.delta)}</span>
        </div>
        <div class="answer">
          <span class="answer__key">To‘g‘ri javob · ${q.answer}</span>
          ${q.short ? `<p class="answer__short">${esc(q.short)}</p>` : `<p class="answer__short">${esc(q.options[C.letters.indexOf(q.answer)])}</p>`}
        </div>
        ${explain ? clampBox('explain', 'Izoh', 'bulb', explain) : ''}
        ${terms ? clampBox('terms', 'Xulosa', 'book', terms) : ''}
        <div class="panel__actions">
          <button class="btn btn--ghost" data-action="undo" title="Oxirgi javobni bekor qilish">${MS.icon('undo')}<span>Bekor qilish</span></button>
          <button class="btn btn--primary btn--lg grow" data-action="next" title="Keyingi jamoa: ${esc(nextTeam.name)}">
            <span>Keyingi</span>${MS.icon('arrowRight')}
          </button>
        </div>
      </div>`;
  }

  /* ---------- ekran ---------- */
  function render(s) {
    const a = s.active;
    const q = MS.store.question(a.qid, s);
    const topic = MS.schema.TOPICS.find((t) => t.id === a.qid.split(':')[0]);
    const team = s.teams[s.current];

    return `
      <section class="q-screen${a.outcome ? ' is-revealed' : ''}">
        <article class="q-main">
          <div class="q-meta">
            <span class="tag">${MS.icon(topic ? topic.icon : 'grid')}<span>${esc(topic ? topic.title : '')}</span></span>
            <span class="q-value">$${q.value}</span>
            <span class="q-team">${esc(team.name)}</span>
          </div>
          <h2 class="q-title">${esc(q.title)}</h2>
          <div class="q-body">${q.body.map(block).join('')}</div>
          <p class="q-ask">${esc(q.ask)}</p>
          <div class="opts">${options(q, a)}</div>
        </article>
        <aside class="q-side">
          ${a.outcome ? resultPanel(s, q, a) : controlPanel(a)}
        </aside>
      </section>`;
  }

  /* "Batafsil" tugmasi va xiralik faqat matn haqiqatan sig'masa ko'rinadi.
     O'lcham o'zgarsa (oyna, to'liq ekran, shrift yuklanishi) qayta o'lchanadi. */
  let observer = null;

  function measure(box) {
    if (!box.isConnected || box.classList.contains('is-open')) return;
    const body = box.querySelector('[data-clamp]');
    const clipped = body.scrollHeight > body.clientHeight + 2;
    box.classList.toggle('is-clipped', clipped);
    box.querySelector('.more').hidden = !clipped;
  }

  function mount(root, s) {
    const timerRoot = root.querySelector('[data-timer-root]');
    if (timerRoot) MS.timer.mount(timerRoot);

    if (observer) observer.disconnect();
    const boxes = Array.from(root.querySelectorAll('[data-clamp-box]'));
    boxes.forEach(measure);
    if (!boxes.length) return;
    if (window.ResizeObserver) {
      observer = new ResizeObserver(() => boxes.forEach(measure));
      boxes.forEach((b) => observer.observe(b));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => boxes.forEach(measure));
  }

  function toggleClamp(btn) {
    const box = btn.closest('[data-clamp-box]');
    const open = box.classList.toggle('is-open');
    btn.querySelector('span').textContent = open ? 'Yig‘ish' : 'Batafsil';
  }

  MS.screens = MS.screens || {};
  MS.screens.question = { render, mount, toggleClamp };
})(window.MS);
