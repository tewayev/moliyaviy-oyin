/* js/screens/setup.js */
/* Sozlash ekrani: jamoalar soni va nomlari. */
(function (MS) {
  'use strict';

  const C = MS.config;
  const { esc, money } = MS.dom;

  const ui = { count: C.defaultTeamCount, names: [], busy: false };

  function render() {
    const inputs = Array.from({ length: ui.count }, (_, i) => `
      <label class="field" for="team-${i}">
        <span class="field__num">${i + 1}</span>
        <input id="team-${i}" class="field__input" type="text" maxlength="24" autocomplete="off"
               placeholder="${i + 1}-jamoa nomi" value="${esc(ui.names[i] || '')}" data-input="team" data-index="${i}">
      </label>`).join('');

    const counts = C.teamCounts.map((n) => `
      <button class="seg__btn${n === ui.count ? ' is-on' : ''}" data-action="team-count" data-n="${n}" aria-pressed="${n === ui.count}">${n}</button>`).join('');

    return `
      <main class="setup">
        <div class="topbar"><a class="admin-link" href="#admin">${MS.icon('sliders')}<span>Admin Panel</span></a></div>
        <section class="setup__intro">
          <p class="eyebrow">Intellektual o‘yin</p>
          <h1 class="setup__title">Moliyaviy savodxonlik</h1>
          <p class="setup__lead">Maqsad — moliyaviy bilimingiz bilan eng ko‘p pul yig‘ish. O‘yin oxirida balansi eng katta jamoa g‘olib bo‘ladi.</p>
          <ul class="rules">
            <li>${MS.icon('wallet')}<span>Har bir jamoa <b>${money(C.startCapital)}</b> bilan boshlaydi. Navbat kelganda mavzu va savol qiymatini o‘zingiz tanlaysiz.</span></li>
            <li>${MS.icon('grid')}<span>To‘g‘ri javob uchun savol qiymati balansga <b>qo‘shiladi</b>, xato javob uchun <b>ayriladi</b>. Qiymat qancha katta bo‘lsa, xavf ham shuncha katta.</span></li>
            <li>${MS.icon('clock')}<span>Har bir savolga <b>${C.timer.short / 60}:00</b> yoki <b>${Math.floor(C.timer.long / 60)}:${String(C.timer.long % 60).padStart(2, '0')}</b> vaqt beriladi. Jamoa bilan maslahatlashib, shu vaqt ichida javob bering.</span></li>
          </ul>
        </section>

        <section class="setup__card card">
          <h2 class="h2">Jamoalar</h2>
          <div class="setup__count">
            <div class="seg" role="group" aria-label="Jamoalar soni">${counts}</div>
          </div>
          <form class="setup__fields" data-form="setup" novalidate>
            ${inputs}
            <button type="submit" class="btn btn--accent btn--xl btn--block" data-t="start" disabled>
              <span>O‘yinni boshlash</span>${MS.icon('arrowRight')}
            </button>
            <p class="hint" data-t="hint">Barcha jamoalar nomini kiriting</p>
          </form>
        </section>
      </main>`;
  }

  function names() {
    return Array.from({ length: ui.count }, (_, i) => (ui.names[i] || '').trim());
  }

  function validate(root) {
    const list = names();
    const filled = list.every(Boolean);
    const unique = new Set(list.map((n) => n.toLowerCase())).size === list.length;
    const btn = root.querySelector('[data-t="start"]');
    const hint = root.querySelector('[data-t="hint"]');
    btn.disabled = !(filled && unique);
    hint.textContent = !filled ? 'Barcha jamoalar nomini kiriting' : !unique ? 'Jamoa nomlari takrorlanmasligi kerak' : 'Tayyor';
    hint.classList.toggle('is-ok', filled && unique);
    hint.classList.remove('is-bad');
    return filled && unique;
  }

  function mount(root) {
    validate(root);
    const form = root.querySelector('[data-form="setup"]');
    form.addEventListener('input', (e) => {
      const el = e.target.closest('[data-input="team"]');
      if (!el) return;
      ui.names[Number(el.dataset.index)] = el.value;
      validate(root);
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (ui.busy || !validate(root)) return;
      const btn = root.querySelector('[data-t="start"]');
      const hint = root.querySelector('[data-t="hint"]');
      ui.busy = true;
      btn.disabled = true;
      btn.innerHTML = `<span class="spin" aria-hidden="true"></span><span>Savollar tayyorlanmoqda…</span>`;
      try {
        await MS.store.actions.startGame(names());
      } catch (err) {
        btn.innerHTML = `<span>O‘yinni boshlash</span>${MS.icon('arrowRight')}`;
        validate(root);
        hint.textContent = err.message;
        hint.classList.remove('is-ok');
        hint.classList.add('is-bad');
      } finally {
        ui.busy = false;
      }
    });
    const first = root.querySelector('#team-0');
    if (first && !first.value) first.focus({ preventScroll: true });
  }

  function setCount(n) {
    ui.count = n;
  }

  MS.screens = MS.screens || {};
  MS.screens.setup = { render, mount, setCount };
})(window.MS);
