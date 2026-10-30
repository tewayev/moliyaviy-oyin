/* js/admin/home.js */
/* 1-sahifa: mavzular va har bir darajadagi savollar soni. */
(function (MS) {
  'use strict';

  const S = MS.schema;
  const A = MS.admin;
  const { esc } = MS.dom;

  function render() {
    const total = S.TOPICS.reduce((n, t) => n + A.counts(t.id).total, 0);
    const cards = S.TOPICS.map((t) => {
      const c = A.counts(t.id);
      return `
        <a class="tcard card" href="#admin/${t.id}">
          <div class="tcard__top">
            <span class="tcard__icon">${MS.icon(t.icon)}</span>
            <span class="tcard__name"><b>${esc(t.title)}</b><small><b>${c.total}</b> ta savol</small></span>
          </div>
          ${A.levels(c)}
        </a>`;
    }).join('');

    return `
      <div class="admin__head">
        <div class="admin__heading">
          <h1 class="admin__title">Mavzular va savollar</h1>
          <p class="admin__sub">Jami <b>${total}</b> ta savol · har bir darajaga maqsad — <b>${S.POOL_TARGET}</b> ta</p>
        </div>
        <div class="admin__tools">
          <a class="btn btn--accent" href="#admin/import">${MS.icon('upload')}<span>Fayldan yuklash</span></a>
        </div>
      </div>
      ${A.flash()}
      <div class="tgrid">${cards}</div>`;
  }

  A.views.home = { render };
})(window.MS);
