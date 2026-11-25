/* Landing pages: lead form, one-tap message picker, mobile bar. Needs submit.js. */
(function(){
  'use strict';
  var form=document.getElementById('leadForm'), msg=document.getElementById('l-msg');
  var EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Which page, and which campaign if the link carried UTM tags. Goes into the enquiry text.
  function source(){
    var q=new URLSearchParams(location.search), utm=['utm_source','utm_medium','utm_campaign'].map(function(k){return (q.get(k)||'').slice(0,60)}).filter(Boolean);
    return form.getAttribute('data-source')+(utm.length?' ('+utm.join(' / ')+')':'');
  }

  form.addEventListener('submit',function(e){
    e.preventDefault(); var ok=true;
    form.querySelectorAll('.field').forEach(function(fd){
      var c=fd.querySelector('input,textarea'); if(!c) return;
      var bad=(c.required&&!c.value.trim())||(c.type==='email'&&!EMAIL.test(c.value.trim()))||(c.type==='tel'&&!window.ArticomPhoneOk(c.value));
      fd.classList.toggle('invalid',bad); c.setAttribute('aria-invalid',bad?'true':'false');
      if(bad&&ok){ok=false;c.focus()}
    });
    if(!ok||form.classList.contains('busy')) return;
    var data={journey:form.getAttribute('data-journey'),source:source()};
    new FormData(form).forEach(function(v,k){data[k]=v});
    form.classList.remove('failed'); form.classList.add('busy');
    window.ArticomSubmit(data)
      .then(function(j){ if(!j||!j.ok) throw new Error('rejected'); form.classList.add('done'); form.querySelector('.sent').scrollIntoView({block:'nearest'}); })
      .catch(function(){ form.classList.add('failed'); form.querySelector('.fail').scrollIntoView({block:'nearest'}); })
      .then(function(){ form.classList.remove('busy'); });
  });
  form.addEventListener('input',function(e){var fd=e.target.closest('.field');if(fd){fd.classList.remove('invalid');e.target.removeAttribute('aria-invalid')}});

  // Picking a sentence fills the form (never over the visitor's own words) and the WhatsApp text.
  var filled='';
  function fill(text){ if(!msg.value.trim()||msg.value===filled){msg.value=text;filled=text;msg.dispatchEvent(new Event('input',{bubbles:true}))} }
  var says=[].slice.call(document.querySelectorAll('.say')), panel=document.getElementById('picked');
  says.forEach(function(b){
    b.addEventListener('click',function(){
      var t=b.getAttribute('data-msg');
      says.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
      panel.hidden=false; document.getElementById('pickedText').textContent=t; fill(t);
      document.querySelectorAll('[data-wa]').forEach(function(a){a.href='https://wa.me/972543037031?text='+encodeURIComponent('שלום, אשמח לעזרה. '+t)});
      panel.scrollIntoView({block:'nearest'});
    });
  });
  document.querySelectorAll('a[data-msg]').forEach(function(a){a.addEventListener('click',function(){fill(a.getAttribute('data-msg'))})});

  // Links to the form land on its first empty field, without popping the keyboard on touch screens.
  if(window.matchMedia('(hover:hover)').matches) document.querySelectorAll('a[href="#leadForm"]').forEach(function(a){
    a.addEventListener('click',function(){setTimeout(function(){var f=form.querySelector('.field input');if(f&&!form.classList.contains('done'))f.focus({preventScroll:true})},500)});
  });

  // No second "book a call" button over the form itself.
  if(document.body.classList.contains('lp-biz')&&'IntersectionObserver' in window){
    new IntersectionObserver(function(en){document.body.setAttribute('data-zone',en[0].isIntersecting?'form':'biz')},{rootMargin:'0px 0px -30% 0px'}).observe(form);
  }
})();
