/* ==========================================================================
   북전주 광신프로그레스 — main.js
   의존성 없음 (vanilla). 로딩 속도를 위해 라이브러리를 쓰지 않았습니다.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------------
     1) 사진 주입 — js/photos.js 의 window.PHOTOS 목록을 화면에 반영
        · [data-photo="키"] 요소에 해당 사진을 넣습니다.
        · #galleryGrid 안에 PHOTOS.gallery 목록만큼 칸을 만듭니다.
        · 파일이 없거나 로드 실패하면 "안내판(빈 칸)"으로 표시됩니다.
        사진을 바꾸려면 js/photos.js 만 고치면 됩니다. (이 파일 수정 불필요)
     ------------------------------------------------------------------ */
  var PHOTOS = window.PHOTOS || {};

  function markEmpty(fig) { fig.classList.add('is-empty'); }
  function markFilled(fig) { fig.classList.remove('is-empty'); }

  // figure(.media) 하나에 사진 항목({file, alt, note})을 적용
  function applyPhoto(fig, entry) {
    if (!fig) return;
    entry = entry || {};
    var isDataUri = entry.file && entry.file.slice(0, 5) === 'data:';
    if (entry.note) fig.setAttribute('data-hint', entry.note);
    if (entry.file && !isDataUri) fig.setAttribute('data-slot', entry.file);
    else if (isDataUri) fig.setAttribute('data-slot', '(내장 이미지)');

    var img = fig.querySelector('img');
    if (!entry.file) {                       // 파일 지정 안 됨 → 안내판
      if (img) { img.removeAttribute('src'); img.alt = ''; }
      markEmpty(fig);
      return;
    }
    if (!img) {
      img = document.createElement('img');
      img.decoding = 'async';
      img.loading = 'lazy';
      fig.appendChild(img);
    }
    if (entry.alt != null) img.alt = entry.alt;
    img.addEventListener('error', function () { markEmpty(fig); });
    img.addEventListener('load', function () {
      if (img.naturalWidth) markFilled(fig); else markEmpty(fig);
    });
    img.src = entry.file;
    if (img.complete && !img.naturalWidth) markEmpty(fig);
  }

  // 1-a) 이름표가 붙은 슬롯 채우기  ([data-photo="heroAerial"] 등)
  $$('[data-photo]').forEach(function (fig) {
    applyPhoto(fig, PHOTOS[fig.getAttribute('data-photo')]);
  });

  // 1-b) 갤러리 — PHOTOS.gallery 목록만큼 칸 생성
  var galleryGrid = $('#galleryGrid');
  if (galleryGrid && Array.isArray(PHOTOS.gallery)) {
    PHOTOS.gallery.forEach(function (g, i) {
      var mod = g.size === 'wide' ? ' gcell--wide' : g.size === 'tall' ? ' gcell--tall' : '';
      var fig = document.createElement('figure');
      fig.className = 'media media--zoom gcell' + mod;
      fig.setAttribute('data-wipe', '');
      fig.setAttribute('data-reveal', '');
      if (i % 2) fig.setAttribute('data-delay', '1');
      if (g.caption) {
        var cap = document.createElement('figcaption');
        cap.className = 'gcell__cap';
        cap.textContent = g.caption;
        fig.appendChild(cap);
      }
      galleryGrid.appendChild(fig);
      applyPhoto(fig, {
        file: g.file,
        alt:  g.alt || g.caption || '',
        note: (g.caption ? g.caption + ' 사진' : '갤러리 사진') + ' · 넣을 파일: ' + (g.file || '(미지정)')
      });
    });
  }

  // 1-c) 그 밖의 .media (이름표·갤러리 아닌 것) — src 유무만 확인
  $$('.media').forEach(function (fig) {
    if (fig.hasAttribute('data-photo') || fig.parentNode === galleryGrid) return;
    var img = fig.querySelector('img');
    if (!img || !img.getAttribute('src')) { markEmpty(fig); return; }
    if (img.complete) {
      if (!img.naturalWidth) markEmpty(fig);
    } else {
      img.addEventListener('error', function () { markEmpty(fig); });
      img.addEventListener('load', function () { if (!img.naturalWidth) markEmpty(fig); });
    }
  });

  /* ------------------------------------------------------------------
     1-B) 섹션 인덱스 번호 배지 주입 (항상 실행 — 애니메이션은 anim.js)
     ------------------------------------------------------------------ */
  $$('main > section.section').forEach(function (sec, i) {
    sec.classList.add('sect');
    if (sec.querySelector('.sect__no')) return;
    var no = document.createElement('span');
    no.className = 'sect__no';
    no.setAttribute('aria-hidden', 'true');
    no.textContent = ('0' + (i + 1)).slice(-2);
    sec.insertBefore(no, sec.firstChild);
  });

  /* ------------------------------------------------------------------
     2) 헤더 — 스크롤 시 흰 배경으로 전환
     ------------------------------------------------------------------ */
  var header = $('#siteHeader');
  var floatBar = $('.float');
  var lastSolid = null;
  function onScroll() {
    var solid = window.scrollY > (window.innerHeight * 0.7);
    if (solid !== lastSolid) {
      header.classList.toggle('is-solid', solid);
      lastSolid = solid;
    }
    // 모바일: 히어로를 지나야 플로팅 버튼이 나타나도록
    if (floatBar) floatBar.classList.toggle('is-visible', window.scrollY > 320);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     3) 모바일 메뉴
     ------------------------------------------------------------------ */
  var burger = $('#burger');
  var mobilemenu = $('#mobilemenu');

  function setMenu(open) {
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    mobilemenu.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
    if (open) header.classList.add('is-solid');
    else onScroll();
  }

  burger.addEventListener('click', function () {
    setMenu(!mobilemenu.classList.contains('is-open'));
  });
  $$('#mobilemenu a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobilemenu.classList.contains('is-open')) setMenu(false);
  });

  /* ------------------------------------------------------------------
     4) 스크롤 리빌 → js/anim.js 로 이동했습니다.
     ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------
     6) 평면도 탭
     ------------------------------------------------------------------ */
  var tabs = $$('.tab[role="tab"]');
  function selectTab(tab) {
    var shown = null;
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = !on;
      if (on) shown = panel;
    });
    // hidden 상태에서는 브라우저가 loading="lazy" 이미지를 로드하지 않으므로
    // 패널이 보이는 순간 강제로 즉시 로드시킨다 (84B 평면도 등 탭 전환 시 빈 이미지 방지).
    if (shown) {
      $$('img[loading="lazy"]', shown).forEach(function (img) {
        if (!img.complete || !img.naturalWidth) img.loading = 'eager';
      });
    }
    // 패널 전환 시 부드럽게 나타나기 (GSAP 있을 때만)
    if (shown && window.gsap) {
      window.gsap.fromTo(shown,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: .55, ease: 'power2.out', clearProps: 'transform' });
    }
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft')  next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (next) { e.preventDefault(); next.focus(); selectTab(next); }
    });
  });

  /* ------------------------------------------------------------------
     7) FAQ 아코디언
     ------------------------------------------------------------------ */
  $$('.acc__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.acc__item');
      var open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ------------------------------------------------------------------
     8) 방문예약 · 관심고객 폼
        · 전화번호 자동 하이픈 / 유효성 검사
        · data-endpoint(Google Apps Script 웹앱 URL)로 fetch 전송
          → 접수 즉시 김수진 과장(010-8114-4638)에게 문자(SMS) 발송
        · endpoint 가 비어 있으면 입력 검증만 하고 안내 문구 표시
          (설정 방법: api/폼연동-안내.md)
     ------------------------------------------------------------------ */
  var form = $('#leadForm');
  var msg  = $('#formMsg');
  var submitBtn = $('#leadSubmit');

  function say(text, ok) {
    if (!msg) return;
    msg.hidden = false;
    msg.textContent = text;
    msg.style.borderColor = ok ? 'var(--brand)' : '#ff6b6b';
    msg.style.color = ok ? 'var(--brand)' : '#ff9b9b';
  }

  var phone = $('#f-phone');
  if (phone) {
    phone.addEventListener('input', function () {
      var v = phone.value.replace(/\D/g, '').slice(0, 11);
      if (v.length < 4)       phone.value = v;
      else if (v.length < 8)  phone.value = v.slice(0, 3) + '-' + v.slice(3);
      else                    phone.value = v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7);
    });
  }

  if (form) {
    // 현재 페이지 주소를 숨은 필드에 채움 (문의 출처 확인용)
    var pageField = form.querySelector('[data-fill="href"]');
    if (pageField) { try { pageField.value = location.href; } catch (e) {} }

    // '방문예약'일 때만 희망 방문일시 칸 강조
    var purpose = $('#f-purpose');
    var visitField = form.querySelector('[data-visit-only]');
    function syncVisit() {
      if (!visitField) return;
      var isVisit = purpose && purpose.value === '방문예약';
      visitField.style.opacity = isVisit ? '1' : '.55';
    }
    if (purpose) { purpose.addEventListener('change', syncVisit); syncVisit(); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name  = $('#f-name');
      var agree = $('#f-agree');
      var hp    = form.querySelector('[name="_hp"]');

      if (hp && hp.value) { return; } // 봇
      if (!name.value.trim()) { say('성함을 입력해 주세요.', false); name.focus(); return; }
      var digits = phone.value.replace(/\D/g, '');
      if (!/^01[016789]\d{7,8}$/.test(digits)) {
        say('휴대폰 번호를 정확히 입력해 주세요.', false); phone.focus(); return;
      }
      if (!agree.checked) { say('개인정보 수집·이용에 동의해 주세요.', false); agree.focus(); return; }

      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) {
        say('입력이 확인되었습니다. 전송 연동이 아직 설정되지 않아 접수되지 않았습니다. (담당자: api/폼연동-안내.md 참고)', true);
        return;
      }

      // ---- 전송 ----
      var data = new FormData(form);
      data.append('submitted_at', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
      if (submitBtn) { submitBtn.disabled = true; }
      say('접수 중입니다…', true);

      fetch(endpoint, { method: 'POST', body: data })
        .then(function () {
          // Apps Script 웹앱은 CORS 응답 헤더가 없어 본문을 읽지 못할 수 있으나
          // 요청 자체는 전달됩니다. 정상 접수로 처리.
          form.reset();
          if (pageField) pageField.value = location.href;
          syncVisit();
          say('접수되었습니다. 담당 상담사(김수진 과장)가 확인 후 연락드리겠습니다.', true);
        })
        .catch(function () {
          say('일시적인 오류로 접수에 실패했습니다. 010-8114-4638 로 전화 주시면 바로 도와드리겠습니다.', false);
        })
        .then(function () { if (submitBtn) submitBtn.disabled = false; });
    });
  }

  /* ------------------------------------------------------------------
     9) 앵커 스크롤 시 고정 헤더 높이만큼 보정
     ------------------------------------------------------------------ */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var offset = header.offsetHeight;
      var y = el.getBoundingClientRect().top + window.scrollY - (id === '#top' ? 0 : offset - 1);
      window.scrollTo({ top: y, behavior: 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ------------------------------------------------------------------
     10) 상단 스크롤 진행 바
     ------------------------------------------------------------------ */
  var bar = document.createElement('div');
  bar.className = 'scrollbar';
  document.body.appendChild(bar);
  function drawBar() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }
  window.addEventListener('scroll', drawBar, { passive: true });
  window.addEventListener('resize', drawBar, { passive: true });
  drawBar();

  /* ------------------------------------------------------------------
     11) 갤러리 라이트박스 — 사진 클릭 시 확대 · ← → 이동 · Esc 닫기
     ------------------------------------------------------------------ */
  (function lightbox() {
    var grid = $('#galleryGrid');
    if (!grid) return;

    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.hidden = true;
    lb.innerHTML =
      '<div class="lb__stage">' +
        '<img class="lb__img" alt="">' +
        '<span class="lb__cap"></span>' +
        '<button class="lb__btn lb__prev" aria-label="이전 사진">&#8249;</button>' +
        '<button class="lb__btn lb__next" aria-label="다음 사진">&#8250;</button>' +
        '<button class="lb__btn lb__close" aria-label="닫기">&times;</button>' +
      '</div>';
    document.body.appendChild(lb);

    var lbImg   = lb.querySelector('.lb__img');
    var lbCap   = lb.querySelector('.lb__cap');
    var items = [], idx = 0;

    function collect() {
      items = $$('#galleryGrid .gcell:not(.is-empty)').map(function (fig) {
        var im = fig.querySelector('img');
        var cap = fig.querySelector('.gcell__cap');
        return { src: im ? (im.currentSrc || im.src) : '', alt: im ? im.alt : '',
                 cap: cap ? cap.textContent : '' };
      }).filter(function (o) { return o.src; });
    }
    function show(i) {
      if (!items.length) return;
      idx = (i + items.length) % items.length;
      var it = items[idx];
      lbImg.src = it.src; lbImg.alt = it.alt;
      lbCap.textContent = it.cap || '';
    }
    function open(i) {
      collect();
      if (!items.length) return;
      lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add('is-open'); });
      document.body.classList.add('is-locked');
      show(i);
    }
    function close() {
      lb.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      setTimeout(function () { lb.hidden = true; lbImg.removeAttribute('src'); }, 320);
    }

    grid.addEventListener('click', function (e) {
      var fig = e.target.closest('.gcell');
      if (!fig || fig.classList.contains('is-empty')) return;
      collect();
      var all = $$('#galleryGrid .gcell:not(.is-empty)');
      open(all.indexOf(fig));
    });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.closest('.lb__close')) return close();
      if (e.target.closest('.lb__prev')) return show(idx - 1);
      if (e.target.closest('.lb__next')) return show(idx + 1);
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });

    // 터치 스와이프
    var tx = 0;
    lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });
  })();
})();
