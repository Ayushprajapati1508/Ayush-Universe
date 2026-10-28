import { profile } from './profile.js';

document.documentElement.classList.add('js');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const motionButton = $('#motion-toggle');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let storedMotion;
try { storedMotion = localStorage.getItem('ayush-motion'); } catch { /* Private browsing remains supported. */ }
let motionEnabled = storedMotion === null || storedMotion === undefined ? !motionQuery.matches : storedMotion === 'on';
let universe;
let expanded = false;
let lastPlanetButton;
let dialogTimer;
let navigationTarget = null;
let toastTimer;
const stage = $('#universe-scene');
const wrap = $('.universe-wrap');
const wrapAnchor = document.createComment('Universe original position');
wrap.before(wrapAnchor);
const pageRegions = [$('.skip-link'), $('.site-header'), $('#main'), $('.site-footer')];
const dialog = $('#planet-dialog');
const exploreButton = $('#explore-button');
const closeExplore = document.createElement('button');
closeExplore.className = 'close-explore';
closeExplore.type = 'button';
closeExplore.setAttribute('aria-label', 'Return from universe exploration');
closeExplore.textContent = '×';
wrap.append(closeExplore);

const chapters = {
  about: { label:'01 / THE PERSON', title:'Curiosity comes first.', text:"I'm Ayush Prajapati, a website builder with a BCA background. I'm now in my first semester of cybersecurity, exploring the systems behind the things we build.", chips:['Website builder','BCA background','Always learning'] },
  learning: { label:'02 / THE NEXT FRONTIER', title:'An expanding universe.', text:"My current focus connects how software works, how networks communicate and how security fits into both. One concept, exercise and question at a time.", chips:['Network fundamentals','Programming','Security foundations'] },
  journey: { label:'03 / THE WAY HERE', title:'Every orbit tells a story.', text:"A foundation in computer applications. Hands-on experience building websites. Now, a new chapter in cybersecurity. Follow the path that brought me here.", chips:['BCA','Building websites','Cybersecurity · Semester 01'] },
  contact: { label:'04 / MAKE A CONNECTION', title:'Our next orbit could connect.', text:"I'm interested in conversations with people who build, learn and explore technology. Let's see where a shared curiosity could lead.", chips:['Connect','Collaborate','Explore'] }
};

function setMotion(enabled, persist = true) {
  motionEnabled = enabled;
  document.documentElement.classList.toggle('motion-paused', !enabled);
  motionButton.setAttribute('aria-pressed', String(!enabled));
  motionButton.setAttribute('aria-label', enabled ? 'Pause animations' : 'Resume animations');
  $('.motion-text', motionButton).textContent = enabled ? 'Pause motion' : 'Resume motion';
  $('.motion-icon', motionButton).textContent = enabled ? 'Ⅱ' : '▷';
  universe?.setMotion(enabled);
  if (persist) { try { localStorage.setItem('ayush-motion', enabled ? 'on' : 'off'); } catch {} }
}
setMotion(motionEnabled, false);
motionButton.addEventListener('click', () => setMotion(!motionEnabled));
motionQuery.addEventListener('change', e => setMotion(!e.matches, false));

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3300);
}

function openPlanet(id) {
  const data = chapters[id];
  if (!data) return;
  lastPlanetButton = $(`[data-planet="${id}"]`);
  clearTimeout(dialogTimer);
  universe?.focus(id);
  $('#dialog-eyebrow').textContent = data.label;
  $('#dialog-title').textContent = data.title;
  $('#dialog-text').textContent = data.text;
  const chips = $('#dialog-chips');
  chips.replaceChildren(...data.chips.map(text => {
    const chip = document.createElement('span'); chip.textContent = text; return chip;
  }));
  $('#dialog-link').href = '#' + id;
  dialogTimer = setTimeout(() => { if (!dialog.open) dialog.showModal(); }, motionEnabled ? 330 : 0);
}
$$('.planet-node').forEach(button => button.addEventListener('click', () => openPlanet(button.dataset.planet)));
$('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  universe?.reset();
  if (navigationTarget) {
    const heading = navigationTarget.querySelector('h2');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll:true });
    navigationTarget = null;
  } else lastPlanetButton?.focus({ preventScroll:true });
});
$('#dialog-link').addEventListener('click', event => {
  event.preventDefault();
  const target = $($('#dialog-link').getAttribute('href'));
  navigationTarget = target;
  dialog.close();
  if (expanded) closeExploration(false);
  target.scrollIntoView({ behavior:motionEnabled ? 'smooth' : 'instant', block:'start' });
  history.replaceState(null, '', '#' + target.id);
});

function enterExploration() {
  expanded = true;
  document.body.append(wrap);
  pageRegions.forEach(element => { element.inert = true; });
  wrap.classList.add('is-expanded');
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', 'Explore Ayush’s universe');
  document.body.classList.add('lock-scroll');
  document.documentElement.classList.add('lock-scroll');
  $('#universe-hint').textContent = 'Choose a planet. Press Esc to return.';
  closeExplore.focus({ preventScroll:true });
  universe?.reset();
}
function closeExploration(restoreFocus = true) {
  clearTimeout(dialogTimer);
  expanded = false;
  wrap.classList.remove('is-expanded');
  wrap.removeAttribute('role');
  wrap.removeAttribute('aria-modal');
  wrap.removeAttribute('aria-label');
  pageRegions.forEach(element => { element.inert = false; });
  wrapAnchor.after(wrap);
  document.body.classList.remove('lock-scroll');
  document.documentElement.classList.remove('lock-scroll');
  $('#universe-hint').textContent = 'Choose a planet. Discover a chapter.';
  universe?.reset();
  if (restoreFocus) exploreButton.focus({ preventScroll:true });
}
exploreButton.addEventListener('click', enterExploration);
closeExplore.addEventListener('click', () => closeExploration());
document.addEventListener('keydown', e => {
  if (!expanded || dialog.open) return;
  if (e.key === 'Escape') { e.preventDefault(); clearTimeout(dialogTimer); closeExploration(); }
  if (e.key === 'Tab') {
    const items = $$('button:not([disabled]),a[href]', wrap);
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

const menuButton = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
function closeMenu() { mobileNav.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label','Open navigation'); }
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
$$('a', mobileNav).forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); } });
document.addEventListener('click', e => { if (!mobileNav.hidden && !$('.site-header').contains(e.target)) closeMenu(); });

if ('IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); }
  }, { threshold:0.12 });
  $$('.reveal').forEach(element => reveal.observe(element));
} else $$('.reveal').forEach(element => element.classList.add('visible'));

// Empty values stay hidden. Only real contact details supplied by the owner appear.
const links = $('#contact-links');
function addContact(label, href, external = true) {
  const link = document.createElement('a');
  link.textContent = label + ' ↗'; link.href = href;
  if (external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  links.append(link);
}
if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) addContact('Email me','mailto:' + profile.email, false);
for (const [key, label] of [['linkedin','LinkedIn'],['github','GitHub']]) {
  try { const url = new URL(profile[key]); if (url.protocol === 'https:') addContact(label, url.href); } catch {}
}
if (profile.resumeURL) {
  try { const url = new URL(profile.resumeURL, location.href); if (['http:','https:'].includes(url.protocol)) addContact('View resume', url.href); } catch {}
}
$('#contact-pending').hidden = links.children.length > 0;

$('#copy-link').addEventListener('click', async () => {
  const link = new URL(location.href); link.hash = '';
  const message = $('#copy-feedback');
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link.href);
    else {
      const field = document.createElement('textarea'); field.value = link.href; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select();
      const copied = document.execCommand('copy'); field.remove(); if (!copied) throw new Error('Clipboard unavailable');
    }
    message.textContent = 'Portfolio link copied.';
  } catch {
    message.replaceChildren();
    const label = document.createElement('label'); label.textContent = 'Copy this address: ';
    const field = document.createElement('input'); field.value = link.href; field.readOnly = true; field.setAttribute('aria-label','Portfolio URL');
    Object.assign(field.style,{ color:'#b5eafa', background:'#111827', border:'1px solid #48e6ff44', padding:'5px', width:'min(290px,80%)', fontSize:'10px' });
    label.append(field); message.append(label); field.focus(); field.select();
  }
});

try {
  const { createUniverse } = await import('./universe.js');
  universe = createUniverse({ container:stage, onSelect:openPlanet, onReady:() => { stage.setAttribute('data-loaded','true'); } });
  universe.setMotion(motionEnabled);
} catch (error) {
  console.info('WebGL is unavailable; using the animated Canvas universe.');
  try {
    const { createFallbackUniverse } = await import('./universe-fallback.js');
    universe = createFallbackUniverse({ container:stage, onSelect:openPlanet, onReady:() => { stage.setAttribute('data-loaded','true'); } });
    universe.setMotion(motionEnabled);
  } catch (fallbackError) {
    console.warn('Using the accessible static constellation.', fallbackError);
    stage.classList.add('universe-fallback');
    $('.live-indicator').innerHTML = '<i></i>CONSTELLATION VIEW';
  }
}
window.addEventListener('pagehide', () => { universe?.setMotion(false); });
window.addEventListener('pageshow', () => { universe?.setMotion(motionEnabled); });
