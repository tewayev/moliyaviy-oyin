/* js/admin/editor.js */
/* 3-sahifa: savolni yozish/tahrirlash. Qiymat, savol, variantlar, javob va xulosa. */
(function (MS) {
  'use strict';

  const S = MS.schema;
  const A = MS.admin;
  const { esc } = MS.dom;

  const blank = (value) => ({
    id: '', value, title: '', body: '', ask: '',
    options: ['', '', ''], answer: '', short: '', explain: '', summary: ''
  });

  function render() {
    const ui = A.ui;
    const t = A.topicOf(ui.topic);
    const d = ui.draft;
    const c = A.counts(t.id);
    const isNew = !ui.qid;

    const values = S.VALUES.map((v) => `
      <button type="button" class="seg__btn${d.value === v ? ' is-on' : ''}" data-action="adm-value" data-v="${v}" aria-pressed="${d.value === v}">$${v}</button>`).join('');

    const opts = d.options.map((text, i) => {
      const L = S.LETTERS[i];
      const on = d.answer === L;
      return `
        <div class="vrow${on ? ' is-answer' : ''}">
          <span class="vrow__key">${L}</span>
          <input class="input" type="text" data-opt="${i}" value="${esc(text)}" maxlength="${S.LIMITS.option}" placeholder="${L} variant matni" aria-label="${L} variant">
          <button type="button" class="vrow__ok" data-action="adm-answer" data-l="${L}" aria-pressed="${on}">${MS.icon('check')}<span>To‘g‘ri javob</span></button>
          ${d.options.length > S.MIN_OPTIONS ? `<button type="button" class="btn btn--ghost btn--icon is-danger" data-action="adm-opt-remove" data-i="${i}" aria-label="${L} variantni o‘chirish" title="O‘chirish">${MS.icon('x')}</button>` : ''}
        </div>`;
    }).join('');

    const field = (key, label, o) => {
      o = o || {};
      const max = S.LIMITS[key];
      const ctl = o.area
        ? `<textarea class="input" id="f-${key}" data-f="${key}" rows="${o.rows || 4}" maxlength="${max}" placeholder="${esc(o.ph || '')}">${esc(d[key])}</textarea>`
        : `<input class="input" id="f-${key}" type="text" data-f="${key}" maxlength="${max}" value="${esc(d[key])}" placeholder="${esc(o.ph || '')}">`;
      return `
        <div class="ff">
          <label class="ff__label" for="f-${key}">${label}</label>
          ${ctl}
          ${o.hint ? `<p class="ff__hint">${o.hint}</p>` : ''}
        </div>`;
    };

    const errors = ui.errors.length
      ? `<p class="notice notice--bad" role="alert">${ui.errors.map((e) => esc(A.capital(e))).join(' · ')}</p>` : '';
    const dis = ui.busy ? 'disabled' : '';

    return `
      ${A.crumbs([['Admin Panel', '#admin'], [t.title, `#admin/${t.id}`], [isNew ? 'Yangi savol' : 'Tahrirlash']])}
      <div class="admin__head">
        <div class="admin__heading">
          <h1 class="admin__title">${isNew ? 'Yangi savol' : 'Savolni tahrirlash'}</h1>
          <p class="admin__sub">${esc(t.title)}</p>
        </div>
      </div>
      ${A.flash()}
      <form class="editor" data-form="question" novalidate>
        <section class="fset card">
          <div class="fset__row">
            <h2 class="fset__head">${MS.icon('coins')}<span>Savol qiymati</span></h2>
            <span class="hint">Bu darajada: <b>${c.byValue[d.value] || 0}</b> / ${S.POOL_TARGET}</span>
          </div>
          <div class="seg" role="group" aria-label="Savol qiymati">${values}</div>
        </section>

        <section class="fset card">
          <h2 class="fset__head">${MS.icon('edit')}<span>Savol</span></h2>
          ${field('title', 'Sarlavha', { ph: 'Masalan: 50/30/20 qoidasi' })}
          ${field('body', 'Vaziyat <i>(ixtiyoriy)</i>', { area: true, rows: 5, ph: 'Savol sharti, raqamlar, vaziyat tavsifi…',
            hint: 'Har bir qator — alohida xatboshi. <code>-</code> bilan boshlansa — ro‘yxat, <code>*&nbsp;Nomi: a | b | c</code> — yonma-yon kartochkalar.' })}
          ${field('ask', 'Savol matni', { area: true, rows: 2, ph: 'Masalan: Jamg‘armaga qancha ajratishi kerak?' })}
        </section>

        <section class="fset card">
          <div class="fset__row">
            <h2 class="fset__head">${MS.icon('list')}<span>Variantlar</span></h2>
            <span class="hint">To‘g‘ri variantni belgilang</span>
          </div>
          <div class="vlist">${opts}</div>
          ${d.options.length < S.MAX_OPTIONS ? `<div><button type="button" class="btn btn--ghost" data-action="adm-opt-add">${MS.icon('plus')}<span>Variant qo‘shish</span></button></div>` : ''}
        </section>

        <section class="fset card">
          <h2 class="fset__head">${MS.icon('bulb')}<span>Javob va xulosa</span></h2>
          ${field('short', 'Qisqa javob <i>(ixtiyoriy)</i>', { ph: 'Masalan: 4 000 000 × 20% = 800 000 so‘m',
            hint: 'Javobdan keyin birinchi ko‘rinadi. Bo‘sh qolsa, to‘g‘ri variant matni chiqadi.' })}
          ${field('explain', 'Izoh <i>(ixtiyoriy)</i>', { area: true, rows: 5, ph: 'Nega aynan shu javob to‘g‘ri, boshqalari nega xato…',
            hint: 'Har bir qator — alohida xatboshi. <code>=</code> bilan boshlangan qatorlar hisob-kitob qutisiga tushadi.' })}
          ${field('summary', 'Xulosa <i>(ixtiyoriy)</i>', { area: true, rows: 4, ph: 'Moliyaviy piramida (Ponzi Scheme) — oldingi ishtirokchilarga…',
            hint: '<code>Atama (English) — ta’rif</code> ko‘rinishidagi qator atama bo‘lib chiqadi, boshqa qatorlar — maslahat.' })}
        </section>

        <div class="editor__foot">
          ${errors}
          <a class="btn btn--ghost" href="#admin/${t.id}">Bekor qilish</a>
          ${isNew ? `<button type="button" class="btn btn--ghost" data-action="adm-save-more" ${dis}>${MS.icon('plus')}<span>Saqlash va yana qo‘shish</span></button>` : ''}
          <button type="submit" class="btn btn--accent" ${dis}>${ui.busy ? '<span class="spin" aria-hidden="true"></span>' : MS.icon('check')}<span>Saqlash</span></button>
        </div>
      </form>`;
  }

  /* Formadagi qiymatlarni qoralamaga ko'chiradi (qayta chizishdan oldin) */
  function collect(root) {
    const d = A.ui.draft;
    if (!d) return;
    root.querySelectorAll('[data-f]').forEach((el) => { d[el.dataset.f] = el.value; });
    root.querySelectorAll('[data-opt]').forEach((el) => { d.options[Number(el.dataset.opt)] = el.value; });
  }

  /* Faqat shu sahifadagi tugmalar; true — qayta chizish kerak */
  function handle(action, el, root) {
    const d = A.ui.draft;
    switch (action) {
      case 'adm-value': collect(root); d.value = Number(el.dataset.v); return true;
      case 'adm-answer': collect(root); d.answer = el.dataset.l; A.ui.errors = []; return true;
      case 'adm-opt-add':
        collect(root);
        if (d.options.length < S.MAX_OPTIONS) d.options.push('');
        return 'focus-last';
      case 'adm-opt-remove': {
        collect(root);
        const i = Number(el.dataset.i);
        if (d.options.length <= S.MIN_OPTIONS) return false;
        const ans = S.LETTERS.indexOf(d.answer);
        d.options.splice(i, 1);
        d.answer = ans === i ? '' : ans > i ? S.LETTERS[ans - 1] : d.answer;
        return true;
      }
      default: return false;
    }
  }

  A.views.editor = { render, collect, handle, blank };
})(window.MS);
