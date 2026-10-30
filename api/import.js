/* Faqat admin uchun.
   POST /api/import { mode: 'merge' | 'replace', questions: [{ topic, ...savol }] } */
'use strict';

const { route, send, readJson } = require('../lib/http');
const { requireAdmin } = require('../lib/auth');
const bank = require('../lib/bank');

module.exports = route({
  POST: async (req, res) => {
    requireAdmin(req);
    const body = await readJson(req);
    const result = await bank.importMany(body.questions, body.mode);
    send(res, 200, result);
  }
});
