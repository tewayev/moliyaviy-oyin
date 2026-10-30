/* js/core/config.js */
/* O'yin sozlamalari. Raqamlarni faqat shu yerda o'zgartiring.
   Savol tuzilmasi (qiymatlar, harflar, mavzular) — js/shared/schema.js da. */
(function (MS) {
  'use strict';

  const S = MS.schema;

  MS.config = Object.freeze({
    startCapital: 100,               // har jamoaning boshlang'ich kapitali, $
    teamCounts: [3, 4, 5],
    defaultTeamCount: 3,
    values: S.VALUES,                // har mavzudagi savol qiymatlari (tartib bilan)
    letters: S.LETTERS,
    timer: Object.freeze({
      short: 60,      // 100–300 $ savollar
      long: 90,       // 400–500 $ savollar
      longFrom: 400,  // shu qiymatdan boshlab uzun taymer
      warnAt: 10      // oxirgi necha soniyada ogohlantirish rangi
    }),
    historyLimit: 30,                // "Bekor qilish" uchun saqlanadigan qadamlar
    storageKey: 'moliyaviy-oyin:v1', // o'yin holati
    seenKey: 'moliyaviy-oyin:seen'   // shu qurilmada ko'rsatilgan savollar
  });
})(window.MS);
