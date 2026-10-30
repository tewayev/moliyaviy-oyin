/* js/ui/dom.js */
/* Kichik DOM va format yordamchilari. */
(function (MS) {
  'use strict';

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);

  const group = (n) => String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  /* 1250 -> "$1 250", -150 -> "−$150" */
  const money = (n) => (n < 0 ? '−' : '') + '$' + group(n);

  /* +300 / −300 / 0 */
  const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + '$' + group(n);

  const clock = (sec) => {
    const s = Math.max(0, Math.ceil(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  MS.dom = { esc, money, signed, clock, $, $$ };
})(window.MS);
