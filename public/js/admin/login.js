/* js/admin/login.js */
/* Kirish oynasi: login va parol serverda tekshiriladi, parol brauzerda saqlanmaydi. */
(function (MS) {
  'use strict';

  const A = MS.admin;

  function render() {
    const checking = A.ui.auth === 'checking' || A.ui.auth === 'unknown';
    if (checking) return `<div class="loading"><span class="spin" aria-hidden="true"></span></div>`;
    return `
      <main class="login">
        <section class="login__card card enter">
          <span class="brand__mark login__mark">${A.avatar}</span>
          <div class="login__head">
            <p class="eyebrow">Admin Panel</p>
            <h1 class="h2">Kirish</h1>
          </div>
          ${A.flash()}
          <form class="login__form" data-form="login" novalidate>
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
            <p class="hint is-bad" data-t="login-error" role="alert" hidden></p>
            <button type="submit" class="btn btn--accent btn--xl btn--block" data-t="login-btn">
              <span>Kirish</span>${MS.icon('arrowRight')}
            </button>
          </form>
          <a class="btn btn--ghost login__back" href="#">${MS.icon('arrowLeft')}<span>O‘yinga qaytish</span></a>
        </section>
      </main>`;
  }

  function mount(root, ctl) {
    const form = root.querySelector('[data-form="login"]');
    if (!form) return;
    const user = form.querySelector('#l-login');
    const pass = form.querySelector('#l-pass');
    const err = form.querySelector('[data-t="login-error"]');
    const btn = form.querySelector('[data-t="login-btn"]');
    user.focus({ preventScroll: true });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!user.value.trim() || !pass.value) {
        err.textContent = 'Login va parolni kiriting';
        err.hidden = false;
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<span class="spin" aria-hidden="true"></span><span>Tekshirilmoqda…</span>';
      try {
        await MS.api.login(user.value.trim(), pass.value);
        pass.value = '';
        await ctl.signedIn();
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
        btn.disabled = false;
        btn.innerHTML = `<span>Kirish</span>${MS.icon('arrowRight')}`;
        pass.select();
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
