/* Savol sxemasi — brauzer va server uchun yagona manba.
   Brauzerda: MS.schema, serverda: require('public/js/shared/schema.js').
   Saqlanadigan savol ("forma") ko'rinishi:
     { id, value, title, body, ask, options: [..], answer: 'A'..'E', short, explain, summary }
   body/explain/summary — oddiy matn (formati: js/core/format.js). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MS = root.MS || {}).schema = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VALUES = Object.freeze([100, 200, 300, 400, 500]);
  const LETTERS = Object.freeze(['A', 'B', 'C', 'D', 'E']);
  const MIN_OPTIONS = 2;
  const MAX_OPTIONS = 5;
  const POOL_TARGET = 25;          // har bir daraja uchun maqsadli savollar soni
  const MAX_QUESTIONS = 5000;      // butun bazadagi chegara

  /* Taxtadagi mavzular (ustunlar tartibi) */
  const TOPICS = Object.freeze([
    { id: 'shaxsiy-budjet', title: 'Shaxsiy budjet',         icon: 'wallet' },
    { id: 'jamgarma',       title: 'Jamg‘arma',              icon: 'coins' },
    { id: 'xaridlar',       title: 'Xaridlar',               icon: 'cart' },
    { id: 'kredit',         title: 'Kredit',                 icon: 'card' },
    { id: 'qarz',           title: 'Qarz',                   icon: 'receipt' },
    { id: 'investitsiya',   title: 'Investitsiya',           icon: 'chart' },
    { id: 'bank',           title: 'Bank',                   icon: 'bank' },
    { id: 'provayderlar',   title: 'Moliyaviy provayderlar', icon: 'phone' }
  ].map(Object.freeze));

  const LIMITS = Object.freeze({
    title: 200, body: 6000, ask: 1000, option: 500, short: 500, explain: 6000, summary: 4000
  });

  const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

  const isTopic = (id) => TOPICS.some((t) => t.id === id);
  const cellId = (topicId, value) => `${topicId}:${value}`;

  /* Mavzuni nomi, id si yoki tartib raqami bo'yicha topadi ("Jamg'arma", "jamgarma", "2") */
  const fold = (s) => String(s || '').toLowerCase().replace(/[ʻʼ‘’'`´]/g, '').replace(/\s+/g, ' ').trim();
  function findTopic(name) {
    const key = fold(name);
    if (!key) return null;
    if (/^\d+$/.test(key)) return TOPICS[Number(key) - 1] || null;
    return TOPICS.find((t) => t.id === key || fold(t.title) === key) || null;
  }

  const str = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, max + 1);

  /* Kiruvchi ma'lumotni toza formaga keltiradi (ortiqcha maydonlar tashlanadi). */
  function clean(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
      id: typeof r.id === 'string' ? r.id.trim() : '',
      value: Number(String(r.value == null ? '' : r.value).replace(/[^\d]/g, '')),
      title: str(r.title, LIMITS.title),
      body: str(r.body, LIMITS.body),
      ask: str(r.ask, LIMITS.ask),
      options: (Array.isArray(r.options) ? r.options : []).slice(0, MAX_OPTIONS + 1).map((o) => str(o, LIMITS.option)),
      answer: String(r.answer || '').trim().toUpperCase(),
      short: str(r.short, LIMITS.short),
      explain: str(r.explain, LIMITS.explain),
      summary: str(r.summary, LIMITS.summary)
    };
  }

  /* Toza formani tekshiradi; xatolar ro'yxatini qaytaradi (bo'sh — hammasi joyida). */
  function validate(q) {
    const errors = [];
    const n = q.options.length;
    if (q.id && !ID_RE.test(q.id)) errors.push('ID faqat harf, raqam, «-» va «_» dan iborat bo‘lishi kerak');
    if (!VALUES.includes(q.value)) errors.push(`qiymat ${VALUES.join(', ')} dan biri bo‘lishi kerak`);
    if (!q.title) errors.push('sarlavha yozilmagan');
    if (!q.ask) errors.push('savol matni yozilmagan');
    if (n < MIN_OPTIONS || n > MAX_OPTIONS) errors.push(`${MIN_OPTIONS}–${MAX_OPTIONS} ta variant kerak`);
    else if (q.options.some((o) => !o)) errors.push('bo‘sh variant bor');
    const ai = LETTERS.indexOf(q.answer);
    if (ai < 0 || ai >= n) errors.push('to‘g‘ri javob belgilanmagan');
    Object.keys(LIMITS).forEach((k) => {
      const tooLong = k === 'option' ? q.options.some((o) => o.length > LIMITS.option) : q[k].length > LIMITS[k];
      if (tooLong) errors.push(`«${k}» juda uzun (ko‘pi bilan ${LIMITS[k]} belgi)`);
    });
    return errors;
  }

  return {
    VALUES, LETTERS, MIN_OPTIONS, MAX_OPTIONS, POOL_TARGET, MAX_QUESTIONS, TOPICS, LIMITS,
    isTopic, cellId, findTopic, clean, validate
  };
});
