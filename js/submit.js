/* Public Wix visitor client only. Never add an admin key or client secret here. */
(function (root) {
  'use strict';
  var CLIENT_ID = '7ad912ff-fc87-40d7-bbe5-597628581140';
  var FORM_ID = 'b18384f5-9425-466f-ae4e-b68d7a9fc45f';
  var OPTIONS = {help:'70e0c6d0-9ce6-4494-9e53-2165c1d028db',biz:'50951873-d3d0-40c4-94c5-55fb584634ee'};
  var LABELS = {field:'תחום',size:'גודל העסק',site:'אתר קיים',channels:'ערוצים היום',today:'איך מגיעים לקוחות היום',wants:'מה מעניין',pain:'מה הכי מציק',when:'מתי להתחיל',notes:'הערות',hours:'מתי נוח לדבר'};
  var session = null;
  function clean(v,n) { return typeof v === 'string' ? v.replace(/\s+/g,' ').trim().slice(0,n) : ''; }
  function phoneNumber(v) {
    var p = clean(v,30).replace(/[\s().-]/g,'');
    if (p.indexOf('00') === 0) p = '+' + p.slice(2);
    if (/^0\d{8,9}$/.test(p)) p = '+972' + p.slice(1);
    if (!/^\+[1-9]\d{7,14}$/.test(p)) throw new Error('bad_phone');
    return p;
  }
  function payload(data) {
    var journey = data.journey === 'biz' ? 'biz' : 'help';
    var name = clean(data.name,80), phone = phoneNumber(data.phone), email = clean(data.email,120);
    var message = clean(data.message,2000), lines = [];
    if (!name || (journey === 'help' && !message)) throw new Error('missing_fields');
    if (journey === 'biz' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('bad_email');
    if (journey === 'biz') {
      lines.push('עסק: ' + (clean(data.business,160) || '-'), 'דוא"ל: ' + email);
      if (data.kind === 'questionnaire' && data.answers && typeof data.answers === 'object') {
        lines.push('', '— שאלון —');
        Object.keys(LABELS).forEach(function(k) {
          var v = data.answers[k];
          var txt = Array.isArray(v) ? v.slice(0,30).map(function(x){return clean(x,80);}).filter(Boolean).join(', ') : clean(v,600);
          if (txt) lines.push(LABELS[k] + ': ' + txt);
        });
      }
      if (message) lines.push('',message);
    } else {
      lines.push(message);
      if (email) lines.push('', 'דוא"ל: ' + email);
    }
    var names = name.split(' ');
    return {submission:{formId:FORM_ID,submissions:{
      first_name_819b:names.shift(), last_name_611a:names.join(' ') || '-', phone_number:phone,
      which_service_are_you_interested_in:OPTIONS[journey],
      add_a_message_or_tell_us_more_about_what_you_need:lines.join('\n')
    }}};
  }
  async function request(url,body,token) {
    var controller = new AbortController(), timer = setTimeout(function(){controller.abort();},20000);
    try {
      var headers = {'content-type':'application/json'};
      if (token) headers.Authorization = token;
      return await fetch(url,{method:'POST',headers:headers,body:JSON.stringify(body),signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    } finally { clearTimeout(timer); }
  }
  async function visitor() {
    if (!session) {
      session = (async function() {
        var r = await request('https://www.wixapis.com/oauth2/token',{clientId:CLIENT_ID,grantType:'anonymous'});
        if (!r.ok) throw new Error('visitor_auth_failed');
        var j = await r.json();
        if (!j.access_token) throw new Error('visitor_auth_failed');
        return {token:j.access_token,until:Date.now() + Math.max(0,(Number(j.expires_in)||14400)-60)*1000};
      })();
    }
    try {
      var s = await session;
      if (Date.now() >= s.until) { session=null; return visitor(); }
      return s.token;
    } catch(e) { session=null; throw e; }
  }
  root.ArticomSubmit = async function(data) {
    if (clean(data.website,50)) return {ok:true};
    var body = payload(data), token = await visitor();
    var r = await request('https://www.wixapis.com/form-submission-service/v4/submissions',body,token);
    if (r.status === 401) {
      session=null;
      r = await request('https://www.wixapis.com/form-submission-service/v4/submissions',body,await visitor());
    }
    if (!r.ok) throw new Error('wix_rejected');
    var j = await r.json();
    if (!j.submission || !j.submission.id) throw new Error('submission_not_confirmed');
    return {ok:true,id:j.submission.id};
  };
})(window);
