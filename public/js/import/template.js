/* js/import/template.js */
/* Savollarni matnli shablon (.txt yoki Word) orqali ommaviy yuklash va yuklab olish.
   parse(text)      -> { items: [{ topic, ...savol }], problems: [{ n, line, errors }] }
   serialize(bank)  -> shu formatdagi matn (eksport; qayta yuklasa ID orqali yangilanadi)
   fromJson(obj)    -> JSON zaxira faylini shu ko'rinishga keltiradi */
(function (MS) {
  'use strict';

  const S = MS.schema;

  const KEYS = [
    ['QISQA JAVOB', 'short'], ['MAVZU', 'topic'], ['ID', 'id'], ['QIYMAT', 'value'], ['SARLAVHA', 'title'],
    ['VAZIYAT', 'body'], ['SAVOL', 'ask'], ['JAVOB', 'answer'], ['IZOH', 'explain'], ['XULOSA', 'summary']
  ];
  const KEY_RE = new RegExp(`^(${KEYS.map((k) => k[0]).join('|')})\\s*:\\s*(.*)$`, 'i');
  const FIELD = Object.fromEntries(KEYS.map(([k, f]) => [k, f]));
  const MULTI = { body: '\n', explain: '\n', summary: '\n', title: ' ', ask: ' ', short: ' ' };
  const OPT_RE = /^([A-E])\s*[).]\s*(.+)$/;
  const SEP_RE = /^(-{3,}|={3,})$/;

  function parse(text) {
    const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
    const items = [];
    const problems = [];
    let topicName = '';
    let cur = null;
    let field = null;
    let count = 0;

    const start = (line) => { cur = { line, topicName, fields: {}, opts: {}, stray: [] }; };

    function finish() {
      if (!cur) return;
      const f = cur.fields;
      const has = Object.keys(f).some((k) => k !== 'topic') || Object.keys(cur.opts).length;
      if (!has) { cur = null; return; }
      count += 1;
      const errors = cur.stray.slice();
      const topic = S.findTopic(f.topic || cur.topicName);
      if (!topic) errors.push(f.topic || cur.topicName ? `«${f.topic || cur.topicName}» degan mavzu yo‘q` : 'MAVZU ko‘rsatilmagan');

      const letters = Object.keys(cur.opts).sort();
      if (letters.some((L, i) => L !== S.LETTERS[i])) errors.push('variantlar A) dan boshlab ketma-ket bo‘lishi kerak');
      const q = S.clean({
        id: f.id || '', value: f.value, title: f.title, body: f.body, ask: f.ask,
        options: letters.map((L) => cur.opts[L]), answer: (String(f.answer || '').match(/[A-E]/i) || [''])[0],
        short: f.short, explain: f.explain, summary: f.summary
      });
      S.validate(q).forEach((e) => errors.push(e));
      if (errors.length) problems.push({ n: count, line: cur.line, title: q.title, errors });
      else items.push(Object.assign({ topic: topic.id }, q));
      cur = null;
    }

    lines.forEach((raw, i) => {
      const line = raw.trim();
      const no = i + 1;
      if (line.startsWith('#')) return;
      if (SEP_RE.test(line)) { finish(); field = null; return; }
      if (!line) return;

      let m = line.match(KEY_RE);
      if (m) {
        const key = FIELD[m[1].toUpperCase()];
        if (key === 'topic') {
          // MAVZU savol boshlanmasdan oldin yozilsa — keyingi barcha savollarga tegishli
          if (!cur || !Object.keys(cur.fields).length) topicName = m[2].trim();
          if (!cur) start(no);
          cur.fields.topic = m[2].trim();
          cur.topicName = topicName;
          field = null;
          return;
        }
        if (!cur) start(no);
        if (cur.fields[key] !== undefined && key !== 'topic') cur.stray.push(`${no}-qator: «${m[1]}» ikki marta yozilgan (orada «---» qo‘yilmagan bo‘lishi mumkin)`);
        cur.fields[key] = m[2].trim();
        field = MULTI[key] ? key : null;
        return;
      }
      m = line.match(OPT_RE);
      if (m && field !== 'body' && field !== 'explain' && field !== 'summary') {
        if (!cur) start(no);
        cur.opts[m[1]] = m[2].trim();
        field = 'opt:' + m[1];
        return;
      }
      if (!cur) start(no);
      if (field && field.startsWith('opt:')) { const L = field.slice(4); cur.opts[L] += ' ' + line; return; }
      if (field) {
        const prev = cur.fields[field];
        cur.fields[field] = prev ? prev + MULTI[field] + line : line;
        return;
      }
      cur.stray.push(`${no}-qator tushunarsiz: «${line.slice(0, 40)}»`);
    });
    finish();
    return { items, problems };
  }

  /* ---------- eksport ---------- */
  const HEADER = [
    '# =================================================================',
    '#  MOLIYAVIY SAVODXONLIK O‘YINI — SAVOLLAR SHABLONI',
    '# =================================================================',
    '#  Qoidalar:',
    '#  • «#» bilan boshlangan qatorlar izoh — dastur ularni o‘qimaydi.',
    '#  • Har bir savol «---» qatori bilan tugaydi.',
    '#  • MAVZU bir marta yozilsa, keyingi savollarning hammasiga tegishli bo‘ladi.',
    `#    Mavzular: ${S.TOPICS.map((t, i) => `${i + 1}) ${t.title}`).join(', ')}`,
    '#  • QIYMAT: 100, 200, 300, 400 yoki 500.',
    '#  • Variantlar A) dan E) gacha, kamida 2 ta. JAVOB — to‘g‘ri variant harfi.',
    '#  • VAZIYAT, QISQA JAVOB, IZOH, XULOSA — ixtiyoriy. Ular bir necha qatordan iborat',
    '#    bo‘lishi mumkin: matn keyingi kalit so‘zgacha davom etadi.',
    '#  • VAZIYAT va IZOH ichida: «- » bilan boshlangan qator — ro‘yxat, «= » — hisob-kitob,',
    '#    «* Nomi: a | b | c» — yonma-yon kartochkalar.',
    '#  • XULOSA ichida: «Atama (English) — ta’rif» qatori atama bo‘lib chiqadi.',
    '#  • ID qatorini o‘zgartirmang: shu fayl qayta yuklansa, savol yangisi qo‘shilmay, yangilanadi.',
    '#    Yangi savolga ID yozish shart emas.',
    '# ================================================================='
  ].join('\n');

  function block(topicTitle, q) {
    const out = [];
    if (q.id) out.push(`ID: ${q.id}`);
    out.push(`QIYMAT: ${q.value}`, `SARLAVHA: ${q.title}`);
    if (q.body) out.push('VAZIYAT:', q.body);
    out.push(`SAVOL: ${q.ask}`);
    q.options.forEach((o, i) => out.push(`${S.LETTERS[i]}) ${o}`));
    out.push(`JAVOB: ${q.answer}`);
    if (q.short) out.push(`QISQA JAVOB: ${q.short}`);
    if (q.explain) out.push('IZOH:', q.explain);
    if (q.summary) out.push('XULOSA:', q.summary);
    out.push('---');
    return out.join('\n');
  }

  function serialize(topics) {
    const parts = [HEADER];
    S.TOPICS.forEach((t) => {
      const list = (topics[t.id] || []).slice().sort((a, b) => a.value - b.value);
      if (!list.length) return;
      parts.push(`\n\nMAVZU: ${t.title}\n`);
      list.forEach((q) => parts.push(block(t.title, q) + '\n'));
    });
    return parts.join('\n');
  }

  /* Bo'sh shablon: qoidalar + ikkita namuna */
  function template() {
    const sample = {
      value: 100,
      title: '50/30/20 qoidasi',
      body: 'Jasur ishga kirdi. Soliqlardan keyin kartasiga 4 000 000 so‘m tushadi.',
      ask: 'U 50/30/20 qoidasidan foydalanmoqchi. Jamg‘armaga qancha ajratishi kerak?',
      options: ['1 000 000 so‘m', '1 500 000 so‘m', '800 000 so‘m'],
      answer: 'C',
      short: '4 000 000 × 20% = 800 000 so‘m',
      explain: 'Qoida qo‘lga tegadigan sof daromadga qo‘llanadi.\n= 4 000 000 × 20% = 800 000',
      summary: '50/30/20 qoidasi (50/30/20 Rule) — sof daromadning 50% zaruriy ehtiyojlarga, 30% istaklarga, 20% jamg‘armaga.\nBu qat’iy me’yor emas, sharoitga moslashtiriladi.'
    };
    const sample2 = {
      value: 300,
      title: 'Qisqa savol namunasi',
      body: '',
      ask: 'Favqulodda jamg‘arma odatda necha oylik xarajatga teng bo‘lishi tavsiya etiladi?',
      options: ['1 oy', '3–6 oy', '24 oy'],
      answer: 'B',
      short: '', explain: '', summary: ''
    };
    return `﻿${HEADER}\n\nMAVZU: Shaxsiy budjet\n\n${block('', sample)}\n\n${block('', sample2)}\n`;
  }

  /* JSON zaxira: { topics: { mavzuId: [savol] } } yoki [{ topic, ...savol }] */
  function fromJson(obj) {
    const items = [];
    const problems = [];
    let list = [];
    if (Array.isArray(obj)) list = obj;
    else if (obj && obj.topics && typeof obj.topics === 'object') {
      Object.keys(obj.topics).forEach((tid) => (Array.isArray(obj.topics[tid]) ? obj.topics[tid] : [])
        .forEach((q) => list.push(Object.assign({ topic: tid }, q))));
    } else {
      return { items, problems: [{ n: 0, line: 0, errors: ['JSON fayl formati noto‘g‘ri'] }] };
    }
    list.forEach((raw, i) => {
      const topic = S.findTopic(raw && raw.topic);
      const q = S.clean(raw);
      const errors = S.validate(q);
      if (!topic) errors.unshift('mavzu noto‘g‘ri');
      if (errors.length) problems.push({ n: i + 1, line: 0, title: q.title, errors });
      else items.push(Object.assign({ topic: topic.id }, q));
    });
    return { items, problems };
  }

  MS.template = { parse, serialize, template, fromJson };
})(window.MS);
