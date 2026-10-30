/* js/import/docx.js */
/* Word (.docx) faylidan oddiy matn olish — tashqi kutubxonasiz.
   .docx — bu ZIP arxiv: ichidagi word/document.xml dan xatboshilar o'qiladi.
   Word avtomatik qilgan ro'yxatlar ham hisobga olinadi: nuqtali ro'yxat "- ",
   raqamli/harfli ro'yxat esa "A) B) C)" bo'lib chiqadi (variantlar uchun). */
(function (MS) {
  'use strict';

  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const LETTERS = MS.schema.LETTERS;

  function entries(buf) {
    const u8 = new Uint8Array(buf);
    const dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Bu Word (.docx) fayli emas');
    const count = dv.getUint16(eocd + 10, true);
    let off = dv.getUint32(eocd + 16, true);
    const out = {};
    for (let k = 0; k < count && dv.getUint32(off, true) === 0x02014b50; k++) {
      const method = dv.getUint16(off + 10, true);
      const size = dv.getUint32(off + 20, true);
      const nlen = dv.getUint16(off + 28, true);
      const elen = dv.getUint16(off + 30, true);
      const clen = dv.getUint16(off + 32, true);
      const local = dv.getUint32(off + 42, true);
      const name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nlen));
      const begin = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      out[name] = { method, data: u8.subarray(begin, begin + size) };
      off += 46 + nlen + elen + clen;
    }
    return out;
  }

  async function read(entry) {
    if (!entry) return '';
    if (entry.method === 0) return new TextDecoder().decode(entry.data);
    if (!window.DecompressionStream) throw new Error('Bu brauzer Word faylni ocha olmaydi — .txt fayl ishlating');
    const stream = new Blob([entry.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  }

  const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
  const kids = (el, tag) => Array.from(el.getElementsByTagNameNS(W, tag));
  const attr = (el, name) => el && (el.getAttributeNS(W, name) || el.getAttribute('w:' + name));

  /* numId -> ro'yxat turi ('bullet' yoki boshqa) */
  function numbering(doc) {
    const map = {};
    if (!doc) return map;
    const abstract = {};
    kids(doc, 'abstractNum').forEach((a) => {
      const lvl = kids(a, 'lvl')[0];
      const fmt = lvl && kids(lvl, 'numFmt')[0];
      abstract[attr(a, 'abstractNumId')] = fmt ? attr(fmt, 'val') : 'decimal';
    });
    kids(doc, 'num').forEach((n) => {
      const ref = kids(n, 'abstractNumId')[0];
      map[attr(n, 'numId')] = abstract[attr(ref, 'val')] || 'decimal';
    });
    return map;
  }

  async function toText(buf) {
    const files = entries(buf);
    if (!files['word/document.xml']) throw new Error('Bu Word (.docx) fayli emas');
    const doc = xml(await read(files['word/document.xml']));
    const nums = numbering(files['word/numbering.xml'] ? xml(await read(files['word/numbering.xml'])) : null);

    const lines = [];
    let listId = null;
    let index = 0;
    kids(doc, 'p').forEach((p) => {
      let text = '';
      p.querySelectorAll('*').forEach((el) => {
        if (el.namespaceURI !== W) return;
        if (el.localName === 't') text += el.textContent;
        else if (el.localName === 'tab') text += ' ';
        else if (el.localName === 'br') text += '\n';
      });
      const numPr = kids(p, 'numPr')[0];
      const numId = numPr && attr(kids(numPr, 'numId')[0], 'val');
      if (numId && numId !== '0') {
        if (numId !== listId) { listId = numId; index = 0; }
        const t = text.trim();
        if (nums[numId] === 'bullet') text = '- ' + t;
        else if (!/^[A-E]\s*[).]/.test(t)) text = `${LETTERS[index] || '?'}) ${t}`;
        index += 1;
      } else if (text.trim()) {
        listId = null;
      }
      lines.push(text);
    });
    return lines.join('\n');
  }

  MS.docx = { toText };
})(window.MS);
