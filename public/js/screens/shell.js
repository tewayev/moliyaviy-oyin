/* js/screens/shell.js */
/* O'yin qobig'i: yuqori panel va jamoalar paneli (barcha o'yin ekranlari uchun umumiy). */
(function (MS) {
  'use strict';

  const { esc, money } = MS.dom;

  function header(s) {
    const total = MS.store.cells(s).length;
    const left = MS.store.remaining(s);

    // Ochiq savoldan faqat javob berib yoki "Javobsiz yakunlash" orqali chiqiladi.
    let actions = '';
    if (s.phase === 'board') {
      actions += `<button class="btn btn--ghost" data-action="show-results">${MS.icon('bars')}<span>Natijalar</span></button>`;
    } else if (s.phase === 'results' && !s.finished) {
      actions += `<button class="btn btn--ghost" data-action="back-board">${MS.icon('grid')}<span>Taxtaga qaytish</span></button>`;
    }
    actions += `<button class="btn btn--ghost btn--icon" data-action="fullscreen" aria-label="To‘liq ekran" title="To‘liq ekran">${MS.icon('expand')}</button>`;

    return `
      <header class="bar">
        <div class="brand">
          <span class="brand__mark"><span class="avatar" aria-hidden="true"><img src="assets/avatar-body.webp" alt="" width="1108" height="1468"><span class="avatar__head"><img src="assets/avatar-head.webp" alt="" width="1108" height="1468"><img class="avatar__lids" src="assets/avatar-blink.webp" alt="" width="1108" height="1468"></span></span></span>
          <span class="brand__text"><b>Moliyaviy savodxonlik</b><small>Intellektual o‘yin</small></span>
        </div>
        <div class="bar__progress" title="Qolgan savollar">
          <span class="bar__count"><b>${total - left}</b> / ${total}</span>
          <span class="meter"><span class="meter__fill" style="width:${total ? ((total - left) / total) * 100 : 0}%"></span></span>
        </div>
        <div class="bar__actions">${actions}</div>
      </header>`;
  }

  function teams(s) {
    const cards = s.teams.map((t, i) => {
      const active = i === s.current && !s.finished;
      return `
        <li class="team${active ? ' is-active' : ''}">
          <div class="team__top">
            <span class="team__name">${esc(t.name)}</span>
            <span class="status ${active ? 'status--play' : 'status--wait'}"><i></i>${active ? 'O‘ynayapti' : 'Kutmoqda'}</span>
          </div>
          <div class="team__balance${t.balance < 0 ? ' is-neg' : ''}">${money(t.balance)}</div>
          <div class="team__stats">
            <span class="ok">${MS.icon('check')}${t.correct}</span>
            <span class="bad">${MS.icon('x')}${t.wrong}</span>
            ${t.skipped ? `<span class="skip">${MS.icon('minus')}${t.skipped}</span>` : ''}
          </div>
        </li>`;
    }).join('');

    return `
      <aside class="side">
        <h2 class="side__title">${MS.icon('users')}<span>Jamoalar</span></h2>
        <ol class="teams">${cards}</ol>
      </aside>`;
  }

  MS.screens = MS.screens || {};
  MS.screens.shell = { header, teams };
})(window.MS);
