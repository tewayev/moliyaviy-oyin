/* Savollar bazasini saqlash.
   Vercel'da: yopiq (private) Vercel Blob — fayl to'g'ridan-to'g'ri havola orqali ochilmaydi,
   faqat server o'qiy oladi. Bir vaqtda ikki joydan yozilsa, ETag (ifMatch) adashtirmaydi.
   Mahalliy ishlab chiqishda (BLOB_READ_WRITE_TOKEN yo'q bo'lsa): .data/bank.json fayli. */
'use strict';

const fs = require('fs');
const path = require('path');
const { HttpError } = require('./http');

const KEY = 'bank/current.json';
const BACKUP_PREFIX = 'backups/';
const KEEP_BACKUPS = 20;

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

class Conflict extends Error {}

/* ---------- Vercel Blob ---------- */
let blobApi = null;
const blob = () => blobApi || (blobApi = require('@vercel/blob'));

let cached = null;   // { bank, etag } — o'zgarmagan bo'lsa qayta yuklab olinmaydi

async function blobRead() {
  const r = await blob().get(KEY, Object.assign(
    { access: 'private', useCache: false },
    cached ? { ifNoneMatch: cached.etag } : {}
  ));
  if (!r) { cached = null; return null; }
  if (r.statusCode === 304 && cached) return cached;
  const text = await new Response(r.stream).text();
  cached = { bank: JSON.parse(text), etag: r.blob.etag };
  return cached;
}

async function blobWrite(bank, etag) {
  const opts = { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true };
  if (etag) opts.ifMatch = etag;
  try {
    const r = await blob().put(KEY, JSON.stringify(bank), opts);
    cached = { bank, etag: r.etag };
  } catch (err) {
    cached = null;
    if (err instanceof blob().BlobPreconditionFailedError) throw new Conflict();
    throw err;
  }
}

async function blobBackup(bank, reason) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await blob().put(`${BACKUP_PREFIX}${stamp}-${reason}.json`, JSON.stringify(bank), {
    access: 'private', contentType: 'application/json', addRandomSuffix: true
  });
  const { blobs } = await blob().list({ prefix: BACKUP_PREFIX, limit: 1000 });
  const old = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(KEEP_BACKUPS);
  if (old.length) await blob().del(old.map((b) => b.url));
}

/* ---------- mahalliy fayl ---------- */
const DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DIR, 'bank.json');

function fileRead() {
  if (!fs.existsSync(FILE)) return null;
  const stat = fs.statSync(FILE);
  return { bank: JSON.parse(fs.readFileSync(FILE, 'utf8')), etag: String(stat.mtimeMs) };
}

function fileWrite(bank, etag) {
  const cur = fileRead();
  if (etag && cur && cur.etag !== etag) throw new Conflict();
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(bank, null, 1));
}

function fileBackup(bank, reason) {
  fs.mkdirSync(path.join(DIR, 'backups'), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(DIR, 'backups', `${stamp}-${reason}.json`), JSON.stringify(bank));
}

/* ---------- umumiy ---------- */
function ensureConfigured() {
  if (!useBlob() && process.env.VERCEL) {
    throw new HttpError(500, 'Savollar ombori ulanmagan (Vercel Blob)');
  }
}

async function read() {
  ensureConfigured();
  return useBlob() ? blobRead() : fileRead();
}

async function write(bank, etag) {
  ensureConfigured();
  return useBlob() ? blobWrite(bank, etag) : fileWrite(bank, etag);
}

async function backup(bank, reason) {
  ensureConfigured();
  return useBlob() ? blobBackup(bank, reason) : fileBackup(bank, reason);
}

module.exports = { read, write, backup, Conflict };
