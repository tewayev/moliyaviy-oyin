/* js/admin/admin.js */
/* Admin panel boshqaruvchisi: manzil (#admin/...), kirishni tekshirish, serverga so'rovlar.
   Manzillar: #admin, #admin/import, #admin/<mavzu>, #admin/<mavzu>/new, #admin/<mavzu>/<savolId> */
(function (MS) {
  'use strict';

  const S = MS.schema;
  const A = MS.admin;
  const ui = A.ui;
  const V = A.views;
  let rerender = () => {};
  let path = [];

  const go = (hash) => { location.hash = hash; };

  /* ---------- marshrut ---------- */
  function route() {
    path = decodeURIComponent(location.hash.replace(/^#/, '')).split('/');
    ui.on = path[0] === 'admin';
    if (!ui.on) { ui.rendered = null; return; }
    ui.confirm = null;
    ui.errors = [];
    if (ui.auth === 'unknown') bootstrap();
    apply();
  }

  /* Manzilni sahifaga aylantiradi (savollar yuklangandan keyin ham qayta chaqiriladi) */
  function apply() {
    const topic = path[1] && A.topicOf(path[1]) ? path[1] : null;
    if (topic !== ui.topic) ui.filter = 'all';
    ui.topic = topic;
    if (path[1] === 'import') { ui.view = 'import'; return; }
    if (path[1] !== 'import') ui.imp = null;
    if (!topic) { ui.view = 'home'; return; }
    if (!path[2]) { ui.view = 'topic'; return; }
    ui.view = 'edit';
    if (path[2] === 'new') {
      ui.qid = null;
      ui.draft = V.editor.blank(ui.filter === 'all' ? S.VALUES[0] : Number(ui.filter));
      return;
    }
    const q = A.list(topic).find((x) => x.id === path[2]);
    if (!q) { ui.view = ui.bank ? 'topic' : 'edit'; ui.draft = V.editor.blank(S.VALUES[0]); return; }
    ui.qid = q.id;
    ui.draft = JSON.parse(JSON.stringify(q));
  }

  /* ---------- kirish ---------- */
  async function bootstrap() {
    ui.auth = 'checking';
    try {
      const s = await MS.api.session();
      if (s.admin) { await loadBank(); ui.auth = 'yes'; apply(); }
      else ui.auth = 'no';
    } catch (err) {
      ui.auth = 'no';
      ui.flash = { kind: 'bad', text: err.message };
    }
    rerender();
  }

  async function loadBank() {
    const r = await MS.api.questions();
    ui.bank = r.topics;
  }

  async function signedIn() {
    try {
      await loadBank();
      ui.auth = 'yes';
      apply();
    } catch (err) {
      ui.flash = { kind: 'bad', text: err.message };
    }
    rerender();
  }

  function expired() {
    ui.auth = 'no';
    ui.bank = null;
    ui.flash = { kind: 'bad', text: 'Sessiya tugadi. Qayta kiring' };
  }

  /* Server so'rovi: band holati, xato xabari va sessiya tugashini bir joyda boshqaradi */
  async function call(fn, onError) {
    ui.busy = true;
    rerender();
    try {
      return await fn();
    } catch (err) {
      if (err.status === 401) expired();
      else if (onError) onError(err);
      else ui.flash = { kind: 'bad', text: err.message };
      return null;
    } finally {
      ui.busy = false;
      rerender();
    }
  }

  /* ---------- amallar ---------- */
  async function save(root, more) {
    V.editor.collect(root);
    const q = S.clean(ui.draft);
    const errors = S.validate(q);
    if (errors.length) { ui.errors = errors; rerender(); return; }
    ui.errors = [];
    const r = await call(() => MS.api.saveQuestion(ui.topic, q), (err) => {
      ui.errors = (err.data && err.data.errors) || [err.message];
    });
    if (!r) return;
    const list = ui.bank[ui.topic];
    const i = list.findIndex((x) => x.id === r.question.id);
    if (i >= 0) list[i] = r.question; else list.push(r.question);

    if (more) {
      ui.flash = { kind: 'ok', text: `Saqlandi. $${q.value} darajasiga navbatdagi savolni yozing.` };
      ui.draft = V.editor.blank(q.value);
      rerender();
      document.getElementById('app').scrollTop = 0;
      return;
    }
    ui.flash = { kind: 'ok', text: 'Savol saqlandi' };
    ui.filter = String(q.value);
    go(`#admin/${ui.topic}`);
  }

  async function removeQuestion(id) {
    const ok = await call(() => MS.api.removeQuestion(ui.topic, id));
    ui.confirm = null;
    if (!ok) return;
    ui.bank[ui.topic] = ui.bank[ui.topic].filter((x) => x.id !== id);
    ui.flash = { kind: 'ok', text: 'Savol o‘chirildi' };
    rerender();
  }

  async function importItems(mode) {
    const r = await call(() => MS.api.importQuestions(ui.imp.items, mode));
    ui.confirm = null;
    if (!r) return;
    await call(loadBank);
    const parts = [`${r.added} ta savol qo‘shildi`];
    if (r.updated) parts.push(`${r.updated} tasi yangilandi`);
    if (r.skipped && r.skipped.length) parts.push(`${r.skipped.length} tasi xato sababli o‘tkazib yuborildi`);
    ui.flash = { kind: 'ok', text: parts.join(', ') };
    ui.imp = null;
    rerender();
  }

  async function logout() {
    try { await MS.api.logout(); } catch (e) { /* baribir chiqamiz */ }
    ui.auth = 'no';
    ui.bank = null;
    ui.flash = { kind: 'ok', text: 'Admin paneldan chiqdingiz' };
    rerender();
  }

  /* Tugmalar. Qaytaradi: true — qayta chizish, 'focus-last' — chizib oxirgi variantga o'tish */
  function handle(el, root) {
    const action = el.dataset.action;
    switch (action) {
      case 'adm-pw': V.login.togglePassword(el); return false;
      case 'adm-logout': logout(); return false;
      case 'adm-filter': ui.filter = el.dataset.v; ui.confirm = null; return true;
      case 'adm-cancel': ui.confirm = null; return true;
      case 'adm-del-ask': ui.confirm = el.dataset.id; return true;
      case 'adm-del-confirm': removeQuestion(el.dataset.id); return false;
      case 'adm-save-more': save(root, true); return false;
      case 'adm-template':
        A.download('moliyaviy-oyin-shablon.txt', MS.template.template(), 'text/plain;charset=utf-8');
        return false;
      case 'adm-export-txt':
        A.download(`moliyaviy-oyin-savollar-${A.today()}.txt`, '﻿' + MS.template.serialize(ui.bank), 'text/plain;charset=utf-8');
        return false;
      case 'adm-export-json':
        A.download(`moliyaviy-oyin-zaxira-${A.today()}.json`,
          JSON.stringify({ app: 'moliyaviy-oyin', v: 1, exported: new Date().toISOString(), topics: ui.bank }, null, 2),
          'application/json');
        return false;
      case 'adm-import-merge': importItems('merge'); return false;
      case 'adm-import-replace-ask': ui.confirm = 'replace'; return true;
      case 'adm-import-replace': importItems('replace'); return false;
      case 'adm-import-clear': ui.imp = null; ui.confirm = null; return true;
      default: return ui.view === 'edit' ? V.editor.handle(action, el, root) : false;
    }
  }

  /* ---------- chizish ---------- */
  function render() {
    if (ui.auth !== 'yes') return V.login.render();
    const view = { home: V.home, topic: V.topic, edit: V.editor, import: V.import }[ui.view] || V.home;
    // kirish animatsiyasi faqat boshqa sahifaga o'tilganda
    const key = location.hash;
    const enter = key !== ui.rendered ? ' enter' : '';
    ui.rendered = key;
    return `${A.header()}<main class="admin${enter}">${view.render()}</main>`;
  }

  function mount(root) {
    const ctl = { rerender, signedIn };
    if (ui.auth !== 'yes') return V.login.mount(root, ctl);
    const form = root.querySelector('[data-form="question"]');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); if (!ui.busy) save(root, false); });
    if (ui.view === 'import') V.import.mount(root, ctl);
  }

  MS.screens = MS.screens || {};
  MS.screens.admin = {
    active: () => ui.on,
    bind(fn) { rerender = fn; },
    route, render, mount, handle
  };
})(window.MS);
