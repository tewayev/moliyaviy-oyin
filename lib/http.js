/* HTTP yordamchilari: JSON javob, so'rov tanasini o'qish, xatolar, CSRF tekshiruvi. */
'use strict';

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function send(res, status, data, headers) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  Object.entries(headers || {}).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(data));
}

const MAX_BODY = 4 * 1024 * 1024;

async function readJson(req) {
  const type = String(req.headers['content-type'] || '');
  if (!type.startsWith('application/json')) throw new HttpError(415, 'So‘rov JSON formatida bo‘lishi kerak');

  // Vercel tanani o'zi o'qib qo'ygan bo'lishi mumkin
  let body;
  try { body = req.body; } catch (e) { throw new HttpError(400, 'JSON o‘qib bo‘lmadi'); }
  if (body !== undefined && body !== null && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  if (typeof body === 'string' || Buffer.isBuffer(body)) return parse(String(body));

  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new HttpError(413, 'So‘rov juda katta');
    chunks.push(c);
  }
  return parse(Buffer.concat(chunks).toString('utf8'));
}

function parse(text) {
  try { return text ? JSON.parse(text) : {}; } catch (e) { throw new HttpError(400, 'JSON o‘qib bo‘lmadi'); }
}

const query = (req) => new URL(req.url, 'http://localhost').searchParams;

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || String(req.headers['x-real-ip'] || '') || (req.socket && req.socket.remoteAddress) || 'unknown';
}

/* O'zgartiruvchi so'rovlar faqat shu saytning o'zidan kelishi kerak (CSRF himoyasi). */
function assertSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;   // brauzer bo'lmagan mijoz: cookie baribir SameSite=Strict
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  let originHost = '';
  try { originHost = new URL(origin).host; } catch (e) { /* pastda rad etiladi */ }
  if (originHost !== host) throw new HttpError(403, 'Ruxsat yo‘q');
}

/* Endpoint yaratuvchi: { GET, POST, DELETE } ishlovchilari, xatolarni JSON ga aylantiradi. */
function route(methods) {
  return async (req, res) => {
    const fn = methods[req.method];
    try {
      if (!fn) {
        res.setHeader('Allow', Object.keys(methods).join(', '));
        throw new HttpError(405, 'Bu usul qo‘llab-quvvatlanmaydi');
      }
      if (req.method !== 'GET') assertSameOrigin(req);
      await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, Object.assign({ error: err.message }, err.extra));
      console.error(err);
      return send(res, 500, { error: 'Serverda xatolik yuz berdi' });
    }
  };
}

module.exports = { HttpError, send, readJson, query, clientIp, route };
