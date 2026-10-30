/* js/core/format.js */
/* Savol matnini ko'rsatish uchun bloklarga aylantirish.

   Vaziyat va izoh maydonlari:
     oddiy qator          — alohida xatboshi
     "- matn"             — nuqtali ro'yxat
     "= hisob"            — hisob-kitob qutisi
     "* Nomi: a | b | c"  — yonma-yon kartochkalar
   Xulosa maydoni: "Atama (English) — ta'rif" qatori atama bo'ladi, boshqa qatorlar — maslahat. */
(function (MS) {
  'use strict';

  const lines = (text) => String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  function blocks(text) {
    const out = [];
    lines(text).forEach((line) => {
      const last = out[out.length - 1];
      let m;
      if ((m = line.match(/^[-•]\s+(.+)$/))) {
        if (last && last.list) last.list.push(m[1]); else out.push({ list: [m[1]] });
      } else if ((m = line.match(/^=\s*(.+)$/))) {
        if (last && last.calc) last.calc.push(m[1]); else out.push({ calc: [m[1]] });
      } else if ((m = line.match(/^\*\s+([^:]+):\s*(.*)$/))) {
        const card = { title: m[1].trim(), items: m[2].split('|').map((x) => x.trim()).filter(Boolean) };
        if (last && last.cards) last.cards.push(card); else out.push({ cards: [card] });
      } else {
        out.push(line);
      }
    });
    return out;
  }

  const TERM = /^(.+?)\s+[—–]\s+(.+)$/;

  function summary(text) {
    const terms = [];
    const notes = [];
    lines(text).forEach((line) => {
      const m = line.match(TERM);
      if (!m) { notes.push(line); return; }
      const named = m[1].match(/^(.*?)\s*\(([^()]+)\)$/);
      terms.push(named ? { name: named[1], en: named[2], def: m[2] } : { name: m[1], en: '', def: m[2] });
    });
    return { terms, notes };
  }

  /* Saqlangan savol (forma) -> ekranda ko'rsatiladigan ko'rinish */
  function question(f) {
    const sum = summary(f.summary);
    return Object.freeze({
      id: f.id,
      value: f.value,
      title: f.title,
      body: blocks(f.body),
      ask: f.ask,
      options: f.options.slice(),
      answer: f.answer,
      short: f.short,
      explain: blocks(f.explain),
      terms: sum.terms,
      notes: sum.notes
    });
  }

  MS.format = { blocks, summary, question };
})(window.MS);
