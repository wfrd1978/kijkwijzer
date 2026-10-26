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
