// Regels voor titels op je lijst, los van de opslag (zodat ze makkelijk te testen zijn).

export const STATUSSEN = ['Wil ik zien', 'Bezig', 'Gezien'];

// Van een zoekresultaat naar een titel op je lijst. Nieuwe titels staan op 'Wil ik zien'.
export function nieuweTitel(t, nu = new Date()) {
  return {
    tmdbId: t.tmdbId,
    soort: t.soort,
    titel: t.titel,
    origineel: t.origineel ?? '',
    jaar: t.jaar ?? '',
    poster: t.poster ?? '',
    beschrijving: t.beschrijving ?? '',
    status: STATUSSEN[0],
    sterren: 0,
    kijkdatum: '',
    notitie: '',
    toegevoegdOp: nu.toISOString(),
  };
}

// Sleutel om een titel uniek te herkennen: een film en een serie kunnen hetzelfde nummer hebben.
export function titelSleutel(t) {
  return `${t.soort}:${t.tmdbId}`;
}

// Datum van vandaag als 'jjjj-mm-dd', in de tijd van de telefoon.
export function vandaag(nu = new Date()) {
  const twee = (n) => String(n).padStart(2, '0');
  return `${nu.getFullYear()}-${twee(nu.getMonth() + 1)}-${twee(nu.getDate())}`;
}

// Wat er verandert als je een andere status kiest. Zet je iets op 'Gezien' zonder kijkdatum,
// dan wordt dat vandaag (je kunt hem daarna gewoon aanpassen).
export function statusWijziging(titel, status, nu = new Date()) {
  const wijziging = { status };
  if (status === 'Gezien' && !titel.kijkdatum) wijziging.kijkdatum = vandaag(nu);
  return wijziging;
}

// '2026-10-26' wordt '26 oktober 2026'.
export function datumTekst(iso) {
  const [j, m, d] = String(iso).split('-').map(Number);
  if (!j || !m || !d) return '';
  return new Date(j, m - 1, d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// --- Zoeken, filteren en sorteren in je lijst ---

// Kleine letters en zonder accenten, zodat 'Amelie' ook 'Amélie' vindt.
export function kaal(tekst) {
  return (tekst || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export const TABS = ['Alles', ...STATUSSEN];
export const SOORTEN = { alle: 'Films en series', film: 'Films', serie: 'Series' };
export const SORTERINGEN = {
  toegevoegd: 'Laatst toegevoegd',
  gezien: 'Laatst gezien',
  sterren: 'Sterren',
  titel: 'Titel',
};

// Zoekt in titel, originele titel en notitie (zo vind je ook 'tip van …').
export function filterTitels(titels, { tab = 'Alles', soort = 'alle', zoek = '' } = {}) {
  const woorden = kaal(zoek).split(/\s+/).filter(Boolean);
  return titels.filter((t) => {
    if (tab !== 'Alles' && t.status !== tab) return false;
    if (soort !== 'alle' && t.soort !== soort) return false;
    const tekst = kaal(`${t.titel} ${t.origineel} ${t.notitie}`);
    return woorden.every((w) => tekst.includes(w));
  });
}

const opTitel = (a, b) => a.titel.localeCompare(b.titel, 'nl', { sensitivity: 'base' });

export function sorteerTitels(titels, sortering = 'toegevoegd') {
  const kopie = [...titels];
  if (sortering === 'titel') return kopie.sort(opTitel);
  // Bij gelijke sterren of zonder kijkdatum: op titel, zodat de volgorde vast blijft.
  if (sortering === 'sterren') return kopie.sort((a, b) => (b.sterren || 0) - (a.sterren || 0) || opTitel(a, b));
  if (sortering === 'gezien') return kopie.sort((a, b) => (b.kijkdatum || '').localeCompare(a.kijkdatum || '') || opTitel(a, b));
  return kopie.sort((a, b) => b.toegevoegdOp.localeCompare(a.toegevoegdOp));
}

// De tekst van de dubbel-waarschuwing: 'Staat al op je lijst · Gezien op 26 oktober 2026'.
export function dubbelTekst(t) {
  if (t.status === 'Gezien' && t.kijkdatum) return `Staat al op je lijst · Gezien op ${datumTekst(t.kijkdatum)}`;
  return `Staat al op je lijst · ${t.status}`;
}

// --- Controle van titels uit een backup ---

const SOORT_TITEL = ['film', 'serie'];
const DATUM = /^\d{4}-\d{2}-\d{2}$/;

function schoneDiensten(d) {
  if (!d || typeof d !== 'object') return null;
  const lijst = (l) =>
    Array.isArray(l)
      ? l
          .filter((x) => x && Number.isInteger(x.id) && typeof x.naam === 'string')
          .map((x) => ({ id: x.id, naam: x.naam, logo: typeof x.logo === 'string' ? x.logo : '' }))
      : [];
  return { abonnement: lijst(d.abonnement), gratis: lijst(d.gratis), huren: lijst(d.huren), kopen: lijst(d.kopen), link: typeof d.link === 'string' ? d.link : '' };
}

function schoneActeurs(l) {
  if (!Array.isArray(l)) return [];
  return l
    .filter((a) => a && Number.isInteger(a.id) && typeof a.naam === 'string')
    .slice(0, 15)
    .map((a) => ({ id: a.id, naam: a.naam, rol: typeof a.rol === 'string' ? a.rol : '', foto: /^\/[\w.-]+$/.test(a.foto ?? '') ? a.foto : '' }));
}

// Controleert een titel uit een backup en zet hem in de vaste vorm. Onbekende velden vallen weg,
// verkeerde gegevens worden leeg. Zonder titel, TMDB-nummer of soort: een fout.
export function normaliseerTitel(t) {
  if (!t || typeof t !== 'object') throw new Error('Ongeldige titel in de backup.');
  const titel = typeof t.titel === 'string' ? t.titel.trim() : '';
  if (!titel || !Number.isInteger(t.tmdbId) || !SOORT_TITEL.includes(t.soort)) {
    throw new Error('Er staat een onvolledige titel in de backup.');
  }
  const tekst = (v) => (typeof v === 'string' ? v : '');
  return {
    ...(Number.isInteger(t.id) && t.id > 0 ? { id: t.id } : {}),
    tmdbId: t.tmdbId,
    soort: t.soort,
    titel,
    origineel: tekst(t.origineel),
    jaar: /^\d{4}$/.test(t.jaar) ? t.jaar : '',
    poster: /^\/[\w.-]+$/.test(t.poster ?? '') ? t.poster : '',
    beschrijving: tekst(t.beschrijving),
    status: STATUSSEN.includes(t.status) ? t.status : STATUSSEN[0],
    sterren: Number.isInteger(t.sterren) && t.sterren >= 0 && t.sterren <= 5 ? t.sterren : 0,
    kijkdatum: DATUM.test(t.kijkdatum ?? '') ? t.kijkdatum : '',
    notitie: tekst(t.notitie),
    toegevoegdOp: typeof t.toegevoegdOp === 'string' && !isNaN(Date.parse(t.toegevoegdOp)) ? t.toegevoegdOp : new Date().toISOString(),
    ...(DATUM.test(t.dienstenOp ?? '') ? { dienstenOp: t.dienstenOp, diensten: schoneDiensten(t.diensten) } : {}),
    ...(DATUM.test(t.extraOp ?? '') ? { extraOp: t.extraOp, trailer: /^[\w-]{6,20}$/.test(t.trailer ?? '') ? t.trailer : '', acteurs: schoneActeurs(t.acteurs), achtergrond: /^\/[\w.-]+$/.test(t.achtergrond ?? '') ? t.achtergrond : '' } : {}),
  };
}
