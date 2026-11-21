// Uitslagen van de Formule 1 (Jolpica, gratis, zonder sleutel): de nieuwste sessie met een uitslag
// (race, sprint of kwalificatie). Een uitslag verandert niet meer, dus die wordt bewaard.

const BASIS = 'https://api.jolpi.ca/ergast/f1';
const SOORTEN = { Race: 'results', Sprint: 'sprint', Kwalificatie: 'qualifying' };
const LIJST = { Race: 'Results', Sprint: 'SprintResults', Kwalificatie: 'QualifyingResults' };

// Teamkleuren (voor het rondje met de afkorting van de coureur).
export const TEAMKLEUR = {
  mclaren: '#ff8000', red_bull: '#3671c6', ferrari: '#e8002d', mercedes: '#27f4d2', aston_martin: '#229971', alpine: '#00a1e8',
  williams: '#1868db', rb: '#6692ff', haas: '#b6babd', audi: '#bb0a30', sauber: '#52e252', cadillac: '#c8c8c8',
};

// Nationaliteit (zoals Jolpica die noemt) → vlaggetje.
const VLAG = {
  American: '🇺🇸', Argentine: '🇦🇷', Australian: '🇦🇺', Austrian: '🇦🇹', Belgian: '🇧🇪', Brazilian: '🇧🇷', British: '🇬🇧', Bulgarian: '🇧🇬',
  Canadian: '🇨🇦', Chinese: '🇨🇳', Danish: '🇩🇰', Dutch: '🇳🇱', Estonian: '🇪🇪', Finnish: '🇫🇮', French: '🇫🇷', German: '🇩🇪', Italian: '🇮🇹',
  Japanese: '🇯🇵', Mexican: '🇲🇽', Monegasque: '🇲🇨', 'New Zealander': '🇳🇿', Polish: '🇵🇱', Spanish: '🇪🇸', Swedish: '🇸🇪', Swiss: '🇨🇭', Thai: '🇹🇭',
};

const komma = (t) => String(t ?? '').replace('.', ',');

// Tijd of verschil in gewone woorden: '1:33,893', '+14,602', '+1 ronde', 'Uitgevallen'.
function tijdVan(r, soort) {
  if (soort === 'Kwalificatie') return komma(r.Q3 || r.Q2 || r.Q1 || '');
  if (r.Time?.time) return komma(r.Time.time);
  const ronden = String(r.status ?? '').match(/^\+(\d+) Laps?$/i);
  if (ronden) return `+${ronden[1]} ${ronden[1] === '1' ? 'ronde' : 'ronden'}`;
  if (/^Lapped$/i.test(r.status ?? '')) return 'Op ronde';
  return r.status && !/^Finished$/i.test(r.status) ? 'Uitgevallen' : '';
}

// Van het antwoord van Jolpica naar wat de app toont. Null als er (nog) geen uitslag is.
export function naarUitslag(data, soort) {
  const race = data?.MRData?.RaceTable?.Races?.[0];
  const lijst = race?.[LIJST[soort]] ?? [];
  if (!lijst.length) return null;
  return {
    soort,
    ronde: Number(race.round),
    race: race.raceName ?? '',
    plaats: race.Circuit?.Location?.locality ?? '',
    coureurs: lijst.slice(0, 10).map((r) => ({
      positie: Number(r.position),
      naam: `${(r.Driver?.givenName ?? '').slice(0, 1)}. ${r.Driver?.familyName ?? ''}`,
      code: r.Driver?.code ?? (r.Driver?.familyName ?? '').slice(0, 3).toUpperCase(),
      vlag: VLAG[r.Driver?.nationality] ?? '',
      team: r.Constructor?.name ?? '',
      kleur: TEAMKLEUR[r.Constructor?.constructorId] ?? '#888888',
      tijd: tijdVan(r, soort),
    })),
  };
}

// Sessies die voorbij zijn (twee uur na de start), de nieuwste eerst.
export function voorbijeSessies(races, nu = new Date()) {
  return races
    .flatMap((r) => r.sessies.filter((s) => s.naam in SOORTEN).map((s) => ({ ronde: r.ronde, jaar: s.start.slice(0, 4), soort: s.naam, start: s.start })))
    .filter((s) => new Date(s.start).getTime() + 2 * 3600000 < nu.getTime())
    .sort((a, b) => b.start.localeCompare(a.start));
}

// De nieuwste uitslag die er is. Staat de laatste sessie nog niet bij Jolpica (dat duurt soms een paar
// uur), dan de sessie daarvoor.
export async function haalF1Uitslag(races, { fetcher = fetch, nu = new Date() } = {}) {
  for (const s of voorbijeSessies(races, nu).slice(0, 4)) {
    const sleutel = `f1Uitslag:${s.jaar}:${s.ronde}:${s.soort}`;
    try {
      const bewaard = JSON.parse(localStorage.getItem(sleutel) || 'null');
      if (bewaard) return bewaard;
    } catch {
      // geen opslag: gewoon ophalen
    }
    try {
      const antwoord = await fetcher(`${BASIS}/${s.jaar}/${s.ronde}/${SOORTEN[s.soort]}.json?limit=30`);
      if (!antwoord.ok) continue;
      const uitslag = naarUitslag(await antwoord.json(), s.soort);
      if (!uitslag) continue;
      try {
        localStorage.setItem(sleutel, JSON.stringify(uitslag));
      } catch {
        // geen opslag: dan volgende keer opnieuw
      }
      return uitslag;
    } catch {
      return null; // geen internet
    }
  }
  return null;
}
