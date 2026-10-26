import './style.css';
import { veilig, veiligeUrl } from './veilig.js';
import { soortSleutel, leesSleutel, bewaarSleutel, wisSleutel } from './sleutel.js';
import { zoekTitels, testSleutel, posterUrl, SleutelFout, haalDiensten, haalAlleDiensten } from './tmdb.js';
import { KEUZES, leesKeuzes, zetKeuze, keuzeVan, verdeelDiensten, doorklikLink } from './diensten.js';
import { alleTitels, titelToevoegen, vraagBlijvendeOpslag, haalTitel, titelBijwerken, titelVerwijderen, titelTerugzetten } from './db.js';
import { maakBackupBestand, bewaarBackup, laatsteBackup, dagenSinds, moetHerinneren, herinnerLater, leesBackup, zetBackupTerug } from './backup.js';
import {
  titelSleutel, STATUSSEN, statusWijziging, vandaag, datumTekst,
  TABS, SOORTEN, SORTERINGEN, filterTitels, sorteerTitels, dubbelTekst,
} from './titels.js';

const app = document.getElementById('app');

// Service worker: zorgt dat de app ook zonder internet opent.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
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

function titelRegel(t) {
  return `
      <li><a class="titel" href="#/titel/${t.id}">
        ${posterHtml(t)}
        <div class="titel-tekst">
          <span class="regel">
            <span class="status${t.status === 'Wil ik zien' ? '' : ' status-actief'}">${veilig(t.status)}</span>
            ${t.sterren ? `<span class="sterren-klein" aria-label="${t.sterren} sterren">${sterrenTekst(t.sterren)}</span>` : ''}
          </span>
          <strong>${veilig(t.titel)}</strong>
          <span>${soortJaar(t)}</span>
        </div>
      </a></li>`;
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
    ${moetHerinneren(titels.length) ? herinneringHtml() : ''}
    <nav class="tabs" id="tabs">${TABS.map((t) => `<button class="tab${t === tab ? ' actief' : ''}" data-tab="${t}">${t}</button>`).join('')}</nav>
    <div class="lijst-bediening">
      <input id="lijst-zoek" type="search" placeholder="Zoek in je lijst" value="${veilig(lijstZoek)}" autocomplete="off" enterkeyhint="search" aria-label="Zoek in je lijst" />
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
      ? zichtbaar.map(titelRegel).join('')
      : `<li class="leeg">${
          lijstZoek ? `Niets gevonden voor "${veilig(lijstZoek)}".` : tab === 'Alles' ? `Geen ${SOORTEN[soort].toLowerCase()} op je lijst.` : `Nog niets bij ${veilig(tab)}.`
        }</li>`;
    document.getElementById('aantal').textContent = zichtbaar.length === 1 ? '1 titel' : `${zichtbaar.length} titels`;
  };
  teken();

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
let zoekNr = 0;

function toonZoek() {
  if (!leesSleutel()) {
    location.hash = '#/instellingen';
    return;
  }
  app.innerHTML = `
    ${WOORDMERK}
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
    const titels = await zoekTitels(laatsteZoekterm);
    if (nr !== zoekNr) return; // er is intussen verder getypt
    laatsteResultaten = titels;
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
  vak.innerHTML = laatsteResultaten.length
    ? `<ul class="lijst">${laatsteResultaten
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
function toonBevestigen(t, alOpLijst) {
  window.scrollTo(0, 0);
  app.innerHTML = `
    <header class="kop"><button class="terug" id="terug">‹ Resultaten</button></header>
    <section class="bevestig">
      ${posterHtml(t, 'poster-groot')}
      <h2>${veilig(t.titel)}</h2>
      <p>${soortJaar(t)}${t.origineel && t.origineel !== t.titel ? ` · ${veilig(t.origineel)}` : ''}</p>
      ${t.beschrijving ? `<p class="beschrijving">${veilig(t.beschrijving)}</p>` : ''}
      ${
        alOpLijst
          ? `<div class="dubbel"><p>${veilig(dubbelTekst(alOpLijst))}</p><a class="tweede-knop" href="#/titel/${alOpLijst.id}">Open op mijn lijst</a></div>`
          : '<button class="hoofdknop" id="toevoegen">Zet op mijn lijst</button>'
      }
    </section>
  `;
  document.getElementById('terug').addEventListener('click', toonZoek);
  document.getElementById('toevoegen')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    const { nieuw } = await titelToevoegen(t);
    melding(nieuw ? 'Op je lijst gezet' : 'Stond al op je lijst');
    toonZoek();
  });
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
    <header class="kop"><a class="terug" href="#/">‹ Mijn lijst</a></header>
    <section class="bevestig">
      ${posterHtml(titel, 'poster-groot')}
      <h2>${veilig(titel.titel)}</h2>
      <p>${soortJaar(titel)}${titel.origineel && titel.origineel !== titel.titel ? ` · ${veilig(titel.origineel)}` : ''}</p>
      ${titel.beschrijving ? `<p class="beschrijving">${veilig(titel.beschrijving)}</p>` : ''}

      <p class="label">Waar kijken</p>
      <div id="diensten" class="diensten">${dienstenHtml(titel, true)}</div>

      <p class="label">Status</p>
      <div class="keuzes" id="statussen">
        ${STATUSSEN.map((s) => `<button class="keuze" data-s="${s}">${s}</button>`).join('')}
      </div>

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
  verversDiensten(titel, bewaar, nr);

  document.getElementById('statussen').addEventListener('click', async (e) => {
    const knop = e.target.closest('.keuze');
    if (!knop || knop.dataset.s === titel.status) return;
    await bewaar(statusWijziging(titel, knop.dataset.s));
    tekenStatus();
    tekenDatum();
  });

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
    <ul class="diensten-lijst">${boven.map(regel).join('')}</ul>
    ${
      onder.length
        ? `<details class="meer-diensten"><summary>Nog ${onder.length} diensten</summary><ul class="diensten-lijst">${onder.map(regel).join('')}</ul></details>`
        : ''
    }`;
  vak().addEventListener('click', (e) => {
    const knop = e.target.closest('[data-keuze]');
    if (!knop) return;
    const li = knop.closest('.dienst-keuze');
    zetKeuze(Number(li.dataset.id), knop.dataset.keuze);
    li.querySelectorAll('.keuze').forEach((k) => k.classList.toggle('actief', k === knop));
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
      <div id="diensten-keuze">${sleutel ? '<p class="zacht">Diensten ophalen…</p>' : '<p class="zacht">Stel eerst hieronder je TMDB-sleutel in.</p>'}</div>
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

  if (sleutel) toonDienstenKeuze(nr);

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
  const plek = { '#/zoek': 'zoek', '#/instellingen': 'instellingen' }[location.hash] || 'lijst';
  document.querySelectorAll('.balk a').forEach((a) => a.classList.toggle('actief', a.dataset.plek === plek));
  if (plek === 'instellingen') toonInstellingen();
  else if (plek === 'zoek') toonZoek();
  else if (titelId) toonTitel(Number(titelId[1]));
  else toonLijst();
}

// Gaat de app naar de achtergrond, dan een half getypte notitie meteen bewaren.
const bewaarNu = () => toonTitel.bewaarOpenstaand?.();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') bewaarNu();
});
window.addEventListener('pagehide', bewaarNu);

vraagBlijvendeOpslag();

window.addEventListener('hashchange', route);
route();
