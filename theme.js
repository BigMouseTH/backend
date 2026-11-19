// ============================================================
// Big Mouse — สวิตช์โหมดมืด/สว่าง (ใช้ร่วมกันทุกหน้า)
// - ยังไม่เคยกด: ตามการตั้งค่าของเครื่อง
// - กดสวิตช์แล้ว: จำค่าไว้ในเครื่องนี้
// - มือถือ: อยู่ที่แถบด้านบน ข้างปุ่มเมนู
// - จอใหญ่: อยู่ที่หัวแถบเมนูซ้าย ข้างโลโก้
// ใส่ไว้ใน <head> เพื่อไม่ให้หน้าจอกระพริบขาวตอนโหลด
// ============================================================
(function () {
  var KEY = 'bmf_theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function isDark() {
    var m = saved();
    if (m === 'dark') return true;
    if (m === 'light') return false;
    return !!(mq && mq.matches);
  }
  function apply() {
    var dark = isDark();
    document.documentElement.classList.toggle('dark', dark);
    var sw = document.querySelectorAll('.bmf-switch');
    for (var i = 0; i < sw.length; i++) {
      sw[i].setAttribute('aria-checked', dark ? 'true' : 'false');
      sw[i].title = dark ? 'โหมดมืด (กดเพื่อเปลี่ยนเป็นสว่าง)' : 'โหมดสว่าง (กดเพื่อเปลี่ยนเป็นมืด)';
    }
  }
  function toggle() {
    try { localStorage.setItem(KEY, isDark() ? 'light' : 'dark'); } catch (e) {}
    apply();
  }
  function makeSwitch(extraClass) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bmf-switch ' + (extraClass || '');
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-label', 'โหมดมืด');
    b.innerHTML = '<span class="bmf-switch-icon bmf-sun" aria-hidden="true">☀️</span>' +
                  '<span class="bmf-switch-icon bmf-moon" aria-hidden="true">🌙</span>' +
                  '<span class="bmf-switch-thumb" aria-hidden="true"></span>';
    b.addEventListener('click', toggle);
    return b;
  }

  apply();
  if (mq && mq.addEventListener) mq.addEventListener('change', apply);

  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.bmf-switch')) return;

    // มือถือ: แถบบน ข้างปุ่ม hamburger
    var burger = document.getElementById('mobile-menu-btn');
    if (burger && burger.parentNode) {
      var wrap = document.createElement('div');
      wrap.className = 'bmf-topbar-actions';
      burger.parentNode.insertBefore(wrap, burger);
      wrap.appendChild(makeSwitch('bmf-switch-mobile'));
      wrap.appendChild(burger);
    }

    // จอใหญ่: หัวแถบเมนูซ้าย ข้างโลโก้ (ที่เดียวกับปุ่มปิดเมนูบนมือถือ)
    var closeBtn = document.getElementById('close-menu-btn');
    if (closeBtn && closeBtn.parentNode) {
      closeBtn.parentNode.insertBefore(makeSwitch('bmf-switch-desktop'), closeBtn);
    }

    apply();
  });
})();
