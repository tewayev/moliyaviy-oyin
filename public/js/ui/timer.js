/* js/ui/timer.js */
/* Taymer: moderator boshqaradi. Holat DOM dan alohida saqlanadi,
   shuning uchun ekran qayta chizilsa ham vaqt yo'qolmaydi.
   0 ga yetganda to'xtaydi va "Vaqt tugadi" ko'rsatadi; ball avtomatik ayrilmaydi.
   Holat brauzerda saqlanadi: sahifa yangilansa vaqt boshidan boshlanmaydi. */
(function (MS) {
  'use strict';

  const { clock } = MS.dom;
  const T = MS.config.timer;
  const R = 52;
  const LEN = 2 * Math.PI * R;

  let duration = T.short;
  let remaining = T.short;
  let status = 'idle';     // idle | running | paused | done
  let endAt = 0;
  let tid = 0;
  let root = null;
  let lastBeep = 0;        // oxirgi signal berilgan soniya (takrorlanmasin)

  /* ---------- ovoz: oxirgi 5 soniyada har soniyada "tiyt" ---------- */
  const BEEP_FROM = 5;
  let audio = null;

  function unlockAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audio) audio = new Ctx();
    if (audio.state === 'suspended') audio.resume();
  }

  function beep() {
    if (!audio) return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  function countdownBeep() {
    const sec = Math.ceil(remaining);
    if (sec >= 1 && sec <= BEEP_FROM && sec !== lastBeep) {
      lastBeep = sec;
      beep();
    }
  }

  const durationFor = (value) => (value >= T.longFrom ? T.long : T.short);

  /* ---------- saqlash ---------- */
  const KEY = MS.config.storageKey + ':timer';

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ duration, remaining, status, endAt })); } catch (e) { /* saqlash mumkin emas */ }
  }

  // Saqlangan taymerni tiklaydi; yurib turgan bo'lsa, sahifa yopiq turgan vaqt ham hisobga olinadi.
  function restore() {
    let t = null;
    try { t = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* e'tiborsiz */ }
    if (!t || !(t.duration > 0) || !MAIN[t.status]) return false;
    stopTicking();
    duration = t.duration;
    remaining = Math.min(Math.max(0, Number(t.remaining) || 0), duration);
    status = t.status;
    endAt = Number(t.endAt) || 0;
    lastBeep = 0;
    if (status === 'running') {
      // ovoz faqat foydalanuvchi bosgandan keyin yoqiladi
      document.addEventListener('pointerdown', unlockAudio, { once: true });
      tid = setInterval(tick, 200);
      tick();
    }
    paint();
    return true;
  }

  function stopTicking() { clearInterval(tid); tid = 0; }

  function prepare(seconds) {
    stopTicking();
    duration = seconds;
    remaining = seconds;
    status = 'idle';
    lastBeep = 0;
    persist();
    paint();
  }

  function tick() {
    remaining = Math.max(0, (endAt - Date.now()) / 1000);
    if (remaining <= 0) { stopTicking(); status = 'done'; persist(); }
    else countdownBeep();
    paint();
  }

  function start() {
    if (status === 'running') return;
    if (status === 'done') { remaining = duration; lastBeep = 0; }
    unlockAudio();
    endAt = Date.now() + remaining * 1000;
    status = 'running';
    stopTicking();
    tid = setInterval(tick, 200);
    persist();
    paint();
  }

  function pause() {
    if (status !== 'running') return;
    remaining = Math.max(0, (endAt - Date.now()) / 1000);
    stopTicking();
    status = 'paused';
    persist();
    paint();
  }

  const toggle = () => (status === 'running' ? pause() : start());
  const reset = () => prepare(duration);
  const setDuration = (s) => { if (status !== 'running') prepare(s); };
  const freeze = () => pause();

  /* ---------- ko'rinish ---------- */
  const LABEL = { idle: 'Tayyor', running: 'Vaqt ketmoqda', paused: 'To‘xtatildi', done: 'Vaqt tugadi' };
  const MAIN = {
    idle: ['play', 'Vaqtni boshlash'],
    running: ['pause', 'Pauza'],
    paused: ['play', 'Davom ettirish'],
    done: ['refresh', 'Qayta boshlash']
  };

  function markup() {
    return `
      <div class="timer" data-timer>
        <div class="timer__dial">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle class="timer__track" cx="60" cy="60" r="${R}"/>
            <circle class="timer__bar" data-t="bar" cx="60" cy="60" r="${R}" stroke-dasharray="${LEN.toFixed(2)}"/>
          </svg>
          <div class="timer__read">
            <span class="timer__time" data-t="time">0:00</span>
            <span class="timer__label" data-t="label"></span>
          </div>
        </div>
        <div class="timer__controls">
          <button class="btn btn--primary btn--lg timer__main" data-action="timer-toggle" data-t="main"></button>
          <div class="timer__row">
            <div class="seg seg--sm" role="group" aria-label="Taymer davomiyligi">
              <button class="seg__btn" data-action="timer-set" data-sec="${T.short}" data-t="dur">${clock(T.short)}</button>
              <button class="seg__btn" data-action="timer-set" data-sec="${T.long}" data-t="dur">${clock(T.long)}</button>
            </div>
            <button class="btn btn--ghost btn--icon" data-action="timer-reset" aria-label="Taymerni qaytarish" title="Qaytarish">${MS.icon('reset')}</button>
          </div>
        </div>
      </div>`;
  }

  function mount(node) { root = node; paint(); }

  function paint() {
    if (!root || !root.isConnected) return;
    const q = (k) => root.querySelector(`[data-t="${k}"]`);
    const warn = status === 'running' && Math.ceil(remaining) <= T.warnAt;
    const box = root.querySelector('[data-timer]');
    box.dataset.status = status;
    box.classList.toggle('is-warn', warn);

    q('bar').style.strokeDashoffset = (LEN * (1 - remaining / duration)).toFixed(2);
    q('time').textContent = clock(remaining);
    q('label').textContent = LABEL[status];

    const [ic, text] = MAIN[status];
    q('main').innerHTML = `${MS.icon(ic)}<span>${text}</span>`;

    root.querySelectorAll('[data-t="dur"]').forEach((b) => {
      const on = Number(b.dataset.sec) === duration;
      b.classList.toggle('is-on', on);
      b.disabled = status === 'running';
      b.setAttribute('aria-pressed', String(on));
    });
  }

  MS.timer = { durationFor, prepare, restore, start, pause, toggle, reset, setDuration, freeze, markup, mount };
})(window.MS);
