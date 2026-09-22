/* =====================================================================
   북전주 광신프로그레스 — 방문예약/문의 접수 → 구글 시트 저장 (+ 선택 알림)
   ---------------------------------------------------------------------
   이 코드를 Google Apps Script(script.google.com)에 붙여넣고
   "웹 앱"으로 배포하면, 홈페이지 폼이 제출될 때마다
     1) 구글 시트에 성함·연락처·희망 방문일시·개인정보 동의 여부 등이
        한 줄씩 저장되고
     2) (설정 시) 강수진 과장 휴대폰으로 문자(SMS)가 발송되고
     3) (설정 시) 담당자 이메일로도 사본이 갑니다.

   설정 방법은 같은 폴더의  폼연동-안내.md  를 순서대로 따라 하세요.

   ⚠️ 보안 — API 키/시트ID 를 이 파일에 절대 직접 적지 마세요.
   이 저장소는 GitHub 공개 저장소이므로, 여기에 값을 하드코딩하면 그대로
   인터넷에 노출됩니다. 대신 Apps Script 편집기의
   "프로젝트 설정(⚙) → 스크립트 속성(Script Properties)" 에 아래 키들을
   등록하세요 — 이 값들은 Google 서버에만 저장되고 깃허브 저장소나
   브라우저(방문자)에는 절대 전달되지 않습니다.

     SHEET_ID       구글 시트 ID (필수 — 이게 없으면 저장이 안 됩니다)
     SHEET_NAME     시트 탭 이름 (기본값 '접수' 그대로 두면 생략 가능)
     ALERT_TO       문자 받을 번호 (기본값 그대로면 생략 가능)
     ALERT_EMAIL    이메일 사본 받을 주소 (안 쓰면 생략)
     ALIGO_KEY      알리고 API Key (문자 발송 안 쓰면 생략)
     ALIGO_USER_ID  알리고 로그인 아이디 (문자 발송 안 쓰면 생략)
     ALIGO_SENDER   알리고 사전등록 발신번호 (안 쓰면 생략)

   브라우저(홈페이지)에 전달되는 건 오직 "웹앱 실행 주소"뿐이며,
   그 주소는 비밀값이 아닙니다(폼 제출을 받는 창구일 뿐 — 이 주소만으로는
   시트 내용을 읽거나 API 키를 알아낼 수 없습니다).
   ===================================================================== */

/* ── 1. 기본 설정 — 실제 값은 스크립트 속성에서 읽어옵니다 ─────────── */
function _prop(key, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return (v === null || v === '') ? fallback : v;
}

function _config() {
  return {
    ALERT_TO:    _prop('ALERT_TO', '01081144638'),
    ALERT_EMAIL: _prop('ALERT_EMAIL', ''),
    SHEET_ID:    _prop('SHEET_ID', ''),
    SHEET_NAME:  _prop('SHEET_NAME', '접수'),
    ALIGO: {
      key:     _prop('ALIGO_KEY', ''),
      user_id: _prop('ALIGO_USER_ID', ''),
      sender:  _prop('ALIGO_SENDER', '01081144638')
    }
  };
}

/* ── 2. 폼 수신 ────────────────────────────────────────────────── */
function doPost(e) {
  var CONFIG = _config();
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    // 스팸봇 차단 (숨은 칸에 값이 있으면 무시)
    if (p._hp) return _json({ ok: true, skipped: 'bot' });

    var rec = {
      time:    p.submitted_at || _now(),
      purpose: p.purpose  || '',
      name:    p.name     || '',
      phone:   p.phone    || '',
      visit:   p.visit_at || '',
      unit:    p.unit_type|| '',
      region:  p.region   || '',
      memo:    p.memo     || '',
      agree:   p.agree === '동의' ? '동의' : '미동의',   // 개인정보 수집·이용 동의 여부
      mkt:     p.agree_marketing === '동의' ? '동의' : '미동의',
      source:  p.source   || '',
      page:    p.page     || ''
    };

    if (!rec.name || !rec.phone) return _json({ ok: false, error: '필수값 누락(성함/연락처)' });
    if (rec.agree !== '동의')     return _json({ ok: false, error: '개인정보 수집·이용 미동의' });

    _appendRow(CONFIG, rec);
    var smsResult = _sendSms(CONFIG, rec);
    _sendMail(CONFIG, rec);

    return _json({ ok: true, sms: smsResult });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// 브라우저로 웹앱 주소를 직접 열었을 때(GET) — 동작 확인용
function doGet() {
  var CONFIG = _config();
  return _json({
    ok: true,
    msg: '북전주 광신프로그레스 접수 엔드포인트 정상 동작 중',
    sheet_configured: !!CONFIG.SHEET_ID,
    sms_configured: !!CONFIG.ALIGO.key
  });
}

/* ── 3. 구글 시트 기록 ─────────────────────────────────────────── */
function _appendRow(CONFIG, r) {
  if (!CONFIG.SHEET_ID) return; // 스크립트 속성에 SHEET_ID 를 등록하기 전에는 저장을 건너뜀
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sh = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['접수시각', '문의유형', '성함', '연락처', '희망방문일시',
                  '관심주택형', '거주지역', '문의내용', '개인정보동의', '마케팅수신', '출처', '페이지']);
  }
  sh.appendRow([r.time, r.purpose, r.name, r.phone, r.visit,
                r.unit, r.region, r.memo, r.agree, r.mkt, r.source, r.page]);
}

/* ── 4. 문자(SMS) 발송 — 알리고 (스크립트 속성에 키를 등록해야 동작) ── */
function _sendSms(CONFIG, r) {
  var a = CONFIG.ALIGO;
  if (!a || !a.key) return 'skip(ALIGO_KEY 미등록)';

  var msg =
    '[북전주 광신프로그레스] ' + (r.purpose || '문의') + ' 접수\n' +
    '· 성함: ' + r.name + '\n' +
    '· 연락처: ' + r.phone +
    (r.visit ? '\n· 희망방문: ' + r.visit : '') +
    (r.unit  ? '\n· 관심형: ' + r.unit : '') +
    (r.memo  ? '\n· 내용: ' + r.memo.substring(0, 60) : '');

  var payload = {
    key: a.key, user_id: a.user_id,
    sender: a.sender, receiver: CONFIG.ALERT_TO,
    msg: msg, msg_type: (msg.length > 90 ? 'LMS' : 'SMS'),
    title: '북전주 광신프로그레스 접수'
  };

  var res = UrlFetchApp.fetch('https://apis.aligo.in/send/', {
    method: 'post', payload: payload, muteHttpExceptions: true
  });
  return res.getContentText();
}

/* ── 5. 이메일 사본(선택) ─────────────────────────────────────── */
function _sendMail(CONFIG, r) {
  if (!CONFIG.ALERT_EMAIL) return;
  var body =
    '북전주 광신프로그레스 홈페이지 접수\n\n' +
    '접수시각   : ' + r.time + '\n' +
    '문의유형   : ' + r.purpose + '\n' +
    '성함       : ' + r.name + '\n' +
    '연락처     : ' + r.phone + '\n' +
    '희망방문   : ' + r.visit + '\n' +
    '관심형     : ' + r.unit + '\n' +
    '거주지역   : ' + r.region + '\n' +
    '문의내용   : ' + r.memo + '\n' +
    '개인정보동의: ' + r.agree + '\n' +
    '마케팅     : ' + r.mkt + '\n' +
    '페이지     : ' + r.page + '\n';
  MailApp.sendEmail({
    to: CONFIG.ALERT_EMAIL,
    subject: '[북전주 광신프로그레스] ' + r.purpose + ' - ' + r.name + ' ' + r.phone,
    body: body
  });
}

/* ── 유틸 ─────────────────────────────────────────────────────── */
function _json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
function _now() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
}

/* ── 테스트 (스크립트 편집기에서 이 함수를 실행해 시트 저장/문자 발송 확인) ── */
function _test() {
  var CONFIG = _config();
  var rec = {
    time: _now(), purpose: '방문예약', name: '테스트', phone: '010-0000-0000',
    visit: '9/13(토) 오후 2시', unit: '84A', region: '', memo: '연동 테스트입니다',
    agree: '동의', mkt: '미동의', source: '테스트', page: ''
  };
  _appendRow(CONFIG, rec);
  Logger.log(_sendSms(CONFIG, rec));
}

/* ── 최초 1회 설정용 헬퍼: 스크립트 속성을 코드로 등록하고 싶을 때 ──
   (편집기에서 이 함수의 값들을 채운 뒤 한 번만 실행하고, 실행 후에는
    아래 값들을 다시 지우거나 이 함수 자체를 삭제하세요. 값을 채운 채로
    깃허브에 커밋하지 마세요.) */
function _setupProperties_() {
  PropertiesService.getScriptProperties().setProperties({
    SHEET_ID: '',        // 구글 시트 ID
    // ALERT_EMAIL: '',
    // ALIGO_KEY: '', ALIGO_USER_ID: '', ALIGO_SENDER: '01081144638',
  });
}
