/* js/screens/board.js */
/* O'yin taxtasi: mavzular ustunlarda, qiymatlar qatorlarda. */
(function (MS) {
  'use strict';

  const C = MS.config;
  const { esc } = MS.dom;
  const OUT_ICON = { correct: 'check', wrong: 'x', skip: 'minus' };

  function cell(topic, value, s) {
    const id = MS.schema.cellId(topic.id, value);
    if (!topic.ready || !MS.store.question(id, s)) {
      return `<div class="cell cell--off" aria-hidden="true">$${value}</div>`;
    }
    const used = s.used[id];
    if (used) {
      const team = s.teams[used.team];
      return `
        <div class="cell cell--used cell--${used.outcome}" title="${esc(team ? team.name : '')}">
          <span class="cell__value">$${value}</span>
          <span class="cell__who">${MS.icon(OUT_ICON[used.outcome])}<span>${esc(team ? team.name : '')}</span></span>
        </div>`;
    }
    return `<button class="cell cell--open" data-action="open" data-qid="${id}" aria-label="${esc(topic.title)}, ${value} dollar"><span class="cell__value">$${value}</span></button>`;
  }

  function render(s) {
    // savoli bor mavzular ochiq, qolganlari "Tez orada"
    const topics = MS.schema.TOPICS.map((t) => Object.assign({
      ready: C.values.some((v) => MS.store.question(MS.schema.cellId(t.id, v), s))
    }, t));
    const team = s.teams[s.current];

    const cols = topics.map((t) => `
      <div class="col${t.ready ? '' : ' col--off'}">
        <div class="col__head">
          <span class="col__icon">${MS.icon(t.ready ? t.icon : 'lock')}</span>
          <span class="col__title">${esc(t.title)}</span>
          ${t.ready ? '' : '<span class="col__soon">Tez orada</span>'}
        </div>
        ${C.values.map((v) => cell(t, v, s)).join('')}
      </div>`).join('');

    return `
      <section class="board-screen">
        <h2 class="turn">${esc(team ? team.name : '')}</h2>
        <div class="board-wrap">
          <div class="board" style="--cols:${topics.length}">${cols}</div>
        </div>
      </section>`;
  }

  MS.screens = MS.screens || {};
  MS.screens.board = { render };
})(window.MS);
