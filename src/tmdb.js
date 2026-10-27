// Alles wat met TMDB (The Movie Database) praat. Teksten in het Nederlands waar die er zijn.
import { soortSleutel, leesSleutel } from './sleutel.js';

const BASIS = 'https://api.themoviedb.org/3';
const POSTERS = 'https://image.tmdb.org/t/p/';

// TMDB weigert de sleutel: dan moet je hem in Instellingen opnieuw plakken.
export class SleutelFout extends Error {}

// Bouwt het adres en de kopregels voor één vraag aan TMDB.
export function maakVerzoek(pad, params, sleutel) {
  const url = new URL(BASIS + pad);
  url.searchParams.set('language', 'nl-NL');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers = { accept: 'application/json' };
  if (soortSleutel(sleutel) === 'token') headers.Authorization = `Bearer ${sleutel}`;
  else url.searchParams.set('api_key', sleutel);
  return { url: url.toString(), headers };
}

async function vraag(pad, params = {}, sleutel = leesSleutel()) {
  if (!sleutel) throw new SleutelFout('Geen sleutel');
  const { url, headers } = maakVerzoek(pad, params, sleutel);
  const antwoord = await fetch(url, { headers });
  if (antwoord.status === 401) throw new SleutelFout('Sleutel geweigerd');
  if (!antwoord.ok) throw new Error(`TMDB gaf ${antwoord.status}`);
  return antwoord.json();
}

// Klopt de sleutel? Vraagt TMDB om een kleine controle.
export async function testSleutel(sleutel) {
  await vraag('/authentication', {}, sleutel);
  return true;
}

export function posterUrl(pad, breedte = 'w185') {
  return pad ? POSTERS + breedte + pad : '';
}

// Zet een zoekresultaat van TMDB om naar de vorm die de app gebruikt.
// Personen en andere soorten resultaten vallen weg. Lijsten met maar één soort (zoals
// 'populair bij Netflix') noemen de soort niet per titel; die geef je dan zelf mee.
export function naarTitel(r, standaard) {
  const soort = r.media_type ?? standaard;
  if (soort !== 'movie' && soort !== 'tv') return null;
  return {
    tmdbId: r.id,
    soort: soort === 'movie' ? 'film' : 'serie',
    titel: r.title ?? r.name ?? 'Onbekende titel',
    origineel: r.original_title ?? r.original_name ?? '',
    jaar: (r.release_date ?? r.first_air_date ?? '').slice(0, 4),
    poster: r.poster_path ?? '',
    beschrijving: r.overview ?? '',
  };
}

// Films en series door elkaar, op volgorde van TMDB (meest bekende eerst).
export async function zoekTitels(zoekterm) {
  const data = await vraag('/search/multi', { query: zoekterm, include_adult: 'false' });
  return (data.results ?? []).map(naarTitel).filter(Boolean);
}

// Waar kun je het kijken in Nederland? TMDB krijgt deze gegevens van JustWatch.
// Gratis (met of zonder reclame, zoals NPO Start) komt apart van een betaald abonnement.
export function naarDiensten(nl) {
  if (!nl) return null;
  const lijst = (...soorten) => {
    const gezien = new Set();
    return soorten
      .flatMap((s) => nl[s] ?? [])
      .sort((a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99))
      .filter((d) => !gezien.has(d.provider_id) && gezien.add(d.provider_id))
      .map((d) => ({ id: d.provider_id, naam: d.provider_name, logo: d.logo_path ?? '' }));
  };
  const diensten = { abonnement: lijst('flatrate'), gratis: lijst('free', 'ads'), huren: lijst('rent'), kopen: lijst('buy'), link: nl.link ?? '' };
  return diensten.abonnement.length || diensten.gratis.length || diensten.huren.length || diensten.kopen.length ? diensten : null;
}

export async function haalDiensten(soort, tmdbId) {
  const data = await vraag(`/${soort === 'film' ? 'movie' : 'tv'}/${tmdbId}/watch/providers`);
  return naarDiensten(data.results?.NL);
}

// Alle streamingdiensten die TMDB voor Nederland kent (films en series samen),
// de bekendste eerst.
export function naarDienstenLijst(...lijsten) {
  const per = new Map();
  for (const d of lijsten.flatMap((l) => l?.results ?? [])) {
    const prio = d.display_priorities?.NL ?? d.display_priority ?? 999;
    const bestaand = per.get(d.provider_id);
    if (!bestaand || prio < bestaand.prio) per.set(d.provider_id, { id: d.provider_id, naam: d.provider_name, logo: d.logo_path ?? '', prio });
  }
  return [...per.values()].sort((a, b) => a.prio - b.prio || a.naam.localeCompare(b.naam));
}

export async function haalAlleDiensten() {
  const [films, series] = await Promise.all([
    vraag('/watch/providers/movie', { watch_region: 'NL' }),
    vraag('/watch/providers/tv', { watch_region: 'NL' }),
  ]);
  return naarDienstenLijst(films, series);
}

const TMDB_SOORT = { film: 'movie', serie: 'tv' };

// Wat deze week veel bekeken wordt.
export async function haalTrending(soort, pagina = 1) {
  const s = TMDB_SOORT[soort];
  const data = await vraag(`/trending/${s}/week`, { page: pagina });
  return (data.results ?? []).map((r) => naarTitel(r, s)).filter(Boolean);
}

// Populair bij jouw diensten in Nederland: met abonnement of gratis, niet huren of kopen.
export function dienstenParams(ids, pagina = 1) {
  return {
    watch_region: 'NL',
    with_watch_providers: ids.join('|'),
    with_watch_monetization_types: 'flatrate|free|ads',
    sort_by: 'popularity.desc',
    page: pagina,
  };
}

export async function haalOpDiensten(soort, ids, pagina = 1) {
  const s = TMDB_SOORT[soort];
  const data = await vraag(`/discover/${s}`, dienstenParams(ids, pagina));
  return (data.results ?? []).map((r) => naarTitel(r, s)).filter(Boolean);
}

// Wat TMDB aanraadt bij één titel (zelfde soort: films bij een film, series bij een serie).
export async function haalAanbevelingen(soort, tmdbId) {
  const s = TMDB_SOORT[soort];
  const data = await vraag(`/${s}/${tmdbId}/recommendations`);
  return (data.results ?? []).map((r) => naarTitel(r, s)).filter(Boolean);
}
