/* js/admin/import.js */
/* Fayldan yuklash: shablon bo'yicha yozilgan .txt / Word (.docx) yoki JSON zaxira faylidan
   ko'p savolni birdaniga qo'shish. Avval tekshiriladi va ko'rib chiqish uchun ko'rsatiladi,
   faqat tasdiqlangandan keyin serverga yuboriladi. */
(function (MS) {
  'use strict';

  const S = MS.schema;
  const A = MS.admin;
  const { esc } = MS.dom;

  const MAX_FILE = 4 * 1024 * 1024;

  function intro() {
    return `
      <section class="fset card">
        <h2 class="fset__head">${MS.icon('book')}<span>Qanday ishlaydi</span></h2>
        <ol class="steps">
          <li><span><b>Shablonni yuklab oling</b> — unda qoidalar va 2 ta namuna savol bor.</span></li>
          <li><span>Faylni <b>Bloknot</b> yoki <b>Word</b>da oching va savollarni namunadagidek yozing. Har savol <b>---</b> bilan tugaydi. <b>MAVZU</b>ni bir marta yozsangiz, keyingi savollarga ham tegishli bo‘ladi.</span></li>
          <li><span>Faylni <b>.txt</b> yoki <b>.docx</b> qilib saqlang va pastdagi maydonga tashlang. Dastur tekshirib, nechta savol topilganini va xatolarni ko‘rsatadi.</span></li>
          <li><span><b>«Qo‘shish»</b> tugmasini bosing — savollar bazaga qo‘shiladi va o‘yinda aralashib chiqa boshlaydi.</span></li>
        </ol>
        <div class="actions">
          <button class="btn btn--primary" data-action="adm-template">${MS.icon('download')}<span>Bo‘sh shablonni yuklab olish (.txt)</span></button>
        </div>
      </section>

      <section class="fset card">
        <h2 class="fset__head">${MS.icon('upload')}<span>Faylni tanlang</span></h2>
        <label class="drop" data-t="drop">
          ${MS.icon('upload')}
          <b>Faylni shu yerga tashlang yoki bosib tanlang</b>
          <span class="hint">.txt, .docx (Word) yoki .json (zaxira nusxa) · 4 MB gacha</span>
          <input type="file" accept=".txt,.docx,.json,text/plain,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-t="file">
        </label>
      </section>

      <section class="fset card">
        <h2 class="fset__head">${MS.icon('download')}<span>Barcha savollarni yuklab olish</span></h2>
        <p class="muted">Zaxira nusxa yoki ko‘p savolni bir joyda tahrirlash uchun. Shablon faylidagi savollarda ID bo‘ladi — tahrirlab qayta yuklasangiz, savollar ikki marta qo‘shilmaydi, yangilanadi.</p>
        <div class="actions">
          <button class="btn btn--ghost" data-action="adm-export-txt">${MS.icon('download')}<span>Shablon ko‘rinishida (.txt)</span></button>
          <button class="btn btn--ghost" data-action="adm-export-json">${MS.icon('download')}<span>Zaxira nusxa (.json)</span></button>
        </div>
      </section>`;
  }

  function preview() {
    const imp = A.ui.imp;
    const busy = A.ui.busy ? 'disabled' : '';
    const grid = {};
    imp.items.forEach((q) => {
      grid[q.topic] = grid[q.topic] || {};
      grid[q.topic][q.value] = (grid[q.topic][q.value] || 0) + 1;
    });
    const updates = imp.items.filter((q) => q.id && S.TOPICS.some((t) => A.list(t.id).some((x) => x.id === q.id))).length;

    const rows = S.TOPICS.filter((t) => grid[t.id]).map((t) => `
      <tr><td>${esc(t.title)}</td>${S.VALUES.map((v) => `<td>${grid[t.id][v] ? `<b>${grid[t.id][v]}</b>` : '—'}</td>`).join('')}
        <td><b>${S.VALUES.reduce((n, v) => n + (grid[t.id][v] || 0), 0)}</b></td></tr>`).join('');

    const problems = imp.problems.slice(0, 50).map((p) => `
      <li>${p.n ? `${p.n}-savol` : 'Fayl'}${p.line ? ` (${p.line}-qator)` : ''}${p.title ? ` «${esc(p.title.slice(0, 50))}»` : ''}: ${p.errors.map(esc).join('; ')}</li>`).join('');

    const confirmReplace = A.ui.confirm === 'replace'
      ? `<button class="btn btn--danger" data-action="adm-import-replace" ${busy}>${MS.icon('refresh')}<span>Ha, butun baza almashtirilsin</span></button>
         <button class="btn btn--ghost" data-action="adm-cancel">Bekor qilish</button>`
      : `<button class="btn btn--ghost is-danger" data-action="adm-import-replace-ask" ${busy}>${MS.icon('refresh')}<span>Bazani to‘liq almashtirish</span></button>`;

    return `
      <section class="fset card">
        <div class="fset__row">
          <h2 class="fset__head">${MS.icon('list')}<span>Tekshiruv natijasi</span></h2>
          <span class="hint">${esc(imp.name)}</span>
        </div>
        ${imp.items.length ? `
          <p><b>${imp.items.length}</b> ta savol tayyor${updates ? ` (shundan <b>${updates}</b> tasi mavjud savollarni yangilaydi)` : ''}.</p>
          <div class="ptable-wrap"><table class="ptable">
            <thead><tr><th>Mavzu</th>${S.VALUES.map((v) => `<th>$${v}</th>`).join('')}<th>Jami</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>` : '<p class="notice notice--bad">Faylda to‘g‘ri yozilgan savol topilmadi.</p>'}
        ${imp.problems.length ? `
          <p class="ff__label">${imp.problems.length} ta savolda xato bor — ular qo‘shilmaydi. Faylni tuzatib qayta yuklang:</p>
          <ul class="errlist">${problems}</ul>` : ''}
        <div class="actions">
          ${imp.items.length ? `<button class="btn btn--accent btn--lg" data-action="adm-import-merge" ${busy}>${A.ui.busy ? '<span class="spin" aria-hidden="true"></span>' : MS.icon('check')}<span>${imp.items.length} ta savolni qo‘shish</span></button>` : ''}
          <button class="btn btn--ghost" data-action="adm-import-clear" ${busy}>Boshqa fayl tanlash</button>
          ${imp.json && imp.items.length ? confirmReplace : ''}
        </div>
        ${imp.json && imp.items.length ? '<p class="ff__hint">«Bazani to‘liq almashtirish» — hozirgi barcha savollar o‘chib, shu fayldagilar qoladi (avval serverda zaxira nusxa olinadi).</p>' : ''}
      </section>`;
  }

  function render() {
    return `
      ${A.crumbs([['Admin Panel', '#admin'], ['Fayldan yuklash']])}
      <div class="admin__head">
        <div class="admin__heading">
          <h1 class="admin__title">Fayldan yuklash</h1>
          <p class="admin__sub">Ko‘p savolni bitta fayl orqali qo‘shish</p>
        </div>
      </div>
      ${A.flash()}
      ${A.ui.imp ? preview() : intro()}`;
  }

  async function readFile(file) {
    if (file.size > MAX_FILE) throw new Error('Fayl juda katta (4 MB gacha bo‘lishi kerak)');
    const name = file.name.toLowerCase();
    if (name.endsWith('.docx')) return { json: false, result: MS.template.parse(await MS.docx.toText(await file.arrayBuffer())) };
    const text = await file.text();
    if (name.endsWith('.json')) {
      let obj;
      try { obj = JSON.parse(text.replace(/^﻿/, '')); } catch (e) { throw new Error('JSON faylni o‘qib bo‘lmadi'); }
      return { json: true, result: MS.template.fromJson(obj) };
    }
    if (name.endsWith('.doc')) throw new Error('Eski .doc format o‘qilmaydi — Word’da «.docx» qilib saqlang');
    return { json: false, result: MS.template.parse(text) };
  }

  function mount(root, ctl) {
    const input = root.querySelector('[data-t="file"]');
    const drop = root.querySelector('[data-t="drop"]');
    if (!input) return;
    const take = async (file) => {
      if (!file) return;
      try {
        const r = await readFile(file);
        A.ui.imp = { name: file.name, json: r.json, items: r.result.items, problems: r.result.problems };
      } catch (err) {
        A.ui.flash = { kind: 'bad', text: err.message };
      }
      ctl.rerender();
    };
    input.addEventListener('change', () => take(input.files && input.files[0]));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('is-over');
      take(e.dataTransfer.files && e.dataTransfer.files[0]);
    });
  }

  A.views.import = { render, mount };
})(window.MS);
