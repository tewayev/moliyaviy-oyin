/* Ochiq: yangi o'yin uchun har katakka bitta savol.
   POST /api/deal { seen: { [katak]: { ids: [...], last } } } -> { questions: { [katak]: savol }, reset: [katak] }
   Butun baza hech qachon ochiq berilmaydi — faqat shu o'yinga tanlangan savollar. */
'use strict';

const { route, send, readJson, clientIp, HttpError } = require('../lib/http');
const bank = require('../lib/bank');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map();

function limit(ip) {
  const now = Date.now();
  const h = hits.get(ip) || { n: 0, from: now };
  if (now - h.from > WINDOW_MS) { h.n = 0; h.from = now; }
  h.n += 1;
  hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  if (h.n > MAX_PER_WINDOW) throw new HttpError(429, 'Juda ko‘p yangi o‘yin. Birozdan keyin qayta urinib ko‘ring');
}

module.exports = route({
  POST: async (req, res) => {
    limit(clientIp(req));
    const body = await readJson(req);
    send(res, 200, await bank.deal(body.seen));
  }
});
