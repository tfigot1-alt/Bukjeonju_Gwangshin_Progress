/* ==========================================================================
   북전주 광신프로그레스 — anim.js
   참고 사이트(elyse-residence-dev.webflow.io)의 GSAP 애니메이션을 재현하고,
   그 사이트가 쓰는 "모든 텍스트 연출 기법"을 data-anim 속성 하나로 쓸 수 있게
   시스템화한 파일입니다.

   ── 참고 사이트에서 쓰인 기법 → 이 파일의 data-anim 값 ──────────────────
   SplitText(chars,mask) yPercent      → data-anim="chars"      글자 마스크 상승
   SplitText(chars) rotationX          → data-anim="chars-3d"   글자 3D 플립
   SplitText(words,mask)               → data-anim="words"      단어 마스크 상승
   SplitText(words) y+rotationX        → data-anim="words-3d"   단어 3D + 페이드
   SplitText(lines,mask) y:100%→0%     → data-anim="lines"      줄 마스크 상승
   위 + 스크롤 스크럽 연동              → data-anim-scrub 속성 추가
   simpleFadeIn (opacity)             → data-anim="fade"
   staggerFadeIn (opacity+stagger)    → data-anim="stagger"   (자식 요소 순차)
   clipPath inset(100%…)              → data-anim="wipe"      아래→위 와이프
   mask-gradient 슬라이스 리빌         → data-anim="sweep"     빛 쓸기 리빌
   textContent snap 카운트업           → data-count="숫자"
   img-paralax (yPercent+scale)       → data-anim-scrub 또는 mediaWipe
   히어로 진입 타임라인               → heroIntro()

   ── 세부 조정용 속성 ────────────────────────────────────────────────
   data-anim-delay="0.2"     시작 지연(초)
   data-anim-stagger="0.04"  글자/줄 간격(초)
   data-anim-duration="1.2"  지속(초)
   data-anim-start="top 80%" ScrollTrigger start
   data-anim-scrub           스크롤 진행에 연동(1회 재생 대신)
   data-anim-once="false"    화면 재진입 시 다시 재생

   GSAP 로드 실패 · JS 비활성 · '동작 줄이기' 설정이면
   IntersectionObserver 폴백 또는 전체 노출로 안전하게 내려갑니다.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = typeof window.__motionReduced === 'boolean' ? window.__motionReduced : window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* 0~1 구간 고정 헬퍼 (히어로 스크럽 등에서 사용) */
  function clamp(v, lo, hi) { lo = lo == null ? 0 : lo; hi = hi == null ? 1 : hi;
    return v < lo ? lo : (v > hi ? hi : v); }

  /* ==================================================================
     1) 텍스트 분해 유틸 (GSAP SplitText 대체)
     ================================================================== */

  /** 텍스트를 글자/단어 단위로 쪼갭니다.
   *  masked=true  → 각 조각을 overflow:hidden 마스크로 감쌈 (상승 리빌용)
   *  masked=false → 조각만 span 으로 감쌈 (3D 플립처럼 넘쳐야 하는 연출용)
   *  <strong>,<em> 등 중첩 태그와 <br> 은 보존. 반환값은 안쪽 span 배열. */
  function splitInto(rootEl, unit, masked) {
    if (!rootEl || rootEl.dataset.split) return collectInners(rootEl);
    if (!rootEl.__origHTML) rootEl.__origHTML = rootEl.innerHTML;
    var inners = [];
    var maskCls = unit === 'char' ? 'ch' : 'wd';
    var innerCls = unit === 'char' ? 'ch__i' : 'wd__i';

    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var text = n.textContent;
          if (!text.replace(/\s+/g, '')) return;
          var frag = document.createDocumentFragment();
          var pieces = unit === 'char'
            ? Array.prototype.slice.call(text)
            : text.split(/(\s+)/);
          pieces.forEach(function (piece) {
            if (piece === '') return;
            if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(piece)); return; }
            var inner = document.createElement('span');
            inner.className = innerCls;
            inner.textContent = piece;
            if (masked) {
              var m = document.createElement('span');
              m.className = maskCls;
              m.appendChild(inner);
              frag.appendChild(m);
            } else {
              inner.classList.add('is-plain');
              frag.appendChild(inner);
            }
            inners.push(inner);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    })(rootEl);

    rootEl.dataset.split = unit;
    return inners;
  }

  function collectInners(rootEl) {
    return $$('.ch__i, .wd__i, .sl__i', rootEl);
  }

  /** <br> 기준으로 줄을 나눠 각 줄을 마스크로 감쌉니다. <br> 가 없으면 통째로 한 줄. */
  function splitLines(rootEl) {
    if (!rootEl || rootEl.dataset.split) return $$('.sl__i', rootEl);
    if (!rootEl.__origHTML) rootEl.__origHTML = rootEl.innerHTML;
    var groups = [[]], inners = [];
    Array.prototype.slice.call(rootEl.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'BR') groups.push([]);
      else groups[groups.length - 1].push(n);
    });
    rootEl.textContent = '';
    groups.forEach(function (nodes) {
      if (!nodes.length) return;
      var mask = document.createElement('span'); mask.className = 'sl';
      var inner = document.createElement('span'); inner.className = 'sl__i';
      nodes.forEach(function (n) { inner.appendChild(n); });
      mask.appendChild(inner); rootEl.appendChild(mask); inners.push(inner);
    });
    rootEl.dataset.split = 'lines';
    return inners;
  }

  /* ==================================================================
     2) 기법 사전 — data-anim 값마다 (대상, from, to, 기본 간격/지속)
     ================================================================== */
  function buildFX(el, type) {
    var d = { targets: [el], from: {}, to: {}, stagger: 0, dur: 0.9, ease: 'power3.out', sweep: false };
    switch (type) {
      case 'chars':
        d.targets = splitInto(el, 'char', true);
        d.from = { yPercent: 120 }; d.to = { yPercent: 0 };
        d.stagger = 0.028; d.dur = 0.9; break;

      case 'chars-3d':
        el.classList.add('anim-3d');
        d.targets = splitInto(el, 'char', false);
        d.from = { opacity: 0, rotationX: -90, transformOrigin: '50% 100% -10px', z: -40 };
        d.to = { opacity: 1, rotationX: 0, z: 0 };
        d.stagger = 0.022; d.dur = 0.9; break;

      case 'words':
        d.targets = splitInto(el, 'word', true);
        d.from = { yPercent: 115 }; d.to = { yPercent: 0 };
        d.stagger = 0.045; d.dur = 0.8; break;

      case 'words-3d':
        el.classList.add('anim-3d');
        d.targets = splitInto(el, 'word', false);
        d.from = { opacity: 0, y: 22, rotationX: -45, transformOrigin: '50% 100%' };
        d.to = { opacity: 1, y: 0, rotationX: 0 };
        d.stagger = 0.03; d.dur = 0.7; break;

      case 'lines':
        d.targets = splitLines(el);
        d.from = { yPercent: 118 }; d.to = { yPercent: 0 };
        d.stagger = 0.09; d.dur = 1.0; break;

      case 'fade':
        d.from = { opacity: 0 }; d.to = { opacity: 1 }; d.dur = 1.0; break;

      case 'fade-up':
        d.from = { opacity: 0, y: 26 }; d.to = { opacity: 1, y: 0 }; d.dur = 0.9; break;

      case 'wipe':
        d.from = { clipPath: 'inset(0% 0% 100% 0%)' };
        d.to = { clipPath: 'inset(0% 0% 0% 0%)' };
        d.dur = 1.1; d.ease = 'power3.inOut'; break;

      case 'sweep':
        // mask-image 로 빛이 쓸고 지나가듯 리빌 (참고사이트의 mask-gradient 슬라이스 기법)
        d.sweep = true; d.dur = 1.2; d.ease = 'power2.inOut'; break;

      case 'stagger':
        d.targets = $$('[data-anim-child]', el);
        if (!d.targets.length) d.targets = Array.prototype.slice.call(el.children);
        d.from = { opacity: 0, y: 24 }; d.to = { opacity: 1, y: 0 };
        d.stagger = 0.12; d.dur = 0.8; d.ease = 'power2.out'; break;

      default:
        d.from = { opacity: 0, y: 20 }; d.to = { opacity: 1, y: 0 };
    }
    return d;
  }

  /* ==================================================================
     3) 실행기 — [data-anim] 요소를 훑어 ScrollTrigger 연결
     ================================================================== */
  function num(el, attr, dflt) {
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? dflt : v;
  }

  /* 진입 감지는 IntersectionObserver 로 통일 — 헤드리스/스크롤 위치와 무관하게
     확실히 발화한다. scrub(스크롤 진행 연동)만 ScrollTrigger 를 씀. */
  var animIO = null;
  function getAnimIO() {
    if (animIO || !('IntersectionObserver' in window)) return animIO;
    animIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target;
        if (en.isIntersecting) {
          if (el.__animPlay) el.__animPlay();
          if (el.__animOnce !== false) animIO.unobserve(el);
        } else if (el.__animOnce === false && el.__animReset) {
          el.__animReset();
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    return animIO;
  }

  function runAnim(el) {
    var type = el.getAttribute('data-anim');
    if (!type || el.__animRan) return;
    el.__animRan = true;

    var d = buildFX(el, type);
    var delay   = num(el, 'data-anim-delay', 0);
    var stagger = num(el, 'data-anim-stagger', d.stagger);
    var dur     = num(el, 'data-anim-duration', d.dur);
    var start   = el.getAttribute('data-anim-start') || 'top 86%';
    var scrub   = el.hasAttribute('data-anim-scrub');
    var once    = el.getAttribute('data-anim-once') !== 'false';
    el.__animOnce = once;

    /* ---- mask-image 빛 쓸기 리빌 ---- */
    if (d.sweep) {
      var setP = function (p) {
        var a = (p * 150 - 25);
        el.style.webkitMaskImage = el.style.maskImage =
          'linear-gradient(100deg, #000 ' + (a - 20) + '%, #000 ' + a + '%, rgba(0,0,0,0) ' + (a + 16) + '%)';
      };
      setP(0);
      if (scrub) {
        var px = { p: 0 };
        gsap.to(px, {
          p: 1, ease: 'none',
          onUpdate: function () { setP(px.p); },
          scrollTrigger: { trigger: el, start: start, end: el.getAttribute('data-anim-end') || 'top 45%', scrub: true }
        });
      } else {
        el.__animPlay = function () {
          var px2 = { p: 0 };
          gsap.to(px2, {
            p: 1, duration: dur, ease: d.ease, delay: delay,
            onUpdate: function () { setP(px2.p); },
            onComplete: function () { el.style.webkitMaskImage = el.style.maskImage = 'none'; }
          });
        };
        observeOrPlay(el);
      }
      return;
    }

    if (!d.targets || !d.targets.length) { el.style.opacity = 1; return; }

    if (scrub) {
      gsap.fromTo(d.targets, d.from, Object.assign({}, d.to, {
        ease: 'none', stagger: stagger,
        scrollTrigger: {
          trigger: el, start: start,
          end: el.getAttribute('data-anim-end') || 'top 42%',
          scrub: true
        }
      }));
      return;
    }

    /* 표준 패턴: gsap.from + ScrollTrigger(once) — 대부분 이걸로 재생됨.
       + 별도 __animPlay 로 캐치업(스크롤 폴링/강제재생) 안전망도 건다. */
    var st = gsap.from(d.targets, Object.assign({}, d.from, {
      duration: dur, ease: d.ease, stagger: stagger, delay: delay,
      paused: true
    }));
    el.__animPlay = function () { if (st && !st.__done) { st.__done = 1; st.play(0); } };
    el.__animReset = function () { if (st) { st.__done = 0; st.pause(0); } };

    ScrollTrigger.create({
      trigger: el, start: start, once: true,
      onEnter: function () { el.__animPlay(); }
    });
    observeOrPlay(el);
  }

  var animPending = [];
  function observeOrPlay(el) {
    var io = getAnimIO();
    if (!io) { if (el.__animPlay) el.__animPlay(); return; }
    animPending.push(el);
    io.observe(el);
  }

  /* IO 가 어떤 이유로든 늦거나 안 뜨는 경우 대비 — 화면 위/안에 이미 들어온
     요소는 직접 재생. 스크롤/리사이즈/로드 때마다 훑는다. */
  function catchUpAnims() {
    if (!animPending.length) return;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = animPending.length - 1; i >= 0; i--) {
      var el = animPending[i];
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) {
        if (el.__animPlay) el.__animPlay();
        if (animIO) animIO.unobserve(el);
        animPending.splice(i, 1);
      }
    }
  }

  function initAnims() {
    $$('[data-anim]').forEach(function (el) {
      try { runAnim(el); }
      catch (e) { if (window.console) console.error('[anim] runAnim 실패:', el, e); el.style.opacity = 1; }
    });
  }

  /* 모든 진입 감지의 안전망.
     ① 스크롤/리사이즈/로드 이벤트  ② 처음 ~9초 동안 rAF 로 계속 훑기(이벤트 유실 대비)
     ③ 그래도 남으면 강제 재생(화면 위/안 요소) — 애니메이션보다 가독성 우선 */
  function armCatchUp() {
    var run = function () { catchUpAnims(); catchUpReveals(); };
    run();
    window.addEventListener('scroll', run, { passive: true });
    window.addEventListener('resize', run, { passive: true });
    window.addEventListener('load', run);
    window.addEventListener('pageshow', run);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);

    // rAF 폴링: 이벤트가 안 오거나 늦어도 진입을 잡아냄
    var t0 = Date.now();
    (function loop() {
      run();
      if (Date.now() - t0 < 9000 && (animPending.length || revealPending.length)) {
        requestAnimationFrame(loop);
      }
    })();

    // 최후 안전망: 8초 뒤에도 화면 위/안에서 안 뜬 게 있으면 강제 재생
    setTimeout(function () {
      var vh = window.innerHeight || 800;
      [[animPending, '__animPlay'], [revealPending, '__revealCb']].forEach(function (pair) {
        var list = pair[0], key = pair[1];
        for (var i = list.length - 1; i >= 0; i--) {
          var el = list[i], r = el.getBoundingClientRect();
          if (r.top < vh * 1.2) { if (el[key]) el[key](); list.splice(i, 1); }
        }
      });
    }, 8000);
  }

  function safe(fn, name) {
    try { fn(); }
    catch (e) { if (window.console) console.error('[anim] ' + name + ' 실패:', e); }
  }

  /* ==================================================================
     4) 폴백 (GSAP 없음 / reduced-motion)
     ================================================================== */
  function revealAll() {
    root.classList.remove('anim-ready');
    root.classList.add('anim-fallback', 'anim-static');
    $$('[data-reveal], .eyebrow, [data-anim], section.section').forEach(function (el) { el.classList.add('is-in'); el.classList.add('sect-in'); });
    var shero = document.querySelector('.shero'); if (shero) shero.classList.add('shero--static');
  }

  function fallbackObserver() {
    root.classList.remove('anim-ready');
    root.classList.add('anim-fallback');
    var shero = document.querySelector('.shero'); if (shero) shero.classList.add('shero--static');
    var items = $$('[data-reveal], .eyebrow, [data-anim], section.section');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); el.classList.add('sect-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          if (en.target.matches('section.section')) en.target.classList.add('sect-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ==================================================================
     5) 부팅
     ================================================================== */
  function boot() {
    var motionSwitch = document.querySelector('.shero__motion');
    if (motionSwitch) {
      var motionUrl = new URL(window.location.href);
      motionUrl.searchParams.set('motion', reduced ? 'on' : 'off');
      motionUrl.hash = 'top';
      motionSwitch.href = motionUrl.href;
      motionSwitch.textContent = reduced ? '모션 켜기' : '모션 끄기';
      motionSwitch.hidden = false;
    }
    window.__animBooted = true;
    if (reduced) { revealAll(); return; }
    if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') {
      fallbackObserver(); return;
    }

    gsap.registerPlugin(ScrollTrigger);
    gsap.config({ nullTargetWarn: false });
    window.__gsapReady = true;

    // 순서 중요: 먼저 각 연출의 from-state 를 GSAP inline 으로 심고(splitInto + gsap.from),
    // 그 다음 CSS 의 anim-ready 은닉 규칙을 해제한다. 깜빡임 없이 이어짐.
    safe(scrollHero, 'scrollHero');
    safe(autoTagHeadings, 'autoTagHeadings');
    safe(initAnims, 'initAnims');
    root.classList.remove('anim-ready');
    root.classList.add('gsap-on');

    safe(sectionFlourish, 'sectionFlourish');
    safe(fadeIn, 'fadeIn');
    safe(eyebrowLines, 'eyebrowLines');
    safe(mediaWipe, 'mediaWipe');
    safe(countUp, 'countUp');
    safe(parallax, 'parallax');
    safe(armCatchUp, 'armCatchUp');
    try { ScrollTrigger.refresh(); } catch (e) {}

    var refresh = function () { try { ScrollTrigger.refresh(); } catch (e) {} catchUpAnims(); catchUpReveals(); };
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    setTimeout(refresh, 800);
    setTimeout(refresh, 2000);
    $$('img').forEach(function (img) {
      if (!img.complete) img.addEventListener('load', refresh, { once: true });
    });
  }

  /* 섹션마다 제목 연출 기법을 돌려가며 배정 → 스크롤할 때 레이아웃마다 다른 느낌.
     전부 마스크 상승 계열(translateY)만 사용 — 진입 실패해도 캐치업으로 확실히 뜸.
     scrub(스크롤 진행 연동)은 제목엔 안 씀(위치 계산 어긋나면 멈추는 문제). */
  var HEAD_CYCLE = ['lines', 'chars', 'words', 'lines', 'words', 'chars'];
  function autoTagHeadings() {
    var n = 0;
    $$('main > section').forEach(function (sec) {
      var h2 = sec.querySelector('h2.display');
      if (h2 && !h2.hasAttribute('data-anim')) {
        h2.setAttribute('data-anim', HEAD_CYCLE[n % HEAD_CYCLE.length]);
        n++;
      }
    });
    // 섹션 안쪽 보조 제목 h3, 푸터 브랜드
    $$('h2.display, h3.display, .footer__brand').forEach(function (h) {
      if (!h.hasAttribute('data-anim')) h.setAttribute('data-anim', 'lines');
    });
  }

  /* ------------------------------------------------------------------
     공용 진입 감지 — IntersectionObserver + 스크롤 캐치업.
     ScrollTrigger 타이밍(폰트/이미지 로딩 후 위치 재계산)에 의존하지 않음.
     ------------------------------------------------------------------ */
  var revealIO = null, revealPending = [];
  function onReveal(el, cb, ratio) {
    ratio = ratio || 0.86;
    el.__revealCb = cb;
    if (!('IntersectionObserver' in window)) { cb(); return; }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (!en.isIntersecting) return;
          var t = en.target; revealIO.unobserve(t);
          var idx = revealPending.indexOf(t); if (idx > -1) revealPending.splice(idx, 1);
          if (t.__revealCb) t.__revealCb();
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.02 });
    }
    revealPending.push(el);
    revealIO.observe(el);
  }
  function catchUpReveals() {
    if (!revealPending.length) return;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = revealPending.length - 1; i >= 0; i--) {
      var el = revealPending[i], r = el.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > -40) {
        if (revealIO) revealIO.unobserve(el);
        revealPending.splice(i, 1);
        if (el.__revealCb) el.__revealCb();
      }
    }
  }

  /* ==================================================================
     섹션 진입 플로리시 — 상단 룰 draw + 인덱스 번호 등장 + wrap 정착.
     ================================================================== */
  function sectionFlourish() {
    $$('main > section.section').forEach(function (sec, i) {
      onReveal(sec, function () { sec.classList.add('sect-in'); }, 0.8);
      // 대형 인덱스 번호가 스크롤에 따라 천천히 흐름 (홀/짝 반대 방향)
      var no = sec.querySelector('.sect__no');
      if (no) {
        var dir = (i % 2 === 0) ? 1 : -1;
        gsap.fromTo(no,
          { yPercent: 40 * dir },
          { yPercent: -40 * dir, ease: 'none',
            scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 1.6 } });
      }
    });
  }

  /* ==================================================================
     6) 스크롤 스크럽 히어로
        .shero__track 을 스크롤하는 동안 .shero__pin(sticky)이 고정되고,
        ScrollTrigger 의 progress(0~1)로 배경 줌·크로스페이드·제목/태그라인/
        지표를 스크럽한다. body 를 fixed 로 붙잡지 않음(스크롤 항상 자유).
     ================================================================== */
  function scrollHero() {
    var sec = document.querySelector('.shero');
    if (!sec) return;

    var imgA  = sec.querySelector('.shero__layer--a img');
    var imgB  = sec.querySelector('.shero__layer--b img');
    var layB  = sec.querySelector('.shero__layer--b');
    var title = sec.querySelector('.shero__title');
    var badge = sec.querySelector('.shero__badge');
    var tag   = sec.querySelector('.shero__tag');
    var resolve = sec.querySelector('.shero__resolve');
    var hint  = sec.querySelector('.shero__hint');
    var bar   = sec.querySelector('.shero__bar i');

    // 이미지 없으면 정적 처리 (main.js 의 .media 빈칸 로직과 함께)
    [sec.querySelector('.shero__layer--a'), layB].forEach(function (fig) {
      var im = fig && fig.querySelector('img');
      if (!im) { if (fig) fig.classList.add('is-empty'); return; }
      if (im.complete && !im.naturalWidth) fig.classList.add('is-empty');
      im.addEventListener('error', function () { fig.classList.add('is-empty'); });
    });

    if (reduced || typeof ScrollTrigger === 'undefined') {
      sec.classList.add('shero--static');
      return;
    }

    // 헤더 등장 (한 번)
    gsap.from('.header', { yPercent: -100, opacity: 0, duration: 1, ease: 'power3.out', clearProps: 'transform' });

    // 제목 글자 상승 (한 번, 진입 즉시)
    var chars = splitInto(title, 'char', true);
    if (chars.length) {
      gsap.from(chars, { yPercent: 120, duration: 1.1, ease: 'power3.out', stagger: 0.028 });
    }
    gsap.from(badge, { y: 20, duration: .9, ease: 'power3.out', delay: .1 });

    // 실제 tween의 진행률을 보간해야 스크롤을 멈춘 뒤에도 부드럽게 정착한다.
    var playhead = { progress: 0 };
    var mobile = window.matchMedia('(max-width: 820px)').matches;

    function renderHero() {
        var p = playhead.progress;

        // 배경: A 줌인 → B 로 크로스페이드
        if (imgA) imgA.style.transform = 'scale(' + (1.04 + p * (mobile ? 0.09 : 0.20)).toFixed(4) + ')';
        var bf = clamp((p - 0.30) / 0.35, 0, 1);
        if (layB) layB.style.opacity = bf.toFixed(3);
        if (imgB) imgB.style.transform = 'scale(' + (1.16 - bf * 0.10).toFixed(4) + ')';

        // 제목: 선명 → 흐려지며 위로 소멸
        var tt = 1 - clamp((p - 0.05) / 0.32, 0, 1);
        if (title) {
          title.style.opacity = tt.toFixed(3);
          title.style.transform = 'translateY(' + ((1 - tt) * -48).toFixed(1) + 'px) scale(' + (1 + (1 - tt) * .06).toFixed(3) + ')';
          title.style.filter = mobile ? 'none' : 'blur(' + ((1 - tt) * 8).toFixed(1) + 'px)';
        }
        if (badge) badge.style.opacity = tt.toFixed(3);

        // 태그라인: 후반에 blur-focus 로 등장, 끝에서 살짝 물러남
        var gin  = clamp((p - 0.52) / 0.22, 0, 1);
        var gout = 1;
        if (tag) {
          tag.style.opacity = (gin * gout).toFixed(3);
          tag.style.transform = 'translateY(calc(-50% + ' + ((1 - gin) * 22).toFixed(1) + 'px))';
          tag.style.filter = mobile ? 'none' : 'blur(' + ((1 - gin) * 8).toFixed(1) + 'px)';
        }

        // 단지 지표: 마지막 구간에서 떠오름
        var rt = clamp((p - 0.8) / 0.2, 0, 1);
        if (resolve) {
          resolve.style.opacity = rt.toFixed(3);
          resolve.style.transform = 'translateY(' + ((1 - rt) * 26).toFixed(1) + 'px)';
        }

        if (hint) {
          hint.style.opacity = (1 - clamp(p / .12, 0, 1)).toFixed(3);
          hint.style.visibility = p > .12 ? 'hidden' : 'visible';
        }
        if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    renderHero();
    gsap.to(playhead, {
      progress: 1, ease: 'none', onUpdate: renderHero,
      scrollTrigger: {
        trigger: sec, start: 'top top', end: 'bottom bottom',
        scrub: mobile ? .35 : .85, invalidateOnRefresh: true
      }
    });

    ScrollTrigger.refresh();
  }

  /* ==================================================================
     7) [data-reveal] 페이드 (컨테이너용, 기존 유지)
     ================================================================== */
  function fadeIn() {
    $$('[data-reveal]').forEach(function (el) {
      var delay = (parseInt(el.getAttribute('data-delay'), 10) || 0) * 0.09;
      gsap.set(el, { opacity: 0, y: 42, filter: 'blur(6px)' });
      onReveal(el, function () {
        gsap.to(el, {
          opacity: 1, y: 0, filter: 'blur(0px)',
          duration: 1.05, delay: delay, ease: 'power3.out', overwrite: 'auto',
          onComplete: function () { el.classList.add('is-in'); el.style.filter = ''; }
        });
      }, 0.92);
    });
  }

  function eyebrowLines() {
    $$('.eyebrow').forEach(function (el) {
      onReveal(el, function () { el.classList.add('is-in'); }, 0.92);
    });
  }

  /* ==================================================================
     8) 이미지 와이프 + 줌아웃
     ================================================================== */
  function mediaWipe() {
    $$('.media[data-wipe]').forEach(function (fig) {
      var img = fig.querySelector('img');
      var tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 88%', once: true } });
      tl.to(fig, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.inOut' }, 0);
      if (img) tl.from(img, { scale: 1.22, duration: 1.7, ease: 'power3.out', clearProps: 'transform' }, 0);
    });
  }

  /* ==================================================================
     9) 숫자 카운트업
     ================================================================== */
  function countUp() {
    $$('[data-count]').forEach(function (el) {
      var raw = el.getAttribute('data-count');
      var target = parseFloat(raw);
      if (isNaN(target)) return;
      var dec = (raw.split('.')[1] || '').length;
      var obj = { v: 0 };
      el.textContent = (0).toFixed(dec);
      gsap.to(obj, {
        v: target, duration: 1.9, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () {
          var s = obj.v.toFixed(dec).split('.');
          s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          el.textContent = s.join('.');
        },
        onComplete: function () {
          var s = target.toFixed(dec).split('.');
          s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          el.textContent = s.join('.');
        }
      });
    });
  }

  /* ==================================================================
     10) 스크롤 패럴랙스
     ================================================================== */
  function parallax() {
    var band = document.querySelector('.ctaband');
    if (band) {
      gsap.fromTo('.ctaband__bg img',
        { yPercent: -6, scale: 1.18 },
        { yPercent: 6, scale: 1.18, ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: 1 } });
    }
    // 대형 사진 띠(.photoband) 배경 패럴랙스
    $$('.photoband').forEach(function (pb) {
      var bg = pb.querySelector('.photoband__bg');
      if (!bg || bg.classList.contains('is-empty')) return;
      gsap.fromTo(bg,
        { yPercent: -6 },
        { yPercent: 6, ease: 'none', scrollTrigger: { trigger: pb, start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });
    // 범용: data-parallax="숫자" 요소를 스크롤에 살짝 밀기
    $$('[data-parallax]').forEach(function (el) {
      var amt = parseFloat(el.getAttribute('data-parallax')) || 8;
      gsap.fromTo(el, { yPercent: amt }, {
        yPercent: -amt, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    });

    // 섹션 대형 인덱스 번호 — 스크롤과 반대로 천천히 흘러 깊이감
    $$('.sect__no').forEach(function (el) {
      gsap.fromTo(el, { y: 64 }, {
        y: -64, ease: 'none',
        scrollTrigger: { trigger: el.closest('.sect') || el, start: 'top bottom', end: 'bottom top', scrub: 1.2 }
      });
    });
  }

  /* ==================================================================
     실행
     ================================================================== */
  /* defer 로 불러오는 GSAP CDN 이 느리게 붙을 수 있으니 최대 12초까지 기다림.
     (실제 브라우저에선 defer 순서 보장으로 즉시 준비됨 — 이 대기는 헤드리스/저속망 대비) */
  function whenGsapReady(cb) {
    var tries = 0;
    (function check() {
      if ((window.gsap && window.ScrollTrigger) || reduced) return cb();
      if (tries++ > 240) return cb();         // 약 12초 후 포기 → boot()에서 폴백
      setTimeout(check, 50);
    })();
  }

  function start() {
    // 글자/단어/줄 분해는 폰트 메트릭이 필요 없으므로 폰트 로딩을 기다리지 않고
    // 곧바로 부팅한다. (폰트가 늦게 와도 ScrollTrigger.refresh 로 위치만 재보정)
    var done = false;
    var go = function () {
      if (done) return; done = true;
      whenGsapReady(function () { boot(); });
    };
    go();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
