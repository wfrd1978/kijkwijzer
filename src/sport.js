// Sport: schema's van buiten de app (Formule 1 via Jolpica, de gratis opvolger van Ergast).
// De zenders staan hier vast: geen enkele gratis bron geeft ze mee. Bijwerken als de rechten wisselen.

export const F1_ZENDERS = {
  gecontroleerd: 'oktober 2026',
  live: 'Viaplay',
  extra: 'Ziggo Sport: samenvattingen, voorbeschouwingen en Race Café (geen live races)',
};

const SESSIES = [
  ['FirstPractice', 'Vrije training 1'],
  ['SecondPractice', 'Vrije training 2'],
  ['ThirdPractice', 'Vrije training 3'],
  ['SprintQualifying', 'Sprintkwalificatie'],
  ['SprintShootout', 'Sprintkwalificatie'],
  ['Sprint', 'Sprintrace'],
  ['Qualifying', 'Kwalificatie'],
];

// Een datum met (soms ontbrekende) tijd in UTC. Zonder tijd: alleen de dag.
function moment(datum, tijd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum ?? '')) return null;
  return { start: tijd ? `${datum}T${tijd.replace(/Z?$/, 'Z')}` : `${datum}T12:00:00Z`, metTijd: Boolean(tijd) };
}

export function naarRaces(data) {
  return (data?.MRData?.RaceTable?.Races ?? [])
    .map((r) => {
      const race = moment(r.date, r.time);
      if (!race) return null;
      const sessies = SESSIES.map(([sleutel, naam]) => {
        const m = r[sleutel] && moment(r[sleutel].date, r[sleutel].time);
        return m && { naam, ...m };
      }).filter(Boolean);
      return {
        ronde: Number(r.round),
        naam: (r.raceName ?? '').replace(/Grand Prix/, 'GP'),
        plaats: r.Circuit?.Location?.locality ?? '',
        land: r.Circuit?.Location?.country ?? '',
        sessies: [...sessies.sort((a, b) => a.start.localeCompare(b.start)), { naam: 'Race', ...race }],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.ronde - b.ronde);
}

// Races die nog komen of nu bezig zijn (tot drie uur na de start van de race).
export function komendeRaces(races, nu = new Date()) {
  return races.filter((r) => new Date(r.sessies.at(-1).start).getTime() + 3 * 3600000 > nu.getTime());
}

// 'za 31 okt 22:00' in Nederlandse tijd, ook als je telefoon in een andere tijdzone staat.
export function nlTijd(sessie) {
  const d = new Date(sessie.start);
  const dag = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Amsterdam' });
  if (!sessie.metTijd) return dag;
  return `${dag} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}`;
}

const BEWAARD = 'sportF1';

// Het schema wordt bewaard, zodat het ook zonder internet te zien is; eens per dag verversen.
export async function haalF1({ fetcher = fetch } = {}) {
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(BEWAARD) || 'null');
  } catch {
    bewaard = null;
  }
  const vers = bewaard && Date.now() - new Date(bewaard.op).getTime() < 86400000;
  if (vers) return bewaard;
  try {
    const antwoord = await fetcher('https://api.jolpi.ca/ergast/f1/current.json?limit=100');
    if (!antwoord.ok) throw new Error(`Jolpica gaf ${antwoord.status}`);
    const nieuw = { op: new Date().toISOString(), races: naarRaces(await antwoord.json()) };
    try {
      localStorage.setItem(BEWAARD, JSON.stringify(nieuw));
    } catch {
      // Geen opslag: dan volgende keer gewoon opnieuw ophalen.
    }
    return nieuw;
  } catch (fout) {
    if (bewaard) return bewaard; // liever een oud schema dan niets
    throw fout;
  }
}
