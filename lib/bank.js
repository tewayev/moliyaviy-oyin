/* Savollar bazasi ustidagi amallar: o'qish, qo'shish/tahrirlash, o'chirish,
   ommaviy yuklash va o'yin uchun savollarni tanlash (aralashtirish).

   Baza: { v: 1, updatedAt, topics: { [mavzuId]: [forma, ...] } } */
'use strict';

const crypto = require('crypto');
const schema = require('../public/js/shared/schema.js');
const storage = require('./storage');
const { HttpError } = require('./http');

const newId = () => 'q' + crypto.randomBytes(6).toString('base64url');

function empty() {
  const topics = {};
  schema.TOPICS.forEach((t) => { topics[t.id] = []; });
  return { v: 1, updatedAt: new Date().toISOString(), topics };
}

/* Birinchi ishga tushishda boshlang'ich savollar bilan to'ldiriladi. */
function seed() {
  const src = require('../seed/questions.json');
  const bank = empty();
  schema.TOPICS.forEach((t) => {
    (src.topics[t.id] || []).forEach((raw) => {
      const q = schema.clean(raw);
      if (!schema.validate(q).length) bank.topics[t.id].push(Object.assign(q, { id: q.id || newId() }));
    });
  });
  return bank;
}

async function load() {
  const cur = await storage.read();
  if (cur) {
    schema.TOPICS.forEach((t) => { if (!Array.isArray(cur.bank.topics[t.id])) cur.bank.topics[t.id] = []; });
    return cur;
  }
  const bank = seed();
  await storage.write(bank, null);
  return storage.read();
}

/* O'qish -> o'zgartirish -> yozish. Boshqa joyda bir vaqtda yozilgan bo'lsa, qayta uriniladi. */
async function mutate(fn) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { bank, etag } = await load();
    const next = JSON.parse(JSON.stringify(bank));
    const result = await fn(next);
    next.updatedAt = new Date().toISOString();
    try {
      await storage.write(next, etag);
      return result;
    } catch (err) {
      if (!(err instanceof storage.Conflict)) throw err;
    }
  }
  throw new HttpError(409, 'Baza ayni paytda boshqa joyda o‘zgartirilmoqda, qayta urinib ko‘ring');
}

const total = (bank) => schema.TOPICS.reduce((n, t) => n + bank.topics[t.id].length, 0);

function checked(raw) {
  const q = schema.clean(raw);
  const errors = schema.validate(q);
  if (errors.length) throw new HttpError(422, errors.join('; '), { errors });
  return q;
}

/* ---------- admin amallari ---------- */
async function all() {
  const { bank } = await load();
  return bank;
}

function upsert(topicId, raw) {
  if (!schema.isTopic(topicId)) throw new HttpError(400, 'Bunday mavzu yo‘q');
  const q = checked(raw);
  return mutate((bank) => {
    const list = bank.topics[topicId];
    const i = q.id ? list.findIndex((x) => x.id === q.id) : -1;
    if (i >= 0) list[i] = q;
    else {
      if (total(bank) >= schema.MAX_QUESTIONS) throw new HttpError(422, `Bazada ko‘pi bilan ${schema.MAX_QUESTIONS} ta savol bo‘lishi mumkin`);
      q.id = newId();
      list.push(q);
    }
    return q;
  });
}

function remove(topicId, id) {
  if (!schema.isTopic(topicId)) throw new HttpError(400, 'Bunday mavzu yo‘q');
  return mutate((bank) => {
    const before = bank.topics[topicId].length;
    bank.topics[topicId] = bank.topics[topicId].filter((x) => x.id !== id);
    if (bank.topics[topicId].length === before) throw new HttpError(404, 'Savol topilmadi');
    return true;
  });
}

/* items: [{ topic, ...forma }]. mode: 'merge' — ID mos kelsa yangilanadi, aks holda qo'shiladi;
   'replace' — butun baza shu ro'yxat bilan almashtiriladi (oldin zaxira nusxa olinadi). */
async function importMany(items, mode) {
  if (!Array.isArray(items)) throw new HttpError(400, 'Savollar ro‘yxati kerak');
  if (items.length > schema.MAX_QUESTIONS) throw new HttpError(413, `Bir martada ko‘pi bilan ${schema.MAX_QUESTIONS} ta savol`);
  if (mode !== 'merge' && mode !== 'replace') throw new HttpError(400, 'Noto‘g‘ri rejim');

  const skipped = [];
  const valid = [];
  items.forEach((raw, index) => {
    const topic = raw && schema.isTopic(raw.topic) ? raw.topic : null;
    const q = schema.clean(raw);
    const errors = schema.validate(q);
    if (!topic) errors.unshift('mavzu noto‘g‘ri');
    if (errors.length) skipped.push({ index, errors });
    else valid.push({ topic, q });
  });

  if (mode === 'replace') {
    const { bank } = await load();
    await storage.backup(bank, 'before-replace');
  }

  return mutate((bank) => {
    let added = 0;
    let updated = 0;
    if (mode === 'replace') bank.topics = empty().topics;
    const seen = new Set();
    valid.forEach(({ topic, q }) => {
      const list = bank.topics[topic];
      const i = q.id && !seen.has(q.id) ? list.findIndex((x) => x.id === q.id) : -1;
      if (i >= 0) { list[i] = q; updated++; }
      else {
        if (!q.id || seen.has(q.id) || schema.TOPICS.some((t) => bank.topics[t.id].some((x) => x.id === q.id))) q.id = newId();
        list.push(q);
        added++;
      }
      seen.add(q.id);
    });
    if (total(bank) > schema.MAX_QUESTIONS) throw new HttpError(422, `Bazada ko‘pi bilan ${schema.MAX_QUESTIONS} ta savol bo‘lishi mumkin`);
    return { added, updated, skipped };
  });
}

/* ---------- o'yin: savollarni tanlash ----------
   Mijoz shu qurilmada ko'rsatilgan savollar ro'yxatini yuboradi: { [katak]: { ids: [...], last } }.
   Har katakka hali ko'rsatilmaganlar orasidan kriptografik tasodifiy bittasi tanlanadi.
   Hammasi ko'rsatib bo'lingan bo'lsa, katak "reset" ro'yxatiga tushadi (yangi davra),
   oxirgi ko'rsatilgan savol esa ketma-ket takrorlanmaydi. */
async function deal(seenRaw) {
  const seenAll = seenRaw && typeof seenRaw === 'object' ? seenRaw : {};
  const { bank } = await load();
  const questions = {};
  const reset = [];

  schema.TOPICS.forEach((t) => {
    schema.VALUES.forEach((v) => {
      const pool = bank.topics[t.id].filter((q) => q.value === v);
      if (!pool.length) return;
      const cell = schema.cellId(t.id, v);
      const rec = seenAll[cell] && typeof seenAll[cell] === 'object' ? seenAll[cell] : {};
      const seen = new Set(Array.isArray(rec.ids) ? rec.ids.slice(0, 2000).map(String) : []);
      let fresh = pool.filter((q) => !seen.has(q.id));
      if (!fresh.length) {
        reset.push(cell);
        fresh = pool.length > 1 ? pool.filter((q) => q.id !== rec.last) : pool;
      }
      questions[cell] = fresh[crypto.randomInt(fresh.length)];
    });
  });

  return { questions, reset };
}

module.exports = { all, upsert, remove, importMany, deal };
