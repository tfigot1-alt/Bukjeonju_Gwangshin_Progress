/* =====================================================================
   북전주 광신프로그레스 — 방문예약/문의 접수 → 문자(SMS) 알림
   ---------------------------------------------------------------------
   이 코드를 Google Apps Script(script.google.com)에 붙여넣고
   "웹 앱"으로 배포하면, 홈페이지 폼이 제출될 때마다
     1) 구글 시트에 한 줄씩 기록되고
     2) 강수진 과장(010-8114-4638) 휴대폰으로 문자가 발송되고
     3) (설정 시) 담당자 이메일로도 사본이 갑니다.

   설정 방법은 같은 폴더의  폼연동-안내.md  를 순서대로 따라 하세요.
   ===================================================================== */

/* ── 1. 기본 설정 ───────────────────────────────────────────────── */
var CONFIG = {
  // 문자를 받을 번호(담당 상담사). 여러 명이면 콤마로: '01011112222,01033334444'
  ALERT_TO: '01081144638',

  // 이메일 사본을 받을 주소(선택). 안 쓰려면 '' 로 두세요.
  ALERT_EMAIL: '',

  // 접수 내용을 저장할 구글 시트 ID (스프레드시트 URL 의 /d/ 와 /edit 사이 문자열)
  SHEET_ID: '여기에_구글시트_ID_붙여넣기',
  SHEET_NAME: '접수',

  // ── 알리고(aligo) 문자 API — https://smartsms.aligo.in 가입 후 발급 ──
  //    발신번호는 알리고에서 '사전 등록'된 번호만 사용할 수 있습니다.
  ALIGO: {
    key:    '여기에_알리고_API_KEY',
    user_id:'여기에_알리고_아이디',
    sender: '01081144638'            // 사전 등록한 발신번호 (하이픈 없이)
  }
};

/* ── 2. 폼 수신 ────────────────────────────────────────────────── */
function doPost(e) {
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
      mkt:     p.agree_marketing ? '동의' : '미동의',
      source:  p.source   || '',
      page:    p.page     || ''
    };

    if (!rec.name || !rec.phone) return _json({ ok: false, error: '필수값 누락' });

    _appendRow(rec);
    var smsResult = _sendSms(rec);
    _sendMail(rec);

    return _json({ ok: true, sms: smsResult });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// 브라우저로 웹앱 주소를 직접 열었을 때(GET) — 동작 확인용
function doGet() {
  return _json({ ok: true, msg: '북전주 광신프로그레스 접수 엔드포인트 정상 동작 중' });
}

/* ── 3. 구글 시트 기록 ─────────────────────────────────────────── */
function _appendRow(r) {
  if (!CONFIG.SHEET_ID || CONFIG.SHEET_ID.indexOf('여기에') === 0) return;
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sh = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['접수시각', '문의유형', '성함', '연락처', '희망방문일시',
                  '관심주택형', '거주지역', '문의내용', '마케팅수신', '출처', '페이지']);
  }
  sh.appendRow([r.time, r.purpose, r.name, r.phone, r.visit,
                r.unit, r.region, r.memo, r.mkt, r.source, r.page]);
}

/* ── 4. 문자(SMS) 발송 — 알리고 ───────────────────────────────── */
function _sendSms(r) {
  var a = CONFIG.ALIGO;
  if (!a || !a.key || a.key.indexOf('여기에') === 0) return 'skip(키 미설정)';

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
function _sendMail(r) {
  if (!CONFIG.ALERT_EMAIL) return;
  var body =
    '북전주 광신프로그레스 홈페이지 접수\n\n' +
    '접수시각 : ' + r.time + '\n' +
    '문의유형 : ' + r.purpose + '\n' +
    '성함     : ' + r.name + '\n' +
    '연락처   : ' + r.phone + '\n' +
    '희망방문 : ' + r.visit + '\n' +
    '관심형   : ' + r.unit + '\n' +
    '거주지역 : ' + r.region + '\n' +
    '문의내용 : ' + r.memo + '\n' +
    '마케팅   : ' + r.mkt + '\n' +
    '페이지   : ' + r.page + '\n';
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

/* ── 테스트 (스크립트 편집기에서 이 함수를 실행해 문자 발송 확인) ── */
function _test() {
  _sendSms({ purpose: '방문예약', name: '테스트', phone: '010-0000-0000',
             visit: '9/13(토) 오후 2시', unit: '84A', memo: '연동 테스트입니다' });
}
