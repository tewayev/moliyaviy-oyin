/* js/core/seen.js */
/* Shu qurilmada qaysi savollar ko'rsatilganini eslab qoladi: { [katak]: { ids: [...], last } }.
   Ro'yxat yangi o'yin so'ralganda serverga yuboriladi va server hali ko'rsatilmagan savollarni
   tanlaydi. Katakdagi hamma savol ko'rsatib bo'lingach, server "reset" qaytaradi — yangi davra. */
(function (MS) {
  'use strict';

  const KEY = MS.config.seenKey;

  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      return v && typeof v === 'object' ? v : {};
    } catch (e) { return {}; }
  }

  function write(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* saqlash mumkin emas */ }
  }

  function reset(cells) {
    if (!cells || !cells.length) return;
    const v = read();
    cells.forEach((c) => { v[c] = { ids: [], last: v[c] ? v[c].last : null }; });
    write(v);
  }

  function mark(cell, id) {
    const v = read();
    const rec = v[cell] || { ids: [], last: null };
    if (rec.ids.indexOf(id) < 0) rec.ids.push(id);
    rec.last = id;
    v[cell] = rec;
    write(v);
  }

  MS.seen = { read, reset, mark };
})(window.MS);
