/* Admin autentifikatsiyasi.
   Login va parol faqat serverdagi muhit o'zgaruvchilarida: ADMIN_LOGIN, ADMIN_PASSWORD.
   Muvaffaqiyatli kirishdan keyin imzolangan (HMAC-SHA256) sessiya cookie si beriladi:
   HttpOnly (JavaScript o'qiy olmaydi), Secure, SameSite=Strict, 12 soat amal qiladi.
   Parol o'zgartirilsa, barcha eski sessiyalar avtomatik bekor bo'ladi. */
'use strict';

const crypto = require('crypto');
const { HttpError, clientIp } = require('./http');

const COOKIE = 'ms_admin';
const TTL = 12 * 60 * 60;            // soniya
const MAX_FAILS = 3;                 // shuncha xatodan keyin...
const LOCK_MS = 3 * 60 * 1000;       // ...3 daqiqa bloklanadi

const isProd = () => Boolean(process.env.VERCEL);

function config() {
  const login = process.env.ADMIN_LOGIN || '';
  const password = process.env.ADMIN_PASSWORD || '';
  const secret = process.env.SESSION_SECRET || '';
  if (!login || !password || secret.length < 32) {
    throw new HttpError(500, 'Admin kirishi sozlanmagan (ADMIN_LOGIN, ADMIN_PASSWORD, SESSION_SECRET)');
  }
  return { login, password, secret };
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));   // vaqtga bog'liq hujumlardan himoya

function key(c) {
  return crypto.createHmac('sha256', c.secret).update('ms-admin:' + c.login + ':' + c.password).digest();
}

function sign(payload, c) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', key(c)).update(data).digest('base64url');
  return `${data}.${mac}`;
}

function verify(token, c) {
  const [data, mac] = String(token || '').split('.');
  if (!data || !mac) return null;
  const expected = crypto.createHmac('sha256', key(c)).update(data).digest('base64url');
  if (!same(mac, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return p && p.exp > Math.floor(Date.now() / 1000) ? p : null;
  } catch (e) { return null; }
}

function readCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

function cookie(value, maxAge) {
  return [
    `${COOKIE}=${value}`, 'Path=/api', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAge}`
  ].concat(isProd() ? ['Secure'] : []).join('; ');
}

/* ---------- urinishlarni cheklash (har bir server nusxasi ichida) ---------- */
const fails = new Map();

function locked(seconds) {
  return new HttpError(429, 'Juda ko‘p noto‘g‘ri urinish. Kirish vaqtincha bloklandi', { retryAfter: seconds });
}

function checkLock(ip) {
  const f = fails.get(ip);
  if (f && f.until > Date.now()) throw locked(Math.ceil((f.until - Date.now()) / 1000));
}

/* Xatoni hisoblaydi; qolgan urinishlar sonini qaytaradi (0 — endi bloklandi) */
function noteFail(ip) {
  const f = fails.get(ip) || { count: 0, until: 0 };
  f.count += 1;
  const left = Math.max(0, MAX_FAILS - f.count);
  if (!left) { f.count = 0; f.until = Date.now() + LOCK_MS; }
  fails.set(ip, f);
  if (fails.size > 5000) fails.clear();
  return left;
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- ommaviy amallar ---------- */
async function login(req, res, body) {
  const c = config();
  const ip = clientIp(req);
  checkLock(ip);
  const ok = same(String(body.login || '').trim(), c.login) & same(String(body.password || ''), c.password);
  if (!ok) {
    const left = noteFail(ip);
    await pause(600);   // parolni tez-tez terib ko'rishni sekinlashtiradi
    if (!left) throw locked(LOCK_MS / 1000);
    throw new HttpError(401, 'Login yoki parol noto‘g‘ri', { attemptsLeft: left });
  }
  fails.delete(ip);
  const token = sign({ u: c.login, exp: Math.floor(Date.now() / 1000) + TTL }, c);
  res.setHeader('Set-Cookie', cookie(token, TTL));
}

function logout(res) {
  res.setHeader('Set-Cookie', cookie('', 0));
}

function session(req) {
  return verify(readCookie(req, COOKIE), config());
}

function requireAdmin(req) {
  const s = session(req);
  if (!s) throw new HttpError(401, 'Avval admin sifatida kiring');
  return s;
}

module.exports = { login, logout, session, requireAdmin };
