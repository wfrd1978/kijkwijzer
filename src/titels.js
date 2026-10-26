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
