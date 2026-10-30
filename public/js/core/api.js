/* js/core/api.js */
/* Server bilan aloqa. Xatolarda Error tashlanadi: err.status va serverdan kelgan xabar. */
(function (MS) {
  'use strict';

  async function request(method, url, body) {
    let res;
    try {
      res = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      const err = new Error('Internet aloqasi yo‘q yoki server javob bermadi');
      err.status = 0;
      throw err;
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* bo'sh javob */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Xatolik (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  MS.api = {
    session: () => request('GET', '/api/auth'),
    login: (login, password) => request('POST', '/api/auth', { login, password }),
    logout: () => request('DELETE', '/api/auth'),
    questions: () => request('GET', '/api/questions'),
    saveQuestion: (topic, question) => request('POST', '/api/questions', { topic, question }),
    removeQuestion: (topic, id) => request('DELETE', `/api/questions?topic=${encodeURIComponent(topic)}&id=${encodeURIComponent(id)}`),
    importQuestions: (questions, mode) => request('POST', '/api/import', { questions, mode }),
    deal: (seen) => request('POST', '/api/deal', { seen })
  };
})(window.MS);
