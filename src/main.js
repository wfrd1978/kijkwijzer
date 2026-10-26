import './style.css';
import { veilig, veiligeUrl } from './veilig.js';
import { soortSleutel, leesSleutel, bewaarSleutel, wisSleutel } from './sleutel.js';
import { zoekTitels, testSleutel, posterUrl, SleutelFout } from './tmdb.js';

const app = document.getElementById('app');

// Service worker: zorgt dat de app ook zonder internet opent.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

// Korte melding onderin.
function melding(tekst) {
  const el = document.getElementById('melding');
  el.textContent = tekst;
  el.classList.add('zichtbaar');
  clearTimeout(melding.timer);
  melding.timer = setTimeout(() => el.classList.remove('zichtbaar'), 2500);
}

const BRON = '<p class="bron">Gegevens en posters van TMDB. Deze app gebruikt de TMDB API, maar is niet door TMDB goedgekeurd of gecertificeerd.</p>';

// --- Zoeken ---

let laatsteZoekterm = '';
let zoekNr = 0;

function posterHtml(t) {
  const url = veiligeUrl(posterUrl(t.poster));
  return url
    ? `<img class="poster-klein" src="${url}" alt="" loading="lazy" />`
    : `<div class="poster-klein geen-poster" aria-hidden="true">${veilig(t.titel.slice(0, 1))}</div>`;
}

function toonZoek() {
  if (!leesSleutel()) {
    app.innerHTML = `
      <header class="woordmerk"><h1>Kijk<span>wijzer</span></h1></header>
      <section class="welkom">
        <p>Je films en series, rustig op één plek.</p>
        <p class="zacht">Plak eerst één keer je TMDB-sleutel, dan kun je zoeken.</p>
        <a class="hoofdknop" href="#/instellingen">Sleutel instellen</a>
      </section>`;
    return;
  }
  app.innerHTML = `
    <header class="woordmerk"><h1>Kijk<span>wijzer</span></h1></header>
    <form class="zoekbalk" id="zoek-form" role="search">
      <input id="zoekveld" type="search" placeholder="Film of serie" autocomplete="off" enterkeyhint="search" value="${veilig(laatsteZoekterm)}" aria-label="Zoek een film of serie" />
      <button type="submit">Zoek</button>
    </form>
    <div id="resultaten"></div>
  `;
  const veld = document.getElementById('zoekveld');
  let wacht;
  // Zoeken terwijl je typt, met een korte pauze zodat niet elke letter een vraag aan TMDB wordt.
  veld.addEventListener('input', () => {
    clearTimeout(wacht);
    wacht = setTimeout(() => zoek(veld.value), 400);
  });
  document.getElementById('zoek-form').addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(wacht);
    veld.blur(); // toetsenbord weg, zodat je de resultaten ziet
    zoek(veld.value);
  });
  if (laatsteZoekterm) zoek(laatsteZoekterm);
  else veld.focus();
}

async function zoek(term) {
  const vak = document.getElementById('resultaten');
  if (!vak) return;
  laatsteZoekterm = term.trim();
  if (!laatsteZoekterm) {
    vak.innerHTML = '';
    return;
  }
  const nr = ++zoekNr;
  vak.innerHTML = '<p class="bezig">Zoeken…</p>';
  try {
    const titels = await zoekTitels(laatsteZoekterm);
    if (nr !== zoekNr) return; // er is intussen verder getypt
    vak.innerHTML = titels.length
      ? `<ul class="lijst">${titels
          .map(
            (t) => `
          <li class="titel">
            ${posterHtml(t)}
            <div class="titel-tekst">
              <strong>${veilig(t.titel)}</strong>
              <span>${t.soort === 'film' ? 'Film' : 'Serie'}${t.jaar ? ` · ${veilig(t.jaar)}` : ''}</span>
              ${t.origineel && t.origineel !== t.titel ? `<span class="zacht">${veilig(t.origineel)}</span>` : ''}
            </div>
          </li>`
          )
          .join('')}</ul>${BRON}`
      : '<p class="leeg">Niets gevonden. Probeer andere woorden.</p>';
  } catch (fout) {
    if (nr !== zoekNr) return;
    vak.innerHTML =
      fout instanceof SleutelFout
        ? '<p class="leeg">TMDB accepteert je sleutel niet. <a href="#/instellingen">Plak hem opnieuw</a>.</p>'
        : '<p class="leeg">Zoeken lukt nu niet. Heb je internet?</p>';
  }
}

// --- Instellingen ---

function toonInstellingen() {
  const sleutel = leesSleutel();
  app.innerHTML = `
    <header class="kop"><h1>Instellingen</h1></header>

    <section class="blok">
      <h2>TMDB-sleutel</h2>
      ${
        sleutel
          ? `<p>Je sleutel is ingesteld en staat alleen op deze telefoon.</p>
             <p class="zacht sleutel-kort">${soortSleutel(sleutel) === 'token' ? 'Read Access Token' : 'API Key'} · eindigt op ${veilig(sleutel.slice(-4))}</p>
             <button class="tweede-knop" id="sleutel-test">Test de sleutel</button>
             <button class="link-knop" id="sleutel-weg">Sleutel verwijderen</button>`
          : `<p>Kijkwijzer haalt titels, posters en streaminginformatie op bij TMDB. Daarvoor heb je een gratis sleutel nodig. Je vindt hem op <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">themoviedb.org/settings/api</a>.</p>
             <p class="zacht">De sleutel blijft op deze telefoon en gaat nergens anders heen dan naar TMDB.</p>
             <form id="sleutel-form">
               <textarea id="sleutel-veld" rows="3" placeholder="Plak hier je API Key of Read Access Token" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
               <p class="fout" id="sleutel-fout" hidden></p>
               <button class="hoofdknop" type="submit">Bewaar sleutel</button>
             </form>`
      }
    </section>

    <section class="blok">
      <h2>Over</h2>
      ${BRON}
      <p class="versie">Versie van ${__VERSIE__}</p>
    </section>
  `;

  document.getElementById('sleutel-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const knop = e.submitter;
    const fout = document.getElementById('sleutel-fout');
    const tekst = document.getElementById('sleutel-veld').value.trim();
    const toonFout = (t) => {
      fout.textContent = t;
      fout.hidden = false;
    };
    if (!soortSleutel(tekst)) {
      toonFout('Dit lijkt geen TMDB-sleutel. Kopieer de API Key (32 tekens) of de Read Access Token (begint met eyJ).');
      return;
    }
    knop.disabled = true;
    knop.textContent = 'Controleren…';
    try {
      await testSleutel(tekst);
      bewaarSleutel(tekst);
      melding('Sleutel bewaard');
      location.hash = '#/';
    } catch (f) {
      toonFout(f instanceof SleutelFout ? 'TMDB accepteert deze sleutel niet. Controleer of je hem helemaal hebt gekopieerd.' : 'Controleren lukt nu niet. Heb je internet?');
      knop.disabled = false;
      knop.textContent = 'Bewaar sleutel';
    }
  });

  document.getElementById('sleutel-test')?.addEventListener('click', async () => {
    try {
      await testSleutel(leesSleutel());
      melding('De sleutel werkt');
    } catch (f) {
      melding(f instanceof SleutelFout ? 'TMDB accepteert de sleutel niet' : 'Geen verbinding met TMDB');
    }
  });

  document.getElementById('sleutel-weg')?.addEventListener('click', () => {
    if (!confirm('Sleutel van deze telefoon verwijderen? Je kunt hem daarna opnieuw plakken.')) return;
    wisSleutel();
    toonInstellingen();
  });
}

// --- Schermen ---

function route() {
  window.scrollTo(0, 0);
  const plek = location.hash === '#/instellingen' ? 'instellingen' : 'zoek';
  document.querySelectorAll('.balk a').forEach((a) => a.classList.toggle('actief', a.dataset.plek === plek));
  if (plek === 'instellingen') toonInstellingen();
  else toonZoek();
}

window.addEventListener('hashchange', route);
route();
