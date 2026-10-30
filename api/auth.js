/* GET    /api/auth — sessiya holati
   POST   /api/auth — kirish { login, password }
   DELETE /api/auth — chiqish */
'use strict';

const { route, send, readJson } = require('../lib/http');
const auth = require('../lib/auth');

module.exports = route({
  GET: (req, res) => send(res, 200, { admin: Boolean(auth.session(req)) }),
  POST: async (req, res) => {
    const body = await readJson(req);
    await auth.login(req, res, body);
    send(res, 200, { admin: true });
  },
  DELETE: (req, res) => {
    auth.logout(res);
    send(res, 200, { admin: false });
  }
});
