/* js/admin/topic.js */
/* 2-sahifa: bitta mavzudagi savollar ro'yxati, darajalar bo'yicha filtr. */
(function (MS) {
  'use strict';

  const S = MS.schema;
  const A = MS.admin;
  const { esc } = MS.dom;

  function render() {
    const ui = A.ui;
    const t = A.topicOf(ui.topic);
    const c = A.counts(t.id);
    const all = A.list(t.id)
      .map((q, i) => ({ q, i }))
      .sort((a, b) => a.q.value - b.q.value || a.i - b.i)
      .map((x) => x.q);
    const shown = ui.filter === 'all' ? all : all.filter((q) => q.value === Number(ui.filter));

    const tabs = [['all', 'Hammasi', c.total]].concat(S.VALUES.map((v) => [String(v), `$${v}`, `${c.byValue[v]}/${S.POOL_TARGET}`]))
      .map(([key, label, n]) => `
        <button class="seg__btn${ui.filter === key ? ' is-on' : ''}" data-action="adm-filter" data-v="${key}" aria-pressed="${ui.filter === key}">
          <span>${label}</span><small>${n}</small>
        </button>`).join('');

    const rows = shown.map((q) => {
      const actions = ui.confirm === q.id
        ? `<button class="btn btn--danger btn--sm" data-action="adm-del-confirm" data-id="${esc(q.id)}" ${ui.busy ? 'disabled' : ''}>${MS.icon('trash')}<span>O‘chirish</span></button>
           <button class="btn btn--ghost btn--sm" data-action="adm-cancel">Yo‘q</button>`
        : `<a class="btn btn--ghost btn--sm" href="#admin/${t.id}/${encodeURIComponent(q.id)}">${MS.icon('edit')}<span>Tahrirlash</span></a>
           <button class="btn btn--ghost btn--sm btn--icon is-danger" data-action="adm-del-ask" data-id="${esc(q.id)}" aria-label="O‘chirish" title="O‘chirish">${MS.icon('trash')}</button>`;
      return `
        <li class="qrow">
          <span class="qrow__val">$${q.value}</span>
          <span class="qrow__text"><b>${esc(q.title)}</b><small>${esc(q.ask)}</small></span>
          <span class="qrow__actions">${actions}</span>
        </li>`;
    }).join('');

    const empty = `
      <div class="empty card">
        <p>${ui.filter === 'all' ? 'Bu mavzuda hali savol yo‘q.' : `$${ui.filter} darajasida hali savol yo‘q.`}</p>
        <a class="btn btn--accent" href="#admin/${t.id}/new">${MS.icon('plus')}<span>Savol qo‘shish</span></a>
      </div>`;

    return `
      ${A.crumbs([['Admin Panel', '#admin'], [t.title]])}
      <div class="admin__head">
        <div class="admin__heading">
          <h1 class="admin__title">${esc(t.title)}</h1>
          <p class="admin__sub"><b>${c.total}</b> ta savol</p>
        </div>
        <div class="admin__tools">
          <a class="btn btn--ghost" href="#admin/import">${MS.icon('upload')}<span>Fayldan yuklash</span></a>
          <a class="btn btn--accent btn--lg" href="#admin/${t.id}/new">${MS.icon('plus')}<span>Savol qo‘shish</span></a>
        </div>
      </div>
      ${A.flash()}
      <div class="filters"><div class="seg" role="group" aria-label="Daraja">${tabs}</div></div>
      ${shown.length ? `<ol class="qrows">${rows}</ol>` : empty}`;
  }

  A.views.topic = { render };
})(window.MS);
