// Zoek op maat: van keuzes en een korte omschrijving naar een zoekvraag voor TMDB,
// en daarna de uitkomsten wegen met je eigen oordeel. Zonder AI: vaste regels, zodat
// je ziet wat de app heeft begrepen. Los van de schermen, zodat het te testen is.
import { kaal } from './titels.js';

// Sfeer in gewone woorden, met de genres van TMDB (films en series hebben deels andere nummers).
export const SFEREN = {
  grappig: { naam: 'Grappig', film: [35], serie: [35] },
  spannend: { naam: 'Spannend', film: [53], serie: [9648, 80] },
  ontroerend: { naam: 'Ontroerend', film: [18], serie: [18] },
  avontuur: { naam: 'Avontuur', film: [12], serie: [10759] },
  animatie: { naam: 'Animatie', film: [16], serie: [16] },
  fantasie: { naam: 'Fantasie', film: [14], serie: [10765] },
  scifi: { naam: 'Sciencefiction', film: [878], serie: [10765] },
  misdaad: { naam: 'Misdaad', film: [80], serie: [80] },
  romantisch: { naam: 'Romantisch', film: [10749], serie: [18] },
  waargebeurd: { naam: 'Waargebeurd', film: [], serie: [], woord: 'based on true story' },
  docu: { naam: 'Documentaire', film: [99], serie: [99] },
  eng: { naam: 'Eng', film: [27], serie: [9648] },
  geschiedenis: { naam: 'Geschiedenis', film: [36, 10752], serie: [10768] },
};

export const SOORT_KEUZES = { beide: 'Allebei', film: 'Film', serie: 'Serie' };
export const VOOR_WIE = { iedereen: 'Maakt niet uit', kinderen: 'Met kinderen', volwassenen: 'Volwassenen' };
export const PERIODES = { altijd: 'Maakt niet uit', nieuw: 'Nieuw', recent: 'Laatste 10 jaar', klassiek: 'Klassieker' };

// Woorden die de app in een omschrijving herkent. Een woord telt als het woord in de tekst
// begint met deze letters ('kinderfilm' begint met 'kinder').
const WOORDEN = [
  [['kind', 'kinder', 'kids', 'gezin', 'familie', 'ouders', 'meekijken'], { kinderen: true }],
  [['volwassen'], { volwassenen: true }],
  [['animatie', 'tekenfilm', 'animated', 'pixar', 'disney'], { sfeer: 'animatie' }],
  [['grappig', 'komedie', 'lachen', 'humor', 'comedy', 'luchtig'], { sfeer: 'grappig' }],
  [['spannend', 'spanning', 'thriller', 'zinderend'], { sfeer: 'spannend' }],
  [['eng', 'horror', 'griezel'], { sfeer: 'eng' }],
  [['ontroerend', 'drama', 'emotioneel', 'huilen', 'tranen', 'mooi verhaal'], { sfeer: 'ontroerend' }],
  [['avontuur', 'actie'], { sfeer: 'avontuur' }],
  [['fantasie', 'fantasy', 'magie', 'magisch', 'tover', 'sprookje'], { sfeer: 'fantasie' }],
  [['scifi', 'sciencefiction', 'science fiction', 'ruimte', 'toekomst'], { sfeer: 'scifi' }],
  [['misdaad', 'detective', 'moord', 'politie', 'crime'], { sfeer: 'misdaad' }],
  [['romantisch', 'romantiek', 'liefde', 'romcom'], { sfeer: 'romantisch' }],
  [['waargebeurd', 'echt gebeurd', 'waar gebeurd', 'biografie'], { sfeer: 'waargebeurd' }],
  [['documentaire', 'docu'], { sfeer: 'docu' }],
  [['oorlog', 'geschiedenis', 'historisch'], { sfeer: 'geschiedenis' }],
  [['nieuw', 'recent'], { periode: 'nieuw' }],
  [['klassieker', 'oud'], { periode: 'klassiek' }],
  [['serie'], { soort: 'serie' }],
  [['film', 'kinderfilm', 'tekenfilm', 'animatiefilm', 'speelfilm'], { soort: 'film' }],
  // Onderwerpen: zoekwoorden van TMDB (Engels).
  [['kerst'], { woord: 'christmas' }],
  [['superheld'], { woord: 'superhero' }],
  [['dinosaur'], { woord: 'dinosaur' }],
  [['robot'], { woord: 'robot' }],
  [['zombie'], { woord: 'zombie' }],
  [['vampier'], { woord: 'vampire' }],
  [['overval', 'heist'], { woord: 'heist' }],
  [['voetbal'], { woord: 'soccer' }],
  [['wielren'], { woord: 'cycling' }],
  [['formule 1', 'formule1', 'f1'], { woord: 'formula 1' }],
  [['sport'], { woord: 'sports' }],
  [['dier'], { woord: 'animal' }],
  [['hond'], { woord: 'dog' }],
  [['paard'], { woord: 'horse' }],
  [['school'], { woord: 'high school' }],
  [['tijdreis'], { woord: 'time travel' }],
  [['spion', 'geheim agent'], { woord: 'spy' }],
  [['politiek', 'verkiezing'], { woord: 'politics' }],
  [['muziek', 'musical', 'zingen'], { woord: 'musical' }],
];

// Wat de app uit een omschrijving haalt. 'zoals Toy Story' geeft een titel om op te lijken.
export function leesOmschrijving(tekst) {
  const t = kaal(tekst).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const uit = { sferen: [], woorden: [], kinderen: false, volwassenen: false, periode: '', soort: '', zoals: '' };
  if (!t) return uit;
  const zoals = t.match(/\b(?:zoals|lijkt op)\s+(.+)$/);
  if (zoals) uit.zoals = zoals[1].trim();
  const rest = zoals ? t.slice(0, zoals.index) : t;
  const woorden = rest.split(' ');
  const komtVoor = (w) => (w.includes(' ') ? ` ${rest} `.includes(` ${w}`) : woorden.some((x) => x.startsWith(w) && (w.length > 3 || x === w)));
  for (const [lijst, wat] of WOORDEN) {
    if (!lijst.some(komtVoor)) continue;
    if (wat.kinderen) uit.kinderen = true;
    if (wat.volwassenen) uit.volwassenen = true;
    if (wat.sfeer && !uit.sferen.includes(wat.sfeer)) uit.sferen.push(wat.sfeer);
    if (wat.woord && !uit.woorden.includes(wat.woord)) uit.woorden.push(wat.woord);
    if (wat.periode && !uit.periode) uit.periode = wat.periode;
    if (wat.soort && !uit.soort) uit.soort = wat.soort;
  }
  return uit;
}

// Keuzes en omschrijving samen. Wat je aantikt gaat voor wat in de tekst staat.
export function maakVraag(keuzes, tekst = '') {
  const o = leesOmschrijving(tekst);
  const sferen = [...new Set([...(keuzes.sferen ?? []), ...o.sferen])].filter((s) => s in SFEREN);
  const voorWie = keuzes.voorWie && keuzes.voorWie !== 'iedereen' ? keuzes.voorWie : o.kinderen ? 'kinderen' : o.volwassenen ? 'volwassenen' : 'iedereen';
  const soort = keuzes.soort && keuzes.soort !== 'beide' ? keuzes.soort : o.soort || 'beide';
  const periode = keuzes.periode && keuzes.periode !== 'altijd' ? keuzes.periode : o.periode || 'altijd';
  const woorden = [...new Set([...o.woorden, ...sferen.map((s) => SFEREN[s].woord).filter(Boolean)])];
  return { soorten: soort === 'beide' ? ['film', 'serie'] : [soort], sferen, voorWie, periode, woorden, zoalsTekst: o.zoals };
}

const KINDER_GENRES = [16, 10751, 10762];

// Genres per soort voor de vraag aan TMDB.
export function genresVoor(vraag, soort) {
  return [...new Set(vraag.sferen.flatMap((s) => SFEREN[s][soort]))];
}

// Datums voor 'hoe nieuw', als jjjj-mm-dd.
export function periodeGrenzen(periode, nu = new Date()) {
  const jaren = (n) => new Date(Date.UTC(nu.getUTCFullYear() - n, nu.getUTCMonth(), nu.getUTCDate())).toISOString().slice(0, 10);
  if (periode === 'nieuw') return { vanaf: jaren(2) };
  if (periode === 'recent') return { vanaf: jaren(10) };
  if (periode === 'klassiek') return { tot: jaren(20) };
  return {};
}

// Wat je goed en slecht vond, als genres: 4 of 5 sterren telt voor, 1 of 2 sterren of Gestopt tegen.
export function smaakUitOordeel(titels, genresVan) {
  const goed = new Map();
  const slecht = new Map();
  for (const t of titels) {
    const g = genresVan(t) ?? [];
    if (t.sterren >= 4) for (const x of g) goed.set(x, (goed.get(x) ?? 0) + 1);
    // Gestopt zegt ook iets: dat telt als 'slecht', tenzij je hem toch 4 of 5 sterren gaf (hierboven).
    else if (t.status === 'Gestopt' || (t.status === 'Gezien' && t.sterren >= 1 && t.sterren <= 2)) for (const x of g) slecht.set(x, (slecht.get(x) ?? 0) + 1);
  }
  // Een genre dat je vaker goed dan slecht vond, telt niet als slecht.
  for (const [x, n] of slecht) if ((goed.get(x) ?? 0) >= n) slecht.delete(x);
  return { goed, slecht };
}

// Alle kandidaten wegen en de beste eerst. Elke kandidaat: { ...titel, genreIds, score, stemmen, bron }.
// bron: 'zoals' (lijkt op je voorbeeld), 'woord' (past bij een onderwerp) of 'genre'.
export function weegUitkomsten(kandidaten, vraag, { opLijst, smaak, zoals = null, nu = new Date() }) {
  const per = new Map();
  for (const k of kandidaten) {
    const sleutel = `${k.soort}:${k.tmdbId}`;
    const bestaand = per.get(sleutel);
    per.set(sleutel, bestaand ? { ...bestaand, bronnen: new Set([...bestaand.bronnen, k.bron]) } : { ...k, bronnen: new Set([k.bron]) });
  }
  const grenzen = periodeGrenzen(vraag.periode, nu);
  const uit = [];
  for (const [sleutel, k] of per) {
    if (opLijst.has(sleutel)) continue;
    if (zoals && sleutel === `${zoals.soort}:${zoals.tmdbId}`) continue;
    if (!vraag.soorten.includes(k.soort)) continue;
    const g = new Set(k.genreIds ?? []);
    const kinderlijk = KINDER_GENRES.some((x) => g.has(x));
    if (vraag.voorWie === 'kinderen' && (!kinderlijk || g.has(27))) continue;
    if (vraag.voorWie === 'volwassenen' && kinderlijk && !vraag.sferen.includes('animatie')) continue;
    if (grenzen.vanaf && k.jaar && k.jaar < grenzen.vanaf.slice(0, 4)) continue;
    if (grenzen.tot && k.jaar && k.jaar > grenzen.tot.slice(0, 4)) continue;
    const gevraagd = genresVoor(vraag, k.soort);
    const raak = gevraagd.filter((x) => g.has(x)).length;
    // Gevraagde sfeer die helemaal niet klopt (en niet via 'zoals' of een onderwerp kwam): weg.
    if (gevraagd.length && !raak && !k.bronnen.has('zoals') && !k.bronnen.has('woord')) continue;
    let punten = (k.score ?? 6) + Math.min(Math.log10((k.stemmen ?? 0) + 1), 4) * 0.6;
    punten += raak * 1.5;
    if (k.bronnen.has('zoals')) punten += 3;
    if (k.bronnen.has('woord')) punten += 1.5;
    let goed = 0;
    let slecht = 0;
    for (const x of g) {
      if (smaak.goed.has(x)) goed += 1;
      if (smaak.slecht.has(x)) slecht += 1;
    }
    punten += Math.min(goed, 3) * 0.5 - slecht * 1.2;
    uit.push({ ...k, punten, reden: reden(k, { zoals, goed, raak }) });
  }
  return uit.sort((a, b) => b.punten - a.punten);
}

function reden(k, { zoals, goed, raak }) {
  if (k.bronnen.has('zoals') && zoals) return `Lijkt op ${zoals.titel}`;
  if (goed >= 2) return 'Past bij wat je goed vond';
  if (raak) return 'Past bij je keuzes';
  return k.jaar || '';
}

// Wat de app heeft begrepen, in één regel (zodat je ziet waarop gezocht is).
export function begrepen(vraag, zoals) {
  const delen = [];
  if (vraag.soorten.length === 1) delen.push(vraag.soorten[0] === 'film' ? 'Films' : 'Series');
  if (vraag.voorWie !== 'iedereen') delen.push(VOOR_WIE[vraag.voorWie]);
  delen.push(...vraag.sferen.map((s) => SFEREN[s].naam));
  if (vraag.periode !== 'altijd') delen.push(PERIODES[vraag.periode]);
  const onderwerpen = vraag.woorden.filter((w) => !Object.values(SFEREN).some((s) => s.woord === w));
  if (onderwerpen.length) delen.push(`onderwerp: ${onderwerpen.join(', ')}`);
  if (zoals) delen.push(`zoals ${zoals.titel}`);
  return delen.join(' · ');
}
