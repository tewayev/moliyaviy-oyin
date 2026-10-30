/* js/admin/login.js */
/* Kirish oynasi: login va parol serverda tekshiriladi, parol brauzerda saqlanmaydi.
   3 marta noto'g'ri urinishdan keyin kirish 3 daqiqaga bloklanadi: kartochka tepasida
   orqaga sanoq chiqadi. Blok brauzerda ham eslab qolinadi (sahifa yangilansa ham saqlanadi). */
(function (MS) {
  'use strict';

  const A = MS.admin;
  const KEY = 'moliyaviy-oyin:login-lock';
  const MAX_FAILS = 3;
  const LOCK_SEC = 180;

  /* ---------- blok holati: { fails, until } ---------- */
  function readLock() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      return v && typeof v === 'object' ? { fails: Number(v.fails) || 0, until: Number(v.until) || 0 } : { fails: 0, until: 0 };
    } catch (e) { return { fails: 0, until: 0 }; }
  }

  function writeLock(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* saqlash mumkin emas */ }
  }

  const clearLock = () => { try { localStorage.removeItem(KEY); } catch (e) { /* e'tiborsiz */ } };
  const secondsLeft = () => Math.max(0, Math.ceil((readLock().until - Date.now()) / 1000));
  const lockFor = (sec) => writeLock({ fails: 0, until: Date.now() + sec * 1000 });

  function render() {
    const checking = A.ui.auth === 'checking' || A.ui.auth === 'unknown';
    if (checking) return `<div class="loading"><span class="spin" aria-hidden="true"></span></div>`;
    return `
      <main class="login">
        <section class="login__card card enter">
          <span class="brand__mark login__mark">${A.avatar}</span>
          <div class="login__head">
            <h1 class="h2">Kirish</h1>
          </div>
          <div class="lockout" data-t="lockout" role="timer" aria-label="Kirish vaqtincha bloklandi" hidden>
            ${MS.icon('lock')}<span data-t="lock-time">3:00</span>
          </div>
          ${A.flash()}
          <form class="login__form" data-form="login" novalidate>
            <fieldset class="login__fields" data-t="fields">
            <div class="ff">
              <label class="ff__label" for="l-login">Login</label>
              <input class="input" id="l-login" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="64" required>
            </div>
            <div class="ff">
              <label class="ff__label" for="l-pass">Parol</label>
              <div class="pw">
                <input class="input" id="l-pass" name="password" type="password" autocomplete="current-password" maxlength="128" required>
                <button type="button" class="pw__toggle" data-action="adm-pw" aria-label="Parolni ko‘rsatish" title="Parolni ko‘rsatish">${MS.icon('eye')}</button>
              </div>
            </div>
            </fieldset>
            <p class="hint is-bad" data-t="login-error" role="alert" hidden></p>
            <button type="submit" class="btn btn--accent btn--xl btn--block" data-t="login-btn">
              <span>Kirish</span>${MS.icon('arrowRight')}
            </button>
          </form>
          <a class="btn btn--ghost login__back" href="#">${MS.icon('arrowLeft')}<span>O‘yinga qaytish</span></a>
        </section>
      </main>`;
  }

  let tick = 0;

  function mount(root, ctl) {
    const form = root.querySelector('[data-form="login"]');
    clearInterval(tick);
    if (!form) return;
    const user = form.querySelector('#l-login');
    const pass = form.querySelector('#l-pass');
    const err = form.querySelector('[data-t="login-error"]');
    const btn = form.querySelector('[data-t="login-btn"]');
    const fields = form.querySelector('[data-t="fields"]');
    const box = root.querySelector('[data-t="lockout"]');
    const time = root.querySelector('[data-t="lock-time"]');
    const idle = () => { btn.innerHTML = `<span>Kirish</span>${MS.icon('arrowRight')}`; };

    function showError(text) {
      err.textContent = text;
      err.hidden = !text;
    }

    /* Blok bo'lsa — sanoq, maydonlar o'chiq; tugasa — forma qaytadan ochiladi */
    function paint() {
      if (!box.isConnected) { clearInterval(tick); return; }
      const left = secondsLeft();
      const on = left > 0;
      box.hidden = !on;
      fields.disabled = on;
      btn.disabled = on;
      if (on) {
        time.textContent = MS.dom.clock(left);
        showError('');
        return;
      }
      clearInterval(tick);
      tick = 0;
      if (readLock().until) { writeLock({ fails: 0, until: 0 }); user.focus({ preventScroll: true }); }
    }

    function startCountdown() {
      clearInterval(tick);
      paint();
      if (secondsLeft() > 0) tick = setInterval(paint, 250);
    }

    startCountdown();
    if (!secondsLeft()) user.focus({ preventScroll: true });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (secondsLeft()) return;
      if (!user.value.trim() || !pass.value) { showError('Login va parolni kiriting'); return; }
      btn.disabled = true;
      btn.innerHTML = '<span class="spin" aria-hidden="true"></span><span>Tekshirilmoqda…</span>';
      try {
        await MS.api.login(user.value.trim(), pass.value);
        pass.value = '';
        clearLock();
        await ctl.signedIn();
      } catch (ex) {
        idle();
        btn.disabled = false;
        pass.value = '';
        const data = ex.data || {};
        if (ex.status === 429) {
          lockFor(Number(data.retryAfter) || LOCK_SEC);
        } else if (ex.status === 401) {
          // server nusxasi boshqa bo'lishi mumkin — brauzer ham o'zi sanaydi
          const lock = readLock();
          const fails = lock.fails + 1;
          const left = Math.min(MAX_FAILS - fails, data.attemptsLeft == null ? MAX_FAILS : data.attemptsLeft);
          if (left <= 0) lockFor(LOCK_SEC);
          else {
            writeLock({ fails, until: 0 });
            showError(`${ex.message}. Yana ${left} ta urinish qoldi`);
          }
        } else {
          showError(ex.message);
        }
        if (secondsLeft()) startCountdown();
        else pass.focus();
      }
    });
  }

  function togglePassword(btn) {
    const input = btn.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = MS.icon(show ? 'eyeOff' : 'eye');
    btn.setAttribute('aria-label', show ? 'Parolni yashirish' : 'Parolni ko‘rsatish');
  }

  A.views.login = { render, mount, togglePassword };
})(window.MS);
