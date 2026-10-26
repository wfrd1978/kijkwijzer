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
// Personen en andere soorten resultaten vallen weg.
export function naarTitel(r) {
  if (r.media_type !== 'movie' && r.media_type !== 'tv') return null;
  return {
    tmdbId: r.id,
    soort: r.media_type === 'movie' ? 'film' : 'serie',
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
