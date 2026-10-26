// KeBe Lite waitlist page: copied verbatim from brand/kebe-waitlist/worker/src/page.mjs (Dan's design).
// Edit CONFIG there and copy back, or edit here. Signups go to the Cloudflare Worker + D1.
// @ts-nocheck
// KeBe Lite waitlist page (Dan's handoff design). Shared by the Worker preview and the storefront's /waitlist route.
// ===== SITE CONFIG: one-line swaps =====
export const CONFIG = {
  productName: 'KeBe Lite',                                   // wordmark, title, footer, success line
  kicker: 'KeBe Lite · Waitlist',                             // kicker label
  shipDate: 'Coming soon',                                    // nav + facts "Ships"
  intro: 'A lighter KeBe, assembled by hand in Canada.',      // lede
  privacy: 'Email only. No spam. Unsubscribe any time.',      // privacy/unsubscribe line
  storeLine: "Want the full KeBe? It's on sale now, built and shipped in order received.",
  errorColour: '#E0735A',                                     // CSS var --error (final, Dan)
};
// =======================================

export const MSG_INVALID = 'Enter a valid email address, like you@example.com.';
export const MSG_FAIL = 'Something went wrong. Try again in a moment.';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** opts: { base (asset prefix), action (form URL), storeUrl, state: ''|'error'|'success', msg, email } */
export function renderPage(opts) {
  const C = CONFIG, o = { base: '', action: '/api/waitlist', storeUrl: '/', state: '', msg: '', email: '', ...opts };
  const cls = o.state ? `form is-${o.state}` : 'form';
  const err = o.state === 'error';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(C.productName)}: Type faster, easier. Join the waitlist</title>
<meta name="description" content="${esc(C.intro)} Join the ${esc(C.productName)} waitlist.">
<link rel="icon" href="${o.base}assets/icon.svg"><link rel="stylesheet" href="${o.base}waitlist.css">
<style>:root{--error:${esc(C.errorColour)}}@font-face{font-family:"DM Serif Display";src:url(${o.base}fonts/DMSerifDisplay-Regular.ttf);font-display:swap}@font-face{font-family:"Inter";src:url(${o.base}fonts/Inter.ttf);font-weight:100 900;font-display:swap}@font-face{font-family:"IBM Plex Mono";src:url(${o.base}fonts/IBMPlexMono-SemiBold.ttf);font-weight:600;font-display:swap}</style></head>
<body>
<div class="wrap">
 <header class="nav"><a class="brand" href="${esc(o.storeUrl)}"><img src="${o.base}assets/icon.svg" alt="">${esc(C.productName)}</a><span class="stamp muted">${esc(C.shipDate)}</span></header>
 <main class="hero">
  <section>
   <div class="stamp">${esc(C.kicker)}</div>
   <h1>Type faster, easier.</h1>
   <p class="lede">${esc(C.intro)}</p>
   <dl class="facts">
    <div><dt>Ships</dt><dd>${esc(C.shipDate)}</dd></div>
   </dl>
   <form id="waitlist" class="${cls}" action="${esc(o.action)}" method="post" novalidate>
    <label for="email">Email</label>
    <div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
    <div class="row">
     <input class="input" id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required aria-describedby="email-msg"${err ? ` aria-invalid="true" autofocus value="${esc(o.email)}"` : ''}>
     <button class="btn" type="submit">Join the waitlist</button>
    </div>
    <div class="success" role="status"><b>You're on the list.</b><span>We'll email you when ${esc(C.productName)} is ready.</span></div>
    <p class="msg" id="email-msg" aria-live="polite">${esc(o.msg)}</p>
    <p class="privacy">${esc(C.privacy)}</p>
    <p class="privacy store-line"><a href="${esc(o.storeUrl)}">${esc(C.storeLine)}</a></p>
   </form>
  </section>
  <figure class="media">
   <div class="photo"><img src="${o.base}assets/kebe-v2-hero.jpg" alt="KeBe keyboard, render"></div>
   <figcaption class="cap">Render from its CAD.</figcaption>
  </figure>
 </main>
 <footer class="foot"><span>${esc(C.productName)} · kebe.brisebois.xyz</span><span>Assembled by hand in Canada</span></footer>
</div>
<script>
(()=>{const f=document.getElementById('waitlist'),e=f.email,b=f.querySelector('.btn'),m=document.getElementById('email-msg');
const BAD=${JSON.stringify(MSG_INVALID)},FAIL=${JSON.stringify(MSG_FAIL)},RE=/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
function err(t){f.classList.remove('is-loading');f.classList.add('is-error');m.textContent=t;e.setAttribute('aria-invalid','true');b.disabled=false;f.removeAttribute('aria-busy');e.focus()}
e.addEventListener('input',()=>{if(f.classList.contains('is-error')){f.classList.remove('is-error');m.textContent='';e.removeAttribute('aria-invalid')}});
f.addEventListener('submit',async ev=>{ev.preventDefault();if(f.classList.contains('is-loading'))return;f.classList.remove('is-error');
 if(!RE.test(e.value.trim()))return err(BAD);
 e.removeAttribute('aria-invalid');m.textContent='';f.classList.add('is-loading');f.setAttribute('aria-busy','true');b.disabled=true;
 try{const r=await fetch(f.action,{method:'POST',body:new FormData(f),headers:{Accept:'application/json'}});const j=await r.json().catch(()=>({}));
  if(r.ok&&j.ok){f.classList.remove('is-loading');f.removeAttribute('aria-busy');f.classList.add('is-success');history.replaceState(null,'',location.pathname);return}
  err(j.error==='invalid'?BAD:FAIL)}catch(_){err(FAIL)}});
const s=new URLSearchParams(location.search).get('state');
if(s==='error'){e.value='josh@';f.classList.add('is-error');m.textContent=BAD}
if(s==='focus'){f.classList.add('is-focus');e.value='josh@exam'}
if(s==='loading'){e.value='you@example.com';f.classList.add('is-loading')}
if(s==='success'){f.classList.add('is-success')}})();
</script>
</body></html>`;
}
