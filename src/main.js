import './style.css';
import { veilig, veiligeUrl } from './veilig.js';
import { soortSleutel, leesSleutel, bewaarSleutel, wisSleutel } from './sleutel.js';
import { zoekTitels, testSleutel, posterUrl, SleutelFout, haalDiensten, haalAlleDiensten, haalTrending, haalOpDiensten, haalAanbevelingen, haalTrailerEnActeurs, haalActeur } from './tmdb.js';
import { kiesFavorieten, combineerTips } from './tips.js';
import { haalF1, komendeRaces, nlTijd, F1_ZENDERS } from './sport.js';
import { uitnodigingTekst, deel } from './delen.js';
import { KEUZES, leesKeuzes, zetKeuze, zetAlleKeuzes, keuzeVan, nieuwBijJou, verdeelDiensten, doorklikLink } from './diensten.js';
import { alleTitels, titelToevoegen, vraagBlijvendeOpslag, haalTitel, titelBijwerken, titelVerwijderen, titelTerugzetten } from './db.js';
import { maakBackupBestand, bewaarBackup, laatsteBackup, dagenSinds, moetHerinneren, herinnerLater, leesBackup, zetBackupTerug } from './backup.js';
import {
  titelSleutel, STATUSSEN, statusWijziging, vandaag, datumTekst,
  TABS, SOORTEN, SORTERINGEN, filterTitels, sorteerTitels, dubbelTekst, gevondenActeur,
  beginVoortgang, volgendeAflevering, voortgangKort,
} from './titels.js';

const app = document.getElementById('app');

// Service worker: zorgt dat de app ook zonder internet opent.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

// Nieuwe versie online? Dan een knop om te vernieuwen, zodat de app niet helemaal dicht hoeft.
// De app vergelijkt het hoofdbestand van de site met het bestand dat nu draait.
const HUIDIG_SCRIPT = document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src');

async function kijkNaarNieuweVersie() {
  if (!HUIDIG_SCRIPT || document.getElementById('nieuwe-versie')) return;
  try {
    const html = await (await fetch(import.meta.env.BASE_URL, { cache: 'no-store' })).text();
    const online = html.match(/<script[^>]+type="module"[^>]+src="([^"]+\/assets\/[^"]+)"/)?.[1];
    if (!online || online === HUIDIG_SCRIPT) return;
  } catch {
    return; // Geen internet: dan later nog eens.
  }
  const knop = Object.assign(document.createElement('button'), {
    id: 'nieuwe-versie',
    textContent: 'Nieuwe versie klaar · tik om te vernieuwen',
  });
  knop.addEventListener('click', async () => {
    await toonTitel.bewaarOpenstaand?.();
    location.reload();
  });
  document.body.append(knop);
}
if (HUIDIG_SCRIPT) {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && kijkNaarNieuweVersie());
  setInterval(kijkNaarNieuweVersie, 30 * 60000);
}

// Korte melding onderin, eventueel met een knop (zoals 'Ongedaan maken').
function melding(tekst, knop) {
  const el = document.getElementById('melding');
  el.textContent = tekst;
  if (knop) {
    const b = Object.assign(document.createElement('button'), { textContent: knop.tekst });
    b.addEventListener('click', () => {
      el.classList.remove('zichtbaar');
      knop.actie();
    });
    el.append(b);
  }
  el.classList.toggle('met-knop', Boolean(knop));
  el.classList.add('zichtbaar');
  clearTimeout(melding.timer);
  melding.timer = setTimeout(() => el.classList.remove('zichtbaar'), knop ? 5000 : 2500);
}

function sterrenTekst(aantal) {
  return aantal ? '★'.repeat(aantal) + '☆'.repeat(5 - aantal) : '';
}

const JUSTWATCH = '<p class="bron">Streaminginformatie van JustWatch.</p>';
const BRON = '<p class="bron">Gegevens en posters van TMDB. Deze app gebruikt de TMDB API, maar is niet door TMDB goedgekeurd of gecertificeerd.</p>';

const WOORDMERK = '<header class="woordmerk"><h1>Kijk<span>wijzer</span></h1></header>';

function posterHtml(t, klasse = 'poster-klein') {
  const url = veiligeUrl(posterUrl(t.poster, klasse === 'poster-groot' ? 'w342' : 'w185'));
  return url
    ? `<img class="${klasse}" src="${url}" alt="" loading="lazy" />`
    : `<div class="${klasse} geen-poster" aria-hidden="true">${veilig(t.titel.slice(0, 1))}</div>`;
}

function soortJaar(t) {
  return `${t.soort === 'film' ? 'Film' : 'Serie'}${t.jaar ? ` · ${veilig(t.jaar)}` : ''}`;
}

// Als een scherm laadt terwijl je al verder tikt, mag het oude scherm niets meer tekenen.
let schermNr = 0;

// --- Mijn lijst ---

// Je keuzes in de lijst blijven bewaard, ook als je de app sluit.
function onthoud(sleutel, standaard, toegestaan) {
  try {
    const waarde = localStorage.getItem(sleutel);
    return toegestaan.includes(waarde) ? waarde : standaard;
  } catch {
    return standaard;
  }
}
function bewaarKeuze(sleutel, waarde) {
  try {
    localStorage.setItem(sleutel, waarde);
  } catch {
    // Niet erg: dan geldt de keuze alleen nu.
  }
}
let tab = onthoud('tab', 'Alles', TABS);
let soort = onthoud('soort', 'alle', Object.keys(SOORTEN));
let sortering = onthoud('sortering', 'toegevoegd', Object.keys(SORTERINGEN));
let lijstZoek = '';

// --- Vegen om te verwijderen (zoals in de boekenapp) ---
// Een regel naar links vegen toont een rode knop Verwijder; snel vegen telt ook.

const VEEG_BREEDTE = 96;

function maakVeegbaar(lijst, onVerwijder) {
  let open = null;
  let start = null;
  let frame = 0;

  const zet = (li, x, animeer) => {
    const a = li.querySelector('.titel');
    li.classList.add('veegt');
    a.style.transition = animeer ? 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    a.style.transform = x ? `translate3d(${x}px, 0, 0)` : '';
    // Dicht geschoven: knop en extra laag weer weg zodra de beweging klaar is.
    if (!x) {
      clearTimeout(li.veegTimer);
      li.veegTimer = setTimeout(() => {
        if (!a.style.transform) li.classList.remove('veegt');
      }, animeer ? 350 : 0);
    }
  };
  const sluit = () => {
    if (open) zet(open, 0, true);
    open = null;
  };
  // Voorbij de knop gaat het zwaarder, zoals een elastiek.
  const elastiek = (x) => (x >= -VEEG_BREEDTE ? x : -VEEG_BREEDTE + (x + VEEG_BREEDTE) * 0.3);

  lijst.addEventListener('touchstart', (e) => {
    const li = e.target.closest('.veeg');
    if (!li || e.target.closest('.veeg-actie')) return;
    if (open && open !== li) sluit();
    const t = e.touches[0];
    start = { li, x: t.clientX, y: t.clientY, basis: open === li ? -VEEG_BREEDTE : 0, richting: null, laatste: [] };
  }, { passive: true });

  lijst.addEventListener('touchmove', (e) => {
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Pas beslissen na een paar pixels: vegen opzij of gewoon scrollen.
    if (!start.richting) {
      if (Math.abs(dx) + Math.abs(dy) < 10) return;
      start.richting = Math.abs(dx) > Math.abs(dy) ? 'opzij' : 'scroll';
      // Vanaf hier meten, zodat de regel niet verspringt.
      start.x = t.clientX;
    }
    if (start.richting !== 'opzij') return;
    e.preventDefault();
    start.laatste.push({ x: t.clientX, t: e.timeStamp });
    if (start.laatste.length > 5) start.laatste.shift();
    const x = elastiek(Math.min(0, start.basis + t.clientX - start.x));
    const li = start.li;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => zet(li, x, false));
  }, { passive: false });

  // Onderbroken (bijvoorbeeld door een melding): regel netjes dichtschuiven.
  lijst.addEventListener('touchcancel', () => {
    if (start?.li) zet(start.li, start.basis, true);
    start = null;
  });

  lijst.addEventListener('touchend', (e) => {
    if (!start) return;
    if (start.richting === 'opzij') {
      cancelAnimationFrame(frame);
      const x = start.basis + (e.changedTouches[0].clientX - start.x);
      // Snelheid van de laatste beweging: een snelle veeg telt ook als hij kort is.
      const p = start.laatste;
      const snelheid = p.length > 1 ? (p[p.length - 1].x - p[0].x) / Math.max(1, p[p.length - 1].t - p[0].t) : 0;
      const openen = snelheid < -0.4 || (snelheid <= 0.4 && x < -VEEG_BREEDTE / 2);
      zet(start.li, openen ? -VEEG_BREEDTE : 0, true);
      open = openen ? start.li : open === start.li ? null : open;
      // Na vegen geen titel openen.
      const li = start.li;
      li.dataset.geveegd = 'ja';
      setTimeout(() => delete li.dataset.geveegd, 400);
    }
    start = null;
  });

  lijst.addEventListener('click', (e) => {
    const li = e.target.closest('.veeg');
    if (!li) return;
    if (e.target.closest('.veeg-actie')) {
      open = null;
      onVerwijder(li);
      return;
    }
    // Tik op een open regel (of net geveegd): dichtschuiven in plaats van openen.
    if (li.dataset.geveegd || open === li) {
      e.preventDefault();
      sluit();
    }
  });
}

function titelRegel(t, zoek = '') {
  const acteur = gevondenActeur(t, zoek);
  return `
      <li class="veeg" data-id="${t.id}">
        <button class="veeg-actie" tabindex="-1">Verwijder</button>
        <a class="titel" href="#/titel/${t.id}">
        ${posterHtml(t)}
        <div class="titel-tekst">
          <span class="regel">
            <span class="status${t.status === 'Wil ik zien' ? '' : ' status-actief'}">${veilig(t.status)}</span>
            ${t.sterren ? `<span class="sterren-klein" aria-label="${t.sterren} sterren">${sterrenTekst(t.sterren)}</span>` : ''}
            ${t.soort === 'serie' && t.status === 'Bezig' && voortgangKort(t.voortgang) ? `<span class="voortgang-kort">${voortgangKort(t.voortgang)}</span>` : ''}
            ${t.nieuwBij?.length ? `<span class="nieuw-label">Nieuw bij ${veilig(t.nieuwBij.map((d) => d.naam).join(' en '))}</span>` : ''}
          </span>
          <strong>${veilig(t.titel)}</strong>
          <span>${soortJaar(t)}</span>
          ${acteur ? `<span class="met-acteur">Met ${veilig(acteur)}</span>` : ''}
        </div>
      </a></li>`;
}

// --- Nieuw bij jouw diensten ---

function nieuwHtml(titels) {
  const nieuw = titels.filter((t) => t.nieuwBij?.length);
  if (!nieuw.length) return '';
  return `
    <div class="nieuw-melding">
      <p class="nieuw-kop">Nieuw bij jouw diensten</p>
      <ul>${nieuw
        .slice(0, 5)
        .map((t) => `<li><a href="#/titel/${t.id}"><strong>${veilig(t.titel)}</strong> · ${veilig(t.nieuwBij.map((d) => d.naam).join(' en '))}</a></li>`)
        .join('')}</ul>
      ${nieuw.length > 5 ? `<p class="zacht">En nog ${nieuw.length - 5} andere titels.</p>` : ''}
      <button class="link-knop" id="nieuw-gezien">Gezien, melding weg</button>
    </div>`;
}

const NIEUW_GECONTROLEERD = 'nieuwGecontroleerd';

// Kijkt of titels op 'Wil ik zien' nieuw te zien zijn bij een van je abonnementen.
// Eén keer per dag vanzelf (of nu, via Instellingen). Geeft het aantal nieuwe titels,
// of null als er niets te controleren viel.
async function controleerNieuw({ nu = false } = {}) {
  if (!leesSleutel()) return null;
  const keuzes = leesKeuzes();
  if (!Object.values(keuzes).includes('abonnement')) return null;
  if (!nu && onthoud(NIEUW_GECONTROLEERD, '', [vandaag()]) === vandaag()) return null;
  let gevonden = 0;
  for (const t of (await alleTitels()).filter((x) => x.status === 'Wil ik zien')) {
    let diensten;
    try {
      diensten = await haalDiensten(t.soort, t.tmdbId);
    } catch {
      return gevonden; // Geen internet: morgen (of bij de volgende keer) opnieuw.
    }
    const nieuw = nieuwBijJou(t, diensten, keuzes);
    const wijziging = { diensten, dienstenOp: vandaag() };
    if (nieuw.length) {
      const al = t.nieuwBij ?? [];
      wijziging.nieuwBij = [...al, ...nieuw.filter((d) => !al.some((a) => a.id === d.id))];
      gevonden += 1;
    }
    await titelBijwerken(t.id, wijziging);
    await new Promise((klaar) => setTimeout(klaar, 300)); // rustig aan richting TMDB
  }
  bewaarKeuze(NIEUW_GECONTROLEERD, vandaag());
  // Staat Mijn lijst open, dan meteen de melding laten zien.
  if (gevonden && (location.hash === '' || location.hash === '#/')) route();
  return gevonden;
}

function herinneringHtml() {
  const dagen = dagenSinds(laatsteBackup());
  return `
    <div class="herinnering">
      <p>${dagen === null ? 'Je hebt nog geen backup van je lijst.' : `Je laatste backup is ${dagen} dagen oud.`}</p>
      <div class="herinnering-knoppen">
        <a href="#/instellingen">Backup maken</a>
        <button class="link-knop" id="later">Later</button>
      </div>
    </div>`;
}

async function toonLijst() {
  const nr = schermNr;
  const titels = await alleTitels();
  if (nr !== schermNr) return;
  if (!titels.length) {
    app.innerHTML = `
      ${WOORDMERK}
      <section class="welkom">
        <p>Je films en series, rustig op één plek.</p>
        ${
          leesSleutel()
            ? '<p class="zacht">Je lijst is nog leeg. Zoek een film of serie om te beginnen.</p><a class="hoofdknop" href="#/zoek">Zoek een titel</a>'
            : '<p class="zacht">Plak eerst één keer je TMDB-sleutel, dan kun je zoeken.</p><a class="hoofdknop" href="#/instellingen">Sleutel instellen</a>'
        }
      </section>`;
    return;
  }
  app.innerHTML = `
    ${WOORDMERK}
    ${nieuwHtml(titels)}
    ${moetHerinneren(titels.length) ? herinneringHtml() : ''}
    <nav class="tabs" id="tabs">${TABS.map((t) => `<button class="tab${t === tab ? ' actief' : ''}" data-tab="${t}">${t}</button>`).join('')}</nav>
    <div class="lijst-bediening">
      <input id="lijst-zoek" type="search" placeholder="Zoek op titel, acteur of notitie" value="${veilig(lijstZoek)}" autocomplete="off" enterkeyhint="search" aria-label="Zoek in je lijst" />
      <div class="lijst-regel">
        <label class="sorteer">Toon
          <select id="soort">${Object.entries(SOORTEN).map(([k, v]) => `<option value="${k}"${k === soort ? ' selected' : ''}>${v}</option>`).join('')}</select>
        </label>
        <label class="sorteer">Sorteer
          <select id="sorteer">${Object.entries(SORTERINGEN).map(([k, v]) => `<option value="${k}"${k === sortering ? ' selected' : ''}>${v}</option>`).join('')}</select>
        </label>
        <span class="aantal" id="aantal"></span>
      </div>
    </div>
    <ul class="lijst" id="lijst"></ul>
  `;

  // Alleen de lijst zelf opnieuw tekenen, zodat het zoekveld en het toetsenbord blijven staan.
  const teken = () => {
    const zichtbaar = sorteerTitels(filterTitels(titels, { tab, soort, zoek: lijstZoek }), sortering);
    document.getElementById('lijst').innerHTML = zichtbaar.length
      ? zichtbaar.map((t) => titelRegel(t, lijstZoek)).join('')
      : `<li class="leeg">${
          lijstZoek ? `Niets gevonden voor "${veilig(lijstZoek)}".` : tab === 'Alles' ? `Geen ${SOORTEN[soort].toLowerCase()} op je lijst.` : `Nog niets bij ${veilig(tab)}.`
        }</li>`;
    document.getElementById('aantal').textContent = zichtbaar.length === 1 ? '1 titel' : `${zichtbaar.length} titels`;
  };
  teken();

  maakVeegbaar(document.getElementById('lijst'), async (li) => {
    const id = Number(li.dataset.id);
    const kopie = (await haalTitel(id)) ?? titels.find((t) => t.id === id);
    if (!kopie) return;
    await titelVerwijderen(id);
    titels.splice(titels.findIndex((t) => t.id === id), 1);
    li.classList.add('weg');
    setTimeout(teken, 250);
    melding(`"${kopie.titel}" verwijderd`, {
      tekst: 'Ongedaan maken',
      actie: async () => {
        await titelTerugzetten(kopie);
        // Staat de lijst nog open, dan bijwerken; anders komt hij straks vanzelf.
        if (!document.getElementById('lijst')) return;
        titels.push(kopie);
        teken();
      },
    });
  });

  document.getElementById('nieuw-gezien')?.addEventListener('click', async () => {
    for (const t of titels.filter((x) => x.nieuwBij?.length)) {
      await titelBijwerken(t.id, { nieuwBij: [] });
      t.nieuwBij = [];
    }
    document.querySelector('.nieuw-melding').remove();
    teken();
  });
  document.getElementById('later')?.addEventListener('click', () => {
    herinnerLater();
    document.querySelector('.herinnering').remove();
  });
  document.getElementById('tabs').addEventListener('click', (e) => {
    const knop = e.target.closest('.tab');
    if (!knop) return;
    tab = knop.dataset.tab;
    bewaarKeuze('tab', tab);
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('actief', t.dataset.tab === tab));
    teken();
  });
  document.getElementById('lijst-zoek').addEventListener('input', (e) => {
    lijstZoek = e.target.value;
    teken();
  });
  document.getElementById('soort').addEventListener('change', (e) => {
    soort = e.target.value;
    bewaarKeuze('soort', soort);
    teken();
  });
  document.getElementById('sorteer').addEventListener('change', (e) => {
    sortering = e.target.value;
    bewaarKeuze('sortering', sortering);
    teken();
  });
}

// --- Zoeken ---

let laatsteZoekterm = '';
let laatsteResultaten = [];
let laatstePersonen = [];
let zoekNr = 0;

function toonZoek() {
  if (!leesSleutel()) {
    location.hash = '#/instellingen';
    return;
  }
  app.innerHTML = `
    ${WOORDMERK}
    <form class="zoekbalk" id="zoek-form" role="search">
      <input id="zoekveld" type="search" placeholder="Film, serie of acteur" autocomplete="off" enterkeyhint="search" value="${veilig(laatsteZoekterm)}" aria-label="Zoek een film, serie of acteur" />
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
  if (laatsteZoekterm) toonResultaten();
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
    const { titels, personen } = await zoekTitels(laatsteZoekterm);
    if (nr !== zoekNr) return; // er is intussen verder getypt
    laatsteResultaten = titels;
    laatstePersonen = personen;
    await toonResultaten();
  } catch (fout) {
    if (nr !== zoekNr) return;
    vak.innerHTML =
      fout instanceof SleutelFout
        ? '<p class="leeg">TMDB accepteert je sleutel niet. <a href="#/instellingen">Plak hem opnieuw</a>.</p>'
        : '<p class="leeg">Zoeken lukt nu niet. Heb je internet?</p>';
  }
}

async function toonResultaten() {
  const vak = document.getElementById('resultaten');
  if (!vak) return;
  const opLijst = new Map((await alleTitels()).map((t) => [titelSleutel(t), t]));
  // Acteurs bovenaan; tik je erop, dan zie je al hun films en series.
  const personen = laatstePersonen.length
    ? `<p class="label zoek-kop">Acteurs</p>
       <ul class="lijst">${laatstePersonen
         .map((a) => {
           const foto = veiligeUrl(posterUrl(a.foto, 'w185'));
           return `<li><a class="titel persoon" href="#/acteur/${a.id}">
             ${foto ? `<img class="persoon-foto" src="${foto}" alt="" loading="lazy" />` : `<span class="persoon-foto acteur-leeg" aria-hidden="true">${veilig(a.naam.slice(0, 1))}</span>`}
             <div class="titel-tekst">
               <strong>${veilig(a.naam)}</strong>
               <span>Acteur${a.bekendVan.length ? ` · ${a.bekendVan.map(veilig).join(', ')}` : ''}</span>
             </div>
           </a></li>`;
         })
         .join('')}</ul>
       ${laatsteResultaten.length ? '<p class="label zoek-kop">Films en series</p>' : ''}`
    : '';
  vak.innerHTML = laatsteResultaten.length || laatstePersonen.length
    ? `${personen}<ul class="lijst">${laatsteResultaten
        .map(
          (t, i) => `
        <li><button class="titel resultaat" data-i="${i}">
          ${posterHtml(t)}
          <div class="titel-tekst">
            <strong>${veilig(t.titel)}</strong>
            <span>${soortJaar(t)}</span>
            ${t.origineel && t.origineel !== t.titel ? `<span class="zacht">${veilig(t.origineel)}</span>` : ''}
            ${opLijst.has(titelSleutel(t)) ? `<span class="op-lijst">${veilig(dubbelTekst(opLijst.get(titelSleutel(t))))}</span>` : ''}
          </div>
        </button></li>`
        )
        .join('')}</ul>${BRON}`
    : '<p class="leeg">Niets gevonden. Probeer andere woorden.</p>';
  vak.querySelectorAll('.resultaat').forEach((knop) =>
    knop.addEventListener('click', () => {
      const t = laatsteResultaten[Number(knop.dataset.i)];
      toonBevestigen(t, opLijst.get(titelSleutel(t)));
    })
  );
}

// Eén zoekresultaat groot, met de knop om hem op je lijst te zetten.
// Staat hij er al op, dan zie je dat (met wanneer je hem zag) en kun je hem openen.
function toonBevestigen(t, alOpLijst, terug = { naam: 'Resultaten', toon: toonZoek }) {
  window.scrollTo(0, 0);
  app.innerHTML = `
    <header class="kop"><button class="terug" id="terug">‹ ${terug.naam}</button></header>
    <section class="bevestig">
      ${posterHtml(t, 'poster-groot')}
      <h2>${veilig(t.titel)}</h2>
      <p>${soortJaar(t)}${t.origineel && t.origineel !== t.titel ? ` · ${veilig(t.origineel)}` : ''}</p>
      ${t.reden ? `<p class="reden">${veilig(t.reden)}</p>` : ''}
      ${t.beschrijving ? `<p class="beschrijving">${veilig(t.beschrijving)}</p>` : ''}
      ${
        alOpLijst
          ? `<div class="dubbel"><p>${veilig(dubbelTekst(alOpLijst))}</p><a class="tweede-knop" href="#/titel/${alOpLijst.id}">Open op mijn lijst</a></div>`
          : '<button class="hoofdknop" id="toevoegen">Zet op mijn lijst</button>'
      }
    </section>
  `;
  document.getElementById('terug').addEventListener('click', terug.toon);
  document.getElementById('toevoegen')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    const { nieuw } = await titelToevoegen(t);
    melding(nieuw ? 'Op je lijst gezet' : 'Stond al op je lijst');
    terug.toon();
  });
}

// Een raster met posters (Ontdekken, acteurs). 'onder' is een extra regel per titel, zoals een rol.
function rasterHtml(titels, opLijst, onder = (t) => (t.jaar ? veilig(t.jaar) : '&nbsp;')) {
  return `<ul class="raster">${titels
    .map(
      (t, i) => `
      <li><button class="raster-titel" data-i="${i}">
        ${posterHtml(t, 'poster-raster')}
        ${opLijst.has(titelSleutel(t)) ? '<span class="raster-label">Op je lijst</span>' : ''}
        <strong>${veilig(t.titel)}</strong>
        <span>${onder(t)}</span>
      </button></li>`
    )
    .join('')}</ul>`;
}

// --- Ontdekken ---

const ONTDEK_SOORTEN = { film: 'Films', serie: 'Series' };
const ONTDEK_BRONNEN = { trending: 'Trending', diensten: 'Bij mijn diensten', tips: 'Tips voor mij' };
let ontdekSoort = onthoud('ontdekSoort', 'film', Object.keys(ONTDEK_SOORTEN));
let ontdekBron = onthoud('ontdekBron', 'trending', Object.keys(ONTDEK_BRONNEN));
// Wat al geladen is blijft bewaard, zodat 'terug' meteen werkt en je op dezelfde plek uitkomt.
const ontdekGeladen = new Map();
let ontdekScroll = 0;

function eigenDiensten() {
  const keuzes = leesKeuzes();
  return Object.keys(keuzes).filter((id) => keuzes[id] === 'abonnement').map(Number);
}

async function toonOntdekken({ terugNaarPlek = false } = {}) {
  if (!leesSleutel()) {
    location.hash = '#/instellingen';
    return;
  }
  const nr = schermNr;
  const eigen = eigenDiensten();
  const keuzeKnoppen = (id, opties, gekozen) =>
    `<div class="keuzes" id="${id}">${Object.entries(opties)
      .map(([k, naam]) => `<button class="keuze${k === gekozen ? ' actief' : ''}" data-k="${k}">${naam}</button>`)
      .join('')}</div>`;
  app.innerHTML = `
    ${WOORDMERK}
    <div class="ontdek-keuzes">
      ${keuzeKnoppen('ontdek-soort', ONTDEK_SOORTEN, ontdekSoort)}
      ${keuzeKnoppen('ontdek-bron', ONTDEK_BRONNEN, ontdekBron)}
    </div>
    <p class="zacht ontdek-uitleg">${
      ontdekBron === 'trending'
        ? `${ONTDEK_SOORTEN[ontdekSoort]} waar deze week veel over gepraat wordt.`
        : ontdekBron === 'diensten'
          ? `Populaire ${ONTDEK_SOORTEN[ontdekSoort].toLowerCase()} die je met je eigen abonnementen kunt kijken.`
          : `${ONTDEK_SOORTEN[ontdekSoort]} die lijken op wat je 4 of 5 sterren gaf. Wat al op je lijst staat, zie je hier niet.`
    }</p>
    <div id="ontdek-vak"></div>
  `;
  const kies = (id, zet) =>
    document.getElementById(id).addEventListener('click', (e) => {
      const knop = e.target.closest('[data-k]');
      if (!knop) return;
      zet(knop.dataset.k);
      schermNr += 1;
      toonOntdekken();
    });
  kies('ontdek-soort', (k) => bewaarKeuze('ontdekSoort', (ontdekSoort = k)));
  kies('ontdek-bron', (k) => bewaarKeuze('ontdekBron', (ontdekBron = k)));

  const vak = document.getElementById('ontdek-vak');
  if (ontdekBron === 'diensten' && !eigen.length) {
    vak.innerHTML = '<p class="leeg">Kies eerst in <a href="#/instellingen">Instellingen</a> bij Mijn diensten welke abonnementen je hebt.</p>';
    return;
  }

  const mijnTitels = await alleTitels();
  if (nr !== schermNr) return;
  const favorieten = ontdekBron === 'tips' ? kiesFavorieten(mijnTitels, ontdekSoort) : [];
  if (ontdekBron === 'tips' && !favorieten.length) {
    vak.innerHTML = `<p class="leeg">Geef eerst een ${ontdekSoort === 'film' ? 'film' : 'serie'} die je gezien hebt 4 of 5 sterren. Daarop baseert de app je tips.</p>`;
    return;
  }

  // Tips worden opnieuw berekend als je favorieten of je lijst veranderen.
  const sleutel = `${ontdekSoort}|${ontdekBron}|${eigen.join(',')}|${
    ontdekBron === 'tips' ? `${favorieten.map((f) => `${f.tmdbId}:${f.sterren}`).join(',')}|${mijnTitels.length}` : ''
  }`;
  const laad = async (pagina) => {
    if (ontdekBron === 'trending') return haalTrending(ontdekSoort, pagina);
    if (ontdekBron === 'diensten') return haalOpDiensten(ontdekSoort, eigen, pagina);
    // Lukt het bij één favoriet niet, dan tellen de andere gewoon mee.
    const per = await Promise.all(
      favorieten.map((favoriet) =>
        haalAanbevelingen(favoriet.soort, favoriet.tmdbId)
          .then((aanbevolen) => ({ favoriet, aanbevolen }))
          .catch((fout) => {
            if (fout instanceof SleutelFout) throw fout;
            return { favoriet, aanbevolen: [] };
          })
      )
    );
    return combineerTips(per, new Set(mijnTitels.map(titelSleutel)));
  };

  let stand = ontdekGeladen.get(sleutel);
  if (!stand) {
    vak.innerHTML = '<p class="bezig">Ophalen…</p>';
    try {
      stand = { titels: await laad(1), pagina: 1 };
      ontdekGeladen.set(sleutel, stand);
    } catch (fout) {
      if (nr !== schermNr) return;
      vak.innerHTML =
        fout instanceof SleutelFout
          ? '<p class="leeg">TMDB accepteert je sleutel niet. <a href="#/instellingen">Plak hem opnieuw</a>.</p>'
          : '<p class="leeg">Ophalen lukt nu niet. Heb je internet?</p>';
      return;
    }
  }
  if (nr !== schermNr) return;

  const opLijst = new Map((await alleTitels()).map((t) => [titelSleutel(t), t]));
  if (nr !== schermNr) return;

  const metMeer = ontdekBron !== 'tips' && stand.pagina < 5;
  const teken = () => {
    vak.innerHTML = stand.titels.length
      ? `${rasterHtml(stand.titels, opLijst)}
         ${metMeer && stand.pagina < 5 ? '<button class="tweede-knop" id="meer">Meer laden</button>' : ''}
         ${ontdekBron === 'diensten' ? JUSTWATCH : ''}${BRON}`
      : `<p class="leeg">${ontdekBron === 'tips' ? 'Nog geen tips gevonden. Geef meer titels 4 of 5 sterren.' : 'Niets gevonden.'}</p>`;
    vak.querySelectorAll('.raster-titel').forEach((knop) =>
      knop.addEventListener('click', () => {
        ontdekScroll = window.scrollY;
        const t = stand.titels[Number(knop.dataset.i)];
        toonBevestigen(t, opLijst.get(titelSleutel(t)), { naam: 'Ontdekken', toon: () => toonOntdekken({ terugNaarPlek: true }) });
      })
    );
    document.getElementById('meer')?.addEventListener('click', async (e) => {
      const knop = e.currentTarget;
      knop.disabled = true;
      knop.textContent = 'Ophalen…';
      try {
        const extra = await laad(stand.pagina + 1);
        const al = new Set(stand.titels.map(titelSleutel));
        stand.titels.push(...extra.filter((t) => !al.has(titelSleutel(t))));
        stand.pagina += 1;
        const plek = window.scrollY;
        teken();
        window.scrollTo(0, plek);
      } catch {
        knop.disabled = false;
        knop.textContent = 'Meer laden';
        melding('Ophalen lukt nu niet');
      }
    });
  };
  teken();
  if (terugNaarPlek) window.scrollTo(0, ontdekScroll);
}

// --- Waar kijken ---

function logoHtml(d) {
  const logo = veiligeUrl(posterUrl(d.logo, 'w92'));
  return logo ? `<img src="${logo}" alt="" loading="lazy" />` : '';
}

function dienstRij(naam, lijst) {
  if (!lijst?.length) return '';
  return `
    <div class="dienst-rij">
      <span class="dienst-soort">${naam}</span>
      <ul class="dienst-lijst">${lijst.map((d) => `<li class="dienst">${logoHtml(d)}${veilig(d.naam)}</li>`).join('')}</ul>
    </div>`;
}

// Je eigen abonnementen: groot, met een knop om meteen door te klikken.
function bijJouHtml(lijst, titel) {
  if (!lijst.length) return '';
  return `
    <div class="bij-jou">
      <span class="dienst-soort">Bij jou te zien</span>
      <ul class="dienst-lijst">${lijst
        .map((d) => {
          const link = veiligeUrl(doorklikLink(d, titel.titel));
          return link
            ? `<li><a class="dienst eigen" href="${link}" target="_blank" rel="noopener">${logoHtml(d)}Kijk op ${veilig(d.naam)} ↗</a></li>`
            : `<li class="dienst eigen">${logoHtml(d)}${veilig(d.naam)}</li>`;
        })
        .join('')}</ul>
    </div>`;
}

// De bewaarde diensten van een titel; 'bezig' als er net nieuwe worden opgehaald.
function dienstenHtml(titel, bezig = false) {
  if (!titel.dienstenOp) return `<p class="zacht">${bezig ? 'Ophalen…' : 'Nog niet bekend. Open deze titel met internet om het op te halen.'}</p>`;
  const d = titel.diensten;
  const datum = `<p class="zacht bijgewerkt">Bijgewerkt op ${veilig(datumTekst(titel.dienstenOp))}${bezig ? ' · verversen…' : ''}</p>`;
  if (!d) return `<p>Op dit moment niet te zien in Nederland.</p>${datum}${JUSTWATCH}`;
  const link = veiligeUrl(d.link);
  const v = verdeelDiensten(d, leesKeuzes());
  const rest = v.abonnement.length || v.gratis.length || v.huren.length || v.kopen.length;
  return `
    ${bijJouHtml(v.bijJou, titel)}
    ${v.bijJou.length ? '' : `<p class="niet-bij-jou">${Object.values(leesKeuzes()).includes('abonnement') ? 'Niet bij jouw abonnementen.' : 'Kies in Instellingen welke abonnementen je hebt, dan zie je hier wat bij jou te zien is.'}</p>`}
    ${dienstRij('Abonnement', v.abonnement)}
    ${dienstRij('Gratis', v.gratis)}
    ${dienstRij('Huren', v.huren)}
    ${dienstRij('Kopen', v.kopen)}
    ${!rest && !v.bijJou.length && v.verborgen ? '<p class="zacht">Alleen te zien bij diensten die je hebt verborgen.</p>' : ''}
    ${datum}
    ${link ? `<a class="alle-opties" href="${link}" target="_blank" rel="noopener">Alle opties en links ↗</a>` : ''}
    ${JUSTWATCH}`;
}

// Elke keer dat je een titel opent, worden de diensten ververst (die veranderen geregeld).
// Lukt dat niet, bijvoorbeeld zonder internet, dan blijft de laatst bekende informatie staan.
async function verversDiensten(titel, bewaar, nr) {
  const vak = () => (nr === schermNr ? document.getElementById('diensten') : null);
  if (!leesSleutel()) {
    if (vak()) vak().innerHTML = dienstenHtml(titel);
    return;
  }
  try {
    const diensten = await haalDiensten(titel.soort, titel.tmdbId);
    await bewaar({ diensten, dienstenOp: vandaag() });
  } catch {
    // Geen verbinding of TMDB doet even niet mee: dan de bewaarde versie.
  }
  if (vak()) vak().innerHTML = dienstenHtml(titel);
}

// --- Trailer en acteurs ---

function extraHtml(titel) {
  const trailer = titel.trailer ? veiligeUrl(`https://www.youtube.com/watch?v=${encodeURIComponent(titel.trailer)}`) : '';
  const acteurs = titel.acteurs ?? [];
  return `
    ${
      trailer
        ? `<div class="trailer" id="trailer">
             <button class="trailer-voorplaat" id="trailer-start" aria-label="Speel de trailer af">
               ${titel.achtergrond ? `<img src="${veiligeUrl(posterUrl(titel.achtergrond, 'w780'))}" alt="" loading="lazy" />` : ''}
               <span class="trailer-speel" aria-hidden="true"></span>
               <span class="trailer-tekst">Trailer</span>
             </button>
           </div>
           <a class="trailer-link" href="${trailer}" target="_blank" rel="noopener">Open in YouTube ↗</a>`
        : ''
    }
    ${
      acteurs.length
        ? `<p class="label">Acteurs</p>
           <ul class="acteurs">${acteurs
             .map((a) => {
               const foto = veiligeUrl(posterUrl(a.foto, 'w185'));
               return `<li><a class="acteur" href="#/acteur/${a.id}">
                 ${foto ? `<img src="${foto}" alt="" loading="lazy" />` : `<span class="acteur-leeg" aria-hidden="true">${veilig(a.naam.slice(0, 1))}</span>`}
                 <strong>${veilig(a.naam)}</strong>
                 ${a.rol ? `<span>${veilig(a.rol)}</span>` : ''}
               </a></li>`;
             })
             .join('')}</ul>`
        : ''
    }`;
}

// De trailer speelt in de pagina, via de privacyvriendelijke variant van YouTube (zonder
// volgcookies). Pas na je tik maakt de app contact met YouTube. Blokkeert de maker afspelen
// buiten YouTube, dan staat er een foutmelding in beeld en is er de link 'Open in YouTube'.
function speelTrailer(key) {
  const vak = document.getElementById('trailer');
  if (!vak || !/^[\w-]{6,20}$/.test(key)) return;
  const src = `https://www.youtube-nocookie.com/embed/${key}?autoplay=1&playsinline=1&rel=0&hl=nl&cc_lang_pref=nl`;
  vak.classList.add('speelt');
  vak.innerHTML = `<iframe src="${src}" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

// Trailer en acteurs veranderen zelden: ophalen als ze er nog niet zijn, en verder eens per maand.
const EXTRA_VERVERS_DAGEN = 30;

async function verversExtra(titel, bewaar, nr) {
  if (!leesSleutel()) return;
  // Titels van vóór de voorplaat (zonder 'achtergrond') worden één keer extra bijgewerkt.
  // Series van vóór stap 15 (zonder seizoenen) ook.
  const compleet = 'achtergrond' in titel && (titel.soort !== 'serie' || 'seizoenen' in titel);
  if (titel.extraOp && compleet && dagenSinds(new Date(titel.extraOp)) < EXTRA_VERVERS_DAGEN) return;
  try {
    await bewaar({ ...(await haalTrailerEnActeurs(titel.soort, titel.tmdbId)), extraOp: vandaag() });
  } catch {
    return; // Geen verbinding: dan de volgende keer.
  }
  if (nr !== schermNr) return;
  document.getElementById('extra').innerHTML = extraHtml(titel);
  toonTitel.tekenVoortgang?.();
}

// --- Sport ---

async function toonSport() {
  const nr = schermNr;
  app.innerHTML = `
    <header class="kop"><h1>Sport</h1></header>
    <section class="sport-blok">
      <h2>Formule 1</h2>
      <p class="zender"><strong>Live bij ${veilig(F1_ZENDERS.live)}</strong><br />${veilig(F1_ZENDERS.extra)}</p>
      <div id="f1"><p class="bezig">Schema ophalen…</p></div>
    </section>
  `;
  let schema;
  try {
    schema = await haalF1();
  } catch {
    if (nr === schermNr) document.getElementById('f1').innerHTML = '<p class="leeg">Het schema ophalen lukt nu niet. Heb je internet?</p>';
    return;
  }
  if (nr !== schermNr) return;
  const komend = komendeRaces(schema.races);
  const [volgende, ...rest] = komend;
  document.getElementById('f1').innerHTML = volgende
    ? `
      <div class="race-volgend">
        <p class="race-ronde">Ronde ${volgende.ronde} · eerstvolgende</p>
        <h3>${veilig(volgende.naam)}</h3>
        <p class="zacht">${veilig([volgende.plaats, volgende.land].filter(Boolean).join(', '))}</p>
        <ul class="sessies">${volgende.sessies
          .map((x) => `<li class="${x.naam === 'Race' ? 'is-race' : ''}"><span>${veilig(x.naam)}</span><span>${veilig(nlTijd(x))}</span></li>`)
          .join('')}</ul>
      </div>
      ${
        rest.length
          ? `<p class="label sport-label">Rest van het seizoen</p>
             <ul class="races">${rest
               .map((r) => `<li><span class="race-nr">${r.ronde}</span><span class="race-naam">${veilig(r.naam)}</span><span class="race-dag">${veilig(nlTijd(r.sessies.at(-1)))}</span></li>`)
               .join('')}</ul>`
          : ''
      }
      <p class="bron">Alle tijden in Nederlandse tijd. Schema van Jolpica F1; zenders gecontroleerd in ${veilig(F1_ZENDERS.gecontroleerd)}.</p>`
    : '<p class="leeg">Het seizoen zit erop. Het schema voor volgend jaar verschijnt hier zodra het bekend is.</p>';
}

// --- Eén acteur ---

// Wat al opgehaald is blijft bewaard zolang de app open is, zodat 'terug' meteen werkt.
const acteurGeladen = new Map();
let acteurScroll = 0;

async function toonActeur(id, { terugNaarPlek = false } = {}) {
  const nr = schermNr;
  if (!leesSleutel()) {
    location.hash = '#/instellingen';
    return;
  }
  const terug = '<header class="kop"><button class="terug" id="terug">‹ Terug</button></header>';
  const koppelTerug = () => document.getElementById('terug').addEventListener('click', () => history.back());
  let acteur = acteurGeladen.get(id);
  if (!acteur) {
    app.innerHTML = `${terug}<p class="bezig">Ophalen…</p>`;
    koppelTerug();
    try {
      acteur = await haalActeur(id);
      acteurGeladen.set(id, acteur);
    } catch (fout) {
      if (nr !== schermNr) return;
      document.querySelector('.bezig').outerHTML =
        fout instanceof SleutelFout
          ? '<p class="leeg">TMDB accepteert je sleutel niet. <a href="#/instellingen">Plak hem opnieuw</a>.</p>'
          : '<p class="leeg">Ophalen lukt nu niet. Heb je internet?</p>';
      return;
    }
  }
  const opLijst = new Map((await alleTitels()).map((t) => [titelSleutel(t), t]));
  if (nr !== schermNr) return;

  const foto = veiligeUrl(posterUrl(acteur.foto, 'w185'));
  const jaar = acteur.geboren.slice(0, 4);
  app.innerHTML = `
    ${terug}
    <section class="acteur-kop">
      ${foto ? `<img src="${foto}" alt="" />` : `<span class="acteur-leeg groot" aria-hidden="true">${veilig(acteur.naam.slice(0, 1))}</span>`}
      <h2>${veilig(acteur.naam)}</h2>
      ${jaar || acteur.plaats ? `<p class="zacht">${[jaar && `Geboren in ${veilig(jaar)}`, acteur.plaats && veilig(acteur.plaats)].filter(Boolean).join(' · ')}</p>` : ''}
    </section>
    <p class="label acteur-label">Speelde in</p>
    ${
      acteur.rollen.length
        ? `${rasterHtml(acteur.rollen, opLijst, (t) => [t.jaar, t.rol].filter(Boolean).map(veilig).join(' · ') || '&nbsp;')}${BRON}`
        : '<p class="leeg">Geen films of series gevonden.</p>'
    }
  `;
  koppelTerug();
  app.querySelectorAll('.raster-titel').forEach((knop) =>
    knop.addEventListener('click', () => {
      acteurScroll = window.scrollY;
      const t = acteur.rollen[Number(knop.dataset.i)];
      toonBevestigen(t, opLijst.get(titelSleutel(t)), { naam: acteur.naam, toon: () => toonActeur(id, { terugNaarPlek: true }) });
    })
  );
  if (terugNaarPlek) window.scrollTo(0, acteurScroll);
}

// --- Eén titel van je lijst ---

async function toonTitel(id) {
  const nr = schermNr;
  const titel = await haalTitel(id);
  if (nr !== schermNr) return;
  if (!titel) {
    location.hash = '#/';
    return;
  }
  const bewaar = async (wijzigingen) => {
    Object.assign(titel, wijzigingen);
    await titelBijwerken(id, wijzigingen);
  };

  app.innerHTML = `
    <header class="kop">
      <a class="terug" href="#/">‹ Mijn lijst</a>
      <button class="link-knop deel-knop" id="samen" aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l4 4-1.4 1.4L13 6.8V15h-2V6.8L9.4 8.4 8 7zM5 11h3v2H7v6h10v-6h-1v-2h3v10H5z" /></svg>
        Samen kijken
      </button>
    </header>
    <section class="samen" id="samen-vak" hidden>
      <p class="samen-kop">Nodig iemand uit</p>
      <p class="zacht">Stel eventueel een dag en tijd voor. Je verstuurt het bericht zelf, via WhatsApp, Berichten of mail.</p>
      <div class="samen-wanneer">
        <label>Dag<input type="date" id="samen-datum" min="${vandaag()}" /></label>
        <label>Tijd<input type="time" id="samen-tijd" step="300" /></label>
      </div>
      <p class="samen-voorbeeld" id="samen-voorbeeld"></p>
      <button class="hoofdknop" id="samen-deel">Deel uitnodiging</button>
    </section>
    <section class="bevestig">
      ${posterHtml(titel, 'poster-groot')}
      <h2>${veilig(titel.titel)}</h2>
      <p>${soortJaar(titel)}${titel.origineel && titel.origineel !== titel.titel ? ` · ${veilig(titel.origineel)}` : ''}</p>
      ${titel.beschrijving ? `<p class="beschrijving">${veilig(titel.beschrijving)}</p>` : ''}

      <div id="extra">${extraHtml(titel)}</div>

      <p class="label">Waar kijken</p>
      <div id="diensten" class="diensten">${dienstenHtml(titel, true)}</div>

      <p class="label">Status</p>
      <div class="keuzes" id="statussen">
        ${STATUSSEN.map((s) => `<button class="keuze" data-s="${s}">${s}</button>`).join('')}
      </div>
      <div id="voortgang"></div>

      <p class="label">Mijn oordeel</p>
      <div class="sterren" id="sterren" role="radiogroup" aria-label="Sterren"></div>

      <p class="label">Gezien op</p>
      <div class="datum-regel">
        <input type="date" id="kijkdatum" value="${veilig(titel.kijkdatum)}" max="${vandaag()}" aria-label="Kijkdatum" />
        <button class="link-knop" id="datum-weg"${titel.kijkdatum ? '' : ' hidden'}>Wissen</button>
      </div>
      <p class="zacht datum-tekst" id="datum-tekst">${titel.kijkdatum ? veilig(datumTekst(titel.kijkdatum)) : 'Nog niet ingevuld'}</p>

      <p class="label">Notitie</p>
      <textarea id="notitie" rows="4" placeholder="Bijvoorbeeld: tip van …, of wat je ervan vond">${veilig(titel.notitie)}</textarea>
      <p class="opgeslagen" id="opgeslagen">&nbsp;</p>

      <button class="verwijder" id="verwijder">Verwijder van mijn lijst</button>
    </section>
  `;

  const tekenStatus = () =>
    document.querySelectorAll('#statussen .keuze').forEach((k) => k.classList.toggle('actief', k.dataset.s === titel.status));
  const tekenSterren = () => {
    document.getElementById('sterren').innerHTML = [1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<button class="ster${titel.sterren >= n ? ' aan' : ''}" data-n="${n}" role="radio" aria-checked="${titel.sterren === n}" aria-label="${n} ${n === 1 ? 'ster' : 'sterren'}">★</button>`
      )
      .join('');
  };
  const tekenDatum = () => {
    document.getElementById('kijkdatum').value = titel.kijkdatum;
    document.getElementById('datum-weg').hidden = !titel.kijkdatum;
    document.getElementById('datum-tekst').textContent = titel.kijkdatum ? datumTekst(titel.kijkdatum) : 'Nog niet ingevuld';
  };
  tekenStatus();
  tekenSterren();
  // Je hebt de titel bekeken: dan is het 'nieuw'-label niet meer nodig.
  if (titel.nieuwBij?.length) bewaar({ nieuwBij: [] });
  verversDiensten(titel, bewaar, nr);
  verversExtra(titel, bewaar, nr);
  document.getElementById('extra').addEventListener('click', (e) => {
    if (e.target.closest('#trailer-start')) speelTrailer(titel.trailer);
  });

  document.getElementById('statussen').addEventListener('click', async (e) => {
    const knop = e.target.closest('.keuze');
    if (!knop || knop.dataset.s === titel.status) return;
    const wijziging = statusWijziging(titel, knop.dataset.s);
    if (titel.soort === 'serie' && knop.dataset.s === 'Bezig' && !titel.voortgang) wijziging.voortgang = beginVoortgang();
    await bewaar(wijziging);
    tekenStatus();
    tekenDatum();
    tekenVoortgang();
  });

  // Waar ben je? Alleen bij series die je aan het kijken bent.
  const tekenVoortgang = () => {
    const vak = document.getElementById('voortgang');
    if (titel.soort !== 'serie' || titel.status !== 'Bezig') {
      vak.innerHTML = '';
      return;
    }
    const v = titel.voortgang ?? beginVoortgang();
    const seizoenen = titel.seizoenen ?? [];
    const dit = seizoenen.find((x) => x.nr === v.seizoen);
    const volgende = volgendeAflevering(v, seizoenen);
    const opties = (van, tot, gekozen) =>
      Array.from({ length: tot - van + 1 }, (_, i) => van + i)
        .map((n) => `<option value="${n}"${n === gekozen ? ' selected' : ''}>${n}</option>`)
        .join('');
    vak.innerHTML = `
      <p class="label">Waar ben je?</p>
      <p class="voortgang-nu">${
        v.aflevering
          ? `Seizoen ${v.seizoen} · aflevering ${v.aflevering}${dit ? ` van ${dit.afleveringen}` : ''}`
          : `Seizoen ${v.seizoen} · nog niet begonnen`
      }</p>
      ${
        volgende
          ? `<button class="hoofdknop" id="volgende">✓ ${volgende.seizoen !== v.seizoen ? `Seizoen ${volgende.seizoen}, aflevering 1` : `Aflevering ${volgende.aflevering}`} gezien</button>`
          : `<div class="klaar"><p>Je hebt alle afleveringen gezien.</p><button class="hoofdknop" id="naar-gezien">Zet op Gezien</button></div>`
      }
      <div class="voortgang-kies">
        <label>Seizoen ${
          seizoenen.length
            ? `<select id="v-seizoen">${seizoenen.map((x) => `<option value="${x.nr}"${x.nr === v.seizoen ? ' selected' : ''}>${x.nr}</option>`).join('')}</select>`
            : `<input id="v-seizoen" type="number" inputmode="numeric" min="1" value="${v.seizoen}" />`
        }</label>
        <label>Aflevering ${
          dit
            ? `<select id="v-aflevering">${opties(0, dit.afleveringen, v.aflevering)}</select>`
            : `<input id="v-aflevering" type="number" inputmode="numeric" min="0" value="${v.aflevering}" />`
        }</label>
      </div>`;
    document.getElementById('volgende')?.addEventListener('click', async () => {
      await bewaar({ voortgang: volgende });
      tekenVoortgang();
    });
    document.getElementById('naar-gezien')?.addEventListener('click', async () => {
      await bewaar(statusWijziging(titel, 'Gezien'));
      tekenStatus();
      tekenDatum();
      tekenVoortgang();
      melding('Op Gezien gezet. Geef hem nog sterren?');
    });
    const kies = async () => {
      const seizoen = Math.max(1, parseInt(document.getElementById('v-seizoen').value, 10) || 1);
      const max = seizoenen.find((x) => x.nr === seizoen)?.afleveringen ?? Infinity;
      // Ander seizoen gekozen: dan begin je daar bij aflevering 0.
      const aflevering = seizoen !== v.seizoen ? 0 : Math.min(max, Math.max(0, parseInt(document.getElementById('v-aflevering').value, 10) || 0));
      await bewaar({ voortgang: { seizoen, aflevering } });
      tekenVoortgang();
    };
    document.getElementById('v-seizoen').addEventListener('change', kies);
    document.getElementById('v-aflevering').addEventListener('change', kies);
  };
  tekenVoortgang();
  toonTitel.tekenVoortgang = tekenVoortgang;

  document.getElementById('sterren').addEventListener('click', async (e) => {
    const knop = e.target.closest('.ster');
    if (!knop) return;
    const n = Number(knop.dataset.n);
    // Nog een keer op dezelfde ster tikken haalt het oordeel weg.
    await bewaar({ sterren: titel.sterren === n ? 0 : n });
    tekenSterren();
  });

  document.getElementById('kijkdatum').addEventListener('change', async (e) => {
    await bewaar({ kijkdatum: e.target.value });
    tekenDatum();
  });
  document.getElementById('datum-weg').addEventListener('click', async () => {
    await bewaar({ kijkdatum: '' });
    tekenDatum();
  });

  // De notitie bewaart vanzelf, kort nadat je stopt met typen.
  const notitie = document.getElementById('notitie');
  const opgeslagen = document.getElementById('opgeslagen');
  let timer;
  const bewaarNotitie = async () => {
    clearTimeout(timer);
    if (notitie.value === titel.notitie) return;
    await bewaar({ notitie: notitie.value });
    opgeslagen.textContent = 'Opgeslagen';
  };
  notitie.addEventListener('input', () => {
    opgeslagen.innerHTML = '&nbsp;';
    clearTimeout(timer);
    timer = setTimeout(bewaarNotitie, 800);
  });
  notitie.addEventListener('blur', bewaarNotitie);
  toonTitel.bewaarOpenstaand = bewaarNotitie;

  // Samen kijken: de uitnodiging met de diensten zoals je ze nu ziet (eigen abonnementen eerst).
  const samenVak = document.getElementById('samen-vak');
  const samenKnop = document.getElementById('samen');
  const uitnodiging = () =>
    uitnodigingTekst(titel, {
      datum: document.getElementById('samen-datum').value,
      tijd: document.getElementById('samen-tijd').value,
      verdeeld: titel.diensten ? verdeelDiensten(titel.diensten, leesKeuzes()) : null,
    });
  const toonVoorbeeld = () => (document.getElementById('samen-voorbeeld').textContent = uitnodiging());
  samenKnop.addEventListener('click', () => {
    samenVak.hidden = !samenVak.hidden;
    samenKnop.setAttribute('aria-expanded', String(!samenVak.hidden));
    if (!samenVak.hidden) toonVoorbeeld();
  });
  samenVak.addEventListener('input', toonVoorbeeld);
  document.getElementById('samen-deel').addEventListener('click', async () => {
    try {
      const uitkomst = await deel(uitnodiging());
      if (uitkomst === 'gekopieerd') melding('Tekst gekopieerd. Plak hem waar je wilt.');
      if (uitkomst === 'gedeeld') {
        samenVak.hidden = true;
        samenKnop.setAttribute('aria-expanded', 'false');
      }
    } catch {
      melding('Delen lukt hier niet');
    }
  });

  document.getElementById('verwijder').addEventListener('click', async () => {
    await bewaarNotitie();
    const kopie = { ...titel };
    await titelVerwijderen(id);
    toonTitel.bewaarOpenstaand = null;
    location.hash = '#/';
    melding(`"${kopie.titel}" verwijderd`, {
      tekst: 'Ongedaan maken',
      actie: async () => {
        await titelTerugzetten(kopie);
        if (location.hash === '#/' || location.hash === '') route();
      },
    });
  });
}

// --- Instellingen ---

const MEER_NA = 15;

// Licht of donker. Het wisselen zelf gebeurt in thema.js, dat al laadt vóór de app.
const WEERGAVEN = { avond: "Donker 's avonds", iphone: 'Zoals mijn iPhone', licht: 'Altijd licht', donker: 'Altijd donker' };

function weergave() {
  return onthoud('weergave', 'avond', Object.keys(WEERGAVEN));
}

// Korte stand onder het ingeklapte blok, zodat je zonder openklappen ziet wat je hebt gekozen.
function dienstenStand() {
  const k = Object.values(leesKeuzes());
  const abo = k.filter((x) => x === 'abonnement').length;
  const weg = k.filter((x) => x === 'verbergen').length;
  if (!abo && !weg) return 'Nog niets gekozen';
  return [abo && `${abo} ${abo === 1 ? 'abonnement' : 'abonnementen'}`, weg && `${weg} verborgen`].filter(Boolean).join(' · ');
}

async function toonDienstenKeuze(nr) {
  const vak = () => (nr === schermNr ? document.getElementById('diensten-keuze') : null);
  let alle;
  try {
    alle = await haalAlleDiensten();
  } catch {
    if (vak()) vak().innerHTML = '<p class="zacht">Diensten ophalen lukt nu niet. Heb je internet?</p>';
    return;
  }
  if (!vak()) return;
  const keuzes = leesKeuzes();
  // Wat je al gekozen hebt staat altijd in beeld, ook als de dienst verder onderaan staat.
  const gekozen = (d) => keuzeVan(keuzes, d.id) !== 'tonen';
  const boven = alle.filter((d, i) => i < MEER_NA || gekozen(d));
  const onder = alle.filter((d, i) => i >= MEER_NA && !gekozen(d));
  const regel = (d) => `
    <li class="dienst-keuze" data-id="${d.id}">
      <span class="dienst-naam">${logoHtml(d)}${veilig(d.naam)}</span>
      <span class="keuzes klein">${Object.entries(KEUZES)
        .map(([k, naam]) => `<button class="keuze${keuzeVan(keuzes, d.id) === k ? ' actief' : ''}" data-keuze="${k}">${naam}</button>`)
        .join('')}</span>
    </li>`;
  vak().innerHTML = `
    <div class="alles-knoppen">
      <button class="keuze" data-alles="verbergen">Verberg alles behalve mijn abonnementen</button>
      <button class="keuze" data-alles="tonen">Toon alles</button>
    </div>
    <ul class="diensten-lijst">${boven.map(regel).join('')}</ul>
    ${
      onder.length
        ? `<details class="meer-diensten"><summary>Nog ${onder.length} diensten</summary><ul class="diensten-lijst">${onder.map(regel).join('')}</ul></details>`
        : ''
    }`;
  vak().addEventListener('click', (e) => {
    const alles = e.target.closest('[data-alles]');
    if (alles) {
      zetAlleKeuzes(alle.map((d) => d.id), alles.dataset.alles);
      const nu = leesKeuzes();
      vak().querySelectorAll('.dienst-keuze').forEach((li) =>
        li.querySelectorAll('.keuze').forEach((k) => k.classList.toggle('actief', k.dataset.keuze === keuzeVan(nu, Number(li.dataset.id))))
      );
      document.getElementById('diensten-stand').textContent = dienstenStand();
      melding(alles.dataset.alles === 'verbergen' ? 'Alles verborgen behalve je abonnementen' : 'Alle diensten worden weer getoond');
      return;
    }
    const knop = e.target.closest('[data-keuze]');
    if (!knop) return;
    const li = knop.closest('.dienst-keuze');
    zetKeuze(Number(li.dataset.id), knop.dataset.keuze);
    li.querySelectorAll('.keuze').forEach((k) => k.classList.toggle('actief', k === knop));
    document.getElementById('diensten-stand').textContent = dienstenStand();
  });
}

function backupTekst() {
  const laatste = laatsteBackup();
  if (!laatste) return 'Nog geen backup gemaakt.';
  const dagen = dagenSinds(laatste);
  const wanneer = dagen === 0 ? 'vandaag' : dagen === 1 ? 'gisteren' : `${dagen} dagen geleden`;
  return `Laatste backup: ${laatste.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })} (${wanneer}).`;
}

const aantalTekst = (n) => (n === 1 ? '1 titel' : `${n} titels`);

async function toonInstellingen() {
  const nr = schermNr;
  const sleutel = leesSleutel();
  const aantal = (await alleTitels()).length;
  if (nr !== schermNr) return;
  app.innerHTML = `
    <header class="kop"><h1>Instellingen</h1></header>

    <section class="blok">
      <h2>Backup</h2>
      <p>Je lijst staat alleen op deze telefoon. Bewaar regelmatig een backup in je Google Drive: kies in het deelmenu de <b>Drive</b>-app, of <b>Bewaar in Bestanden</b> en dan Google Drive.</p>
      <p class="zacht" id="backup-status">${backupTekst()}</p>
      <button class="hoofdknop" id="backup-maken"${aantal ? '' : ' disabled'}>Backup maken</button>
      <label class="tweede-knop bestand-knop">Backup terugzetten
        <input type="file" id="backup-bestand" accept="application/json,.json" hidden />
      </label>
      <div id="terugzet-vak"></div>
      <p class="zacht klein">Je TMDB-sleutel zit niet in de backup. Op een nieuwe telefoon plak je hem opnieuw.</p>
    </section>

    <section class="blok">
      <h2>Mijn diensten</h2>
      <p>Kies per streamingdienst: <b>Abonnement</b> als je hem hebt, <b>Tonen</b> om hem bij een titel te zien, of <b>Verbergen</b> als hij je niet interesseert.</p>
      ${
        sleutel
          ? `<details class="uitklap" id="diensten-uitklap">
               <summary><span class="uitklap-kop">Diensten aanpassen</span><span class="zacht uitklap-stand" id="diensten-stand">${veilig(dienstenStand())}</span></summary>
               <div id="diensten-keuze"><p class="zacht">Diensten ophalen…</p></div>
             </details>`
          : '<p class="zacht">Stel eerst hieronder je TMDB-sleutel in.</p>'
      }
      ${
        sleutel
          ? `<p class="zacht klein">Eén keer per dag kijkt de app of titels op Wil ik zien nieuw bij je abonnementen te zien zijn. Je ziet dat bovenaan Mijn lijst.</p>
             <button class="tweede-knop" id="nieuw-nu">Nu controleren</button>
             <p class="zacht klein" id="nieuw-uitkomst" hidden></p>`
          : ''
      }
    </section>

    <section class="blok">
      <h2>Weergave</h2>
      <div class="keuzes" id="weergave">
        ${Object.entries(WEERGAVEN)
          .map(([k, naam]) => `<button class="keuze${k === weergave() ? ' actief' : ''}" data-weergave="${k}">${naam}</button>`)
          .join('')}
      </div>
      <p class="zacht klein">Donker 's avonds: van 20:00 tot 7:00 donker, en altijd als je iPhone op donker staat.</p>
    </section>

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

  // De lijst met diensten pas ophalen als je het blok openklapt.
  document.getElementById('diensten-uitklap')?.addEventListener(
    'toggle',
    (e) => {
      if (e.target.open) toonDienstenKeuze(nr);
    },
    { once: true }
  );

  document.getElementById('nieuw-nu')?.addEventListener('click', async (e) => {
    const knop = e.currentTarget;
    const uitkomst = document.getElementById('nieuw-uitkomst');
    knop.disabled = true;
    knop.textContent = 'Controleren…';
    const n = await controleerNieuw({ nu: true });
    knop.disabled = false;
    knop.textContent = 'Nu controleren';
    uitkomst.hidden = false;
    uitkomst.textContent =
      n === null
        ? 'Kies eerst hierboven bij Diensten aanpassen welke abonnementen je hebt.'
        : n
          ? `${n === 1 ? '1 titel is' : `${n} titels zijn`} nieuw bij je diensten. Kijk bovenaan Mijn lijst.`
          : 'Niets nieuws: je titels op Wil ik zien staan nog bij dezelfde diensten.';
  });

  document.getElementById('weergave').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-weergave]');
    if (!knop) return;
    bewaarKeuze('weergave', knop.dataset.weergave);
    window.kijkThema?.toepassen();
    document.querySelectorAll('#weergave .keuze').forEach((k) => k.classList.toggle('actief', k === knop));
  });

  // Eerst klaarmaken, dan bewaren: het deelmenu van de iPhone moet direct na een tik openen.
  const maakKnop = document.getElementById('backup-maken');
  let bestand = null;
  maakKnop.addEventListener('click', async () => {
    if (!bestand) {
      maakKnop.disabled = true;
      maakKnop.textContent = 'Backup klaarmaken…';
      try {
        bestand = await maakBackupBestand();
      } catch {
        bestand = null;
        maakKnop.disabled = false;
        maakKnop.textContent = 'Backup maken';
        melding('Backup klaarmaken lukte niet. Probeer het nog eens.');
        return;
      }
      maakKnop.disabled = false;
      maakKnop.textContent = `Bewaar backup (${aantalTekst(aantal)})`;
      return;
    }
    try {
      if (await bewaarBackup(bestand)) {
        bestand = null; // volgende keer weer een verse backup
        maakKnop.textContent = 'Backup maken';
        document.getElementById('backup-status').textContent = backupTekst();
        melding('Backup bewaard');
      }
    } catch {
      melding('Bewaren lukte niet. Probeer het nog eens.');
    }
  });

  document.getElementById('backup-bestand').addEventListener('change', async (e) => {
    const gekozen = e.target.files?.[0];
    e.target.value = '';
    if (!gekozen) return;
    const vak = document.getElementById('terugzet-vak');
    let inhoud;
    try {
      inhoud = await leesBackup(gekozen);
    } catch (fout) {
      vak.innerHTML = `<div class="waarschuwing"><p>${veilig(fout.message)}</p></div>`;
      return;
    }
    const gemaakt = new Date(inhoud.gemaakt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    const kop = `<strong>Backup van ${veilig(gemaakt)} met ${aantalTekst(inhoud.titels.length)}</strong><br />`;
    // Terugzetten vervangt alles. Staat er al een lijst, dan eerst nu een backup daarvan
    // (in het afgelopen kwartier), zodat een verkeerd gekozen bestand nooit werk kost.
    const laatste = laatsteBackup();
    if (aantal > 0 && (!laatste || Date.now() - laatste > 15 * 60000)) {
      vak.innerHTML = `
        <div class="waarschuwing">
          <p>${kop}Terugzetten vervangt je huidige lijst van ${aantalTekst(aantal)}. Maak daarom eerst hierboven een backup van je huidige lijst (Backup maken, dan Bewaar backup) en kies daarna dit bestand opnieuw.</p>
          <button class="link-knop" id="annuleer">Sluiten</button>
        </div>`;
      document.getElementById('annuleer').addEventListener('click', () => (vak.innerHTML = ''));
      return;
    }
    vak.innerHTML = `
      <div class="waarschuwing">
        <p>${kop}${aantal ? `Je huidige lijst van ${aantalTekst(aantal)} wordt hierdoor <b>vervangen</b>.` : 'Je lijst is nu leeg.'}</p>
        <button class="gevaar-knop" id="terugzetten">${aantal ? 'Ja, vervang mijn lijst' : 'Terugzetten'}</button>
        <button class="link-knop" id="annuleer">Annuleren</button>
      </div>`;
    document.getElementById('annuleer').addEventListener('click', () => (vak.innerHTML = ''));
    document.getElementById('terugzetten').addEventListener('click', async (k) => {
      k.currentTarget.disabled = true;
      k.currentTarget.textContent = 'Bezig met terugzetten…';
      try {
        const n = await zetBackupTerug(inhoud);
        // Keuzes uit de backup (tab, sortering) meteen gebruiken.
        tab = onthoud('tab', 'Alles', TABS);
        soort = onthoud('soort', 'alle', Object.keys(SOORTEN));
        sortering = onthoud('sortering', 'toegevoegd', Object.keys(SORTERINGEN));
        window.kijkThema?.toepassen();
        location.hash = '#/';
        melding(`${aantalTekst(n)} teruggezet`);
      } catch {
        vak.innerHTML = '<div class="waarschuwing"><p>Terugzetten is mislukt. Je lijst is niet veranderd.</p></div>';
      }
    });
  });

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
      location.hash = '#/zoek';
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
    route();
  });
}

// --- Schermen ---

async function route() {
  schermNr += 1;
  // Een notitie die nog niet bewaard is, eerst opslaan.
  if (toonTitel.bewaarOpenstaand) {
    await toonTitel.bewaarOpenstaand();
    toonTitel.bewaarOpenstaand = null;
  }
  window.scrollTo(0, 0);
  const titelId = location.hash.match(/^#\/titel\/(\d+)$/);
  const acteurId = location.hash.match(/^#\/acteur\/(\d+)$/);
  const plek = { '#/zoek': 'zoek', '#/ontdekken': 'ontdekken', '#/sport': 'sport', '#/instellingen': 'instellingen' }[location.hash] || 'lijst';
  document.querySelectorAll('.balk a').forEach((a) => a.classList.toggle('actief', a.dataset.plek === plek));
  if (plek === 'instellingen') toonInstellingen();
  else if (plek === 'zoek') toonZoek();
  else if (plek === 'ontdekken') toonOntdekken();
  else if (plek === 'sport') toonSport();
  else if (titelId) toonTitel(Number(titelId[1]));
  else if (acteurId) toonActeur(Number(acteurId[1]));
  else toonLijst();
}

// Gaat de app naar de achtergrond, dan een half getypte notitie meteen bewaren.
const bewaarNu = () => toonTitel.bewaarOpenstaand?.();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') bewaarNu();
});
window.addEventListener('pagehide', bewaarNu);

vraagBlijvendeOpslag();

// Titels van vóór stap 11 hebben nog geen acteurs (en trailer). Die vult de app op de
// achtergrond aan, één voor één, zodat zoeken op acteur voor je hele lijst werkt.
// Alleen deze gegevens worden toegevoegd; je eigen status, sterren en notities blijven zoals ze zijn.
async function vulActeursAan() {
  if (!leesSleutel()) return;
  const zonder = (await alleTitels()).filter((t) => !t.extraOp);
  for (const t of zonder.slice(0, 100)) {
    try {
      await titelBijwerken(t.id, { ...(await haalTrailerEnActeurs(t.soort, t.tmdbId)), extraOp: vandaag() });
    } catch {
      return; // Geen internet of sleutel geweigerd: de volgende keer verder.
    }
    await new Promise((klaar) => setTimeout(klaar, 300)); // rustig aan richting TMDB
  }
}
setTimeout(async () => {
  await vulActeursAan();
  await controleerNieuw();
}, 3000);

window.addEventListener('hashchange', route);
route();
