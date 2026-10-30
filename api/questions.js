/* Faqat admin uchun.
   GET    /api/questions                 — butun baza
   POST   /api/questions                 — savol qo'shish/tahrirlash { topic, question }
   DELETE /api/questions?topic=..&id=..  — savolni o'chirish */
'use strict';

const { route, send, readJson, query, HttpError } = require('../lib/http');
const { requireAdmin } = require('../lib/auth');
const bank = require('../lib/bank');

module.exports = route({
  GET: async (req, res) => {
    requireAdmin(req);
    const b = await bank.all();
    send(res, 200, { topics: b.topics, updatedAt: b.updatedAt });
  },
  POST: async (req, res) => {
    requireAdmin(req);
    const body = await readJson(req);
    const question = await bank.upsert(String(body.topic || ''), body.question);
    send(res, 200, { question });
  },
  DELETE: async (req, res) => {
    requireAdmin(req);
    const q = query(req);
    const id = q.get('id');
    if (!id) throw new HttpError(400, 'Savol ID si ko‘rsatilmagan');
    await bank.remove(q.get('topic') || '', id);
    send(res, 200, { ok: true });
  }
});
