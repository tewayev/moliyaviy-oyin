/* js/admin/state.js */
/* Admin panelning umumiy holati va yordamchi bo'laklari (sarlavha, yo'l, xabar, darajalar).
   Savollar faqat kirgandan keyin serverdan yuklanadi va shu yerda (xotirada) turadi. */
(function (MS) {
  'use strict';

  const S = MS.schema;
  const { esc } = MS.dom;

  const ui = {
    on: false,
    auth: 'unknown',     // unknown | checking | yes | no
    bank: null,          // { [mavzuId]: [savol] }
    view: 'home',        // login | home | topic | edit | import
    topic: null,
    qid: null,
    filter: 'all',
    draft: null,
    errors: [],
    flash: null,         // { kind: 'ok'|'bad', text }
    confirm: null,       // tasdiqlanayotgan xavfli amal
    busy: false,
    imp: null,           // fayldan yuklash: { name, items, problems, json }
    rendered: null
  };

  const topicOf = (id) => S.TOPICS.find((t) => t.id === id) || null;
  const list = (topicId) => (ui.bank && ui.bank[topicId]) || [];

  function counts(topicId) {
    const byValue = {};
    S.VALUES.forEach((v) => { byValue[v] = 0; });
    list(topicId).forEach((q) => { byValue[q.value] = (byValue[q.value] || 0) + 1; });
    return { total: list(topicId).length, byValue };
  }

  const avatar = `<span class="avatar" aria-hidden="true"><img src="assets/avatar-body.webp" alt="" width="1108" height="1468"><span class="avatar__head"><img src="assets/avatar-head.webp" alt="" width="1108" height="1468"><img class="avatar__lids" src="assets/avatar-blink.webp" alt="" width="1108" height="1468"></span></span>`;

  function header() {
    const out = ui.auth === 'yes'
      ? `<button class="btn btn--ghost" data-action="adm-logout" title="Admin paneldan chiqish">${MS.icon('lock')}<span>Chiqish</span></button>` : '';
    return `
      <header class="bar">
        <div class="brand">
          <span class="brand__mark">${avatar}</span>
          <span class="brand__text"><b>Admin Panel</b><small>Moliyaviy savodxonlik</small></span>
        </div>
        <span class="bar__progress" aria-hidden="true"></span>
        <div class="bar__actions">
          <a class="btn btn--ghost" href="#">${MS.icon('arrowLeft')}<span>O‘yinga qaytish</span></a>
          ${out}
        </div>
      </header>`;
  }

  function crumbs(items) {
    return `<nav class="crumbs" aria-label="Yo‘l">${items.map(([label, href]) =>
      href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`).join('<span aria-hidden="true">/</span>')}</nav>`;
  }

  function flash() {
    if (!ui.flash) return '';
    const f = ui.flash;
    ui.flash = null;
    return `<p class="notice notice--${f.kind}" role="status">${esc(f.text)}</p>`;
  }

  function levels(c) {
    return `<div class="levels">${S.VALUES.map((v) => {
      const n = c.byValue[v] || 0;
      const pct = Math.min(100, (n / S.POOL_TARGET) * 100);
      return `
        <div class="lvl${n >= S.POOL_TARGET ? ' is-full' : ''}">
          <span class="lvl__v">$${v}</span>
          <span class="meter"><span class="meter__fill" style="width:${pct}%"></span></span>
          <span class="lvl__n">${n}/${S.POOL_TARGET}</span>
        </div>`;
    }).join('')}</div>`;
  }

  const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const today = () => new Date().toISOString().slice(0, 10);

  MS.admin = { ui, views: {}, topicOf, list, counts, header, crumbs, flash, levels, capital, download, today, avatar };
})(window.MS);
