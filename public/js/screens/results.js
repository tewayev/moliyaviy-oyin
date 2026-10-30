/* js/screens/results.js */
/* Natijalar: reyting va tanlangan jamoa statistikasi. */
(function (MS) {
  'use strict';

  const { esc, money } = MS.dom;
  const ui = { pick: null, confirmReset: false };

  function ranked(s) {
    return s.teams
      .map((t, i) => Object.assign({ index: i }, t))
      .sort((a, b) => b.balance - a.balance || b.correct - a.correct);
  }

  function render(s) {
    const list = ranked(s);
    const pick = list.find((t) => t.index === ui.pick) || list[0];
    const isTop = pick === list[0];
    const label = isTop ? (s.finished ? 'G‘olib jamoa' : 'Yetakchi jamoa') : `${list.indexOf(pick) + 1}-o‘rin`;
    const played = pick.correct + pick.wrong + pick.skipped;
    const acc = pick.correct + pick.wrong ? Math.round((pick.correct / (pick.correct + pick.wrong)) * 100) : 0;

    const rows = list.map((t, i) => `
      <li>
        <button class="rank${t.index === pick.index ? ' is-on' : ''}" data-action="pick-team" data-index="${t.index}">
          <span class="rank__pos">${i + 1}</span>
          <span class="rank__name">${esc(t.name)}</span>
          <span class="rank__stats"><span class="ok">${MS.icon('check')}${t.correct}</span><span class="bad">${MS.icon('x')}${t.wrong}</span></span>
          <span class="rank__balance${t.balance < 0 ? ' is-neg' : ''}">${money(t.balance)}</span>
        </button>
      </li>`).join('');

    const resetBtn = ui.confirmReset
      ? `<button class="btn btn--danger" data-action="reset-confirm">${MS.icon('refresh')}<span>Ha, yangi o‘yin boshlansin</span></button>
         <button class="btn btn--ghost" data-action="reset-cancel">Bekor qilish</button>`
      : `<button class="btn btn--ghost" data-action="reset-ask">${MS.icon('refresh')}<span>Yangi o‘yin</span></button>`;

    return `
      <section class="results">
        ${s.finished ? `<p class="results__done">${MS.icon('trophy')}<span>O‘yin yakunlandi</span></p>` : ''}
        <div class="hero">
          <div class="hero__main">
            <span class="hero__label">${label}</span>
            <span class="hero__name">${esc(pick.name)}</span>
            <span class="hero__balance">${money(pick.balance)}</span>
          </div>
          <dl class="hero__stats">
            <div><dt>O‘ynagan savollar</dt><dd>${played}</dd></div>
            <div><dt>To‘g‘ri</dt><dd>${pick.correct}</dd></div>
            <div><dt>Noto‘g‘ri</dt><dd>${pick.wrong}</dd></div>
            <div><dt>Aniqlik</dt><dd>${acc}%</dd></div>
          </dl>
        </div>
        <ol class="ranking">${rows}</ol>
        <div class="results__actions">${resetBtn}</div>
      </section>`;
  }

  MS.screens = MS.screens || {};
  MS.screens.results = {
    render,
    pick(i) { ui.pick = i; },
    askReset(v) { ui.confirmReset = v; },
    clear() { ui.pick = null; ui.confirmReset = false; }
  };
})(window.MS);
