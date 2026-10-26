import './style.css';

const app = document.getElementById('app');

// Service worker: zorgt dat de app ook zonder internet opent.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

// Stap 0: alleen een welkomstscherm, om te testen dat de app online staat
// en op het beginscherm gezet kan worden.
app.innerHTML = `
  <header class="woordmerk"><h1>Kijk<span>wijzer</span></h1></header>
  <section class="welkom">
    <p>Je films en series, rustig op één plek.</p>
    <p class="zacht">Hier komt straks je lijst.</p>
  </section>
  <p class="versie">Versie van ${__VERSIE__}</p>
`;
