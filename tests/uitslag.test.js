import { describe, expect, it } from 'vitest';
import { naarUitslag, voorbijeSessies, haalF1Uitslag } from '../src/uitslag.js';

const coureur = (pos, voornaam, achternaam, code, nat, team, extra) => ({ position: String(pos), Driver: { givenName: voornaam, familyName: achternaam, code, nationality: nat }, Constructor: { constructorId: team, name: team }, ...extra });
const antwoord = (lijst, sleutel = 'QualifyingResults') => ({ MRData: { RaceTable: { Races: [{ round: '21', raceName: 'Las Vegas Grand Prix', Circuit: { Location: { locality: 'Las Vegas' } }, [sleutel]: lijst }] } } });

describe('F1-uitslag', () => {
  it('kwalificatie: naam, afkorting, vlag, teamkleur en tijd met komma', () => {
    const u = naarUitslag(antwoord([coureur(1, 'Andrea Kimi', 'Antonelli', 'ANT', 'Italian', 'mercedes', { Q3: '1:33.893' }), coureur(2, 'Max', 'Verstappen', 'VER', 'Dutch', 'red_bull', { Q3: '1:34.151' })]), 'Kwalificatie');
    expect(u).toMatchObject({ soort: 'Kwalificatie', plaats: 'Las Vegas', ronde: 21 });
    expect(u.coureurs[0]).toMatchObject({ positie: 1, naam: 'A. Antonelli', code: 'ANT', vlag: '🇮🇹', kleur: '#27f4d2', tijd: '1:33,893' });
    expect(u.coureurs[1].vlag).toBe('🇳🇱');
  });
  it('race: winnaarstijd, verschil, ronden achter en uitgevallen', () => {
    const u = naarUitslag(antwoord([
      coureur(1, 'Lando', 'Norris', 'NOR', 'British', 'mclaren', { Time: { time: '1:35:23.504' }, status: 'Finished' }),
      coureur(2, 'Max', 'Verstappen', 'VER', 'Dutch', 'red_bull', { Time: { time: '+14.602' }, status: 'Finished' }),
      coureur(3, 'X', 'Y', 'XYZ', 'Thai', 'williams', { status: '+1 Lap' }),
      coureur(4, 'A', 'B', 'ABC', 'Danish', 'haas', { status: 'Engine' }),
    ], 'Results'), 'Race');
    expect(u.coureurs.map((c) => c.tijd)).toEqual(['1:35:23,504', '+14,602', '+1 ronde', 'Uitgevallen']);
  });
  it('nog geen uitslag: null; dan de sessie daarvoor', async () => {
    expect(naarUitslag(antwoord([]), 'Race')).toBeNull();
    const races = [{ ronde: 21, sessies: [{ naam: 'Kwalificatie', start: '2026-11-21T04:00:00Z' }, { naam: 'Race', start: '2026-11-22T04:00:00Z' }] }, { ronde: 20, sessies: [{ naam: 'Race', start: '2026-11-08T17:00:00Z' }] }];
    const nu = new Date('2026-11-21T10:00:00Z');
    expect(voorbijeSessies(races, nu).map((s) => `${s.ronde}${s.soort}`)).toEqual(['21Kwalificatie', '20Race']);
    globalThis.localStorage = { getItem: () => null, setItem: () => {} };
    const gevraagd = [];
    const fetcher = async (url) => {
      gevraagd.push(url.split('/f1/')[1]);
      return { ok: true, json: async () => (url.includes('/21/') ? antwoord([]) : antwoord([coureur(1, 'Lando', 'Norris', 'NOR', 'British', 'mclaren', { Time: { time: '1:35:23.504' } })], 'Results')) };
    };
    const u = await haalF1Uitslag(races, { fetcher, nu });
    expect(u.soort).toBe('Race');
    expect(gevraagd).toEqual(['2026/21/qualifying.json?limit=30', '2026/20/results.json?limit=30']);
    delete globalThis.localStorage;
  });
});

import { wikiTitel, haalCoureurFotos } from '../src/uitslag.js';
describe("foto's van coureurs", () => {
  it('alleen vrije foto met maker en licentie; zonder licentie geen foto', async () => {
    expect(wikiTitel('http://en.wikipedia.org/wiki/Max_Verstappen')).toBe('Max Verstappen');
    const opslag = new Map();
    globalThis.localStorage = { getItem: (k) => opslag.get(k) ?? null, setItem: (k, v) => opslag.set(k, v) };
    const fetcher = async (url) => ({
      json: async () =>
        url.includes('pageimages')
          ? { query: { pages: { 1: { title: 'Max Verstappen', pageimage: 'Max.jpg', thumbnail: { source: 'https://upload.wikimedia.org/max.jpg' } }, 2: { title: 'Lando Norris', pageimage: 'Lando.jpg', thumbnail: { source: 'https://upload.wikimedia.org/lando.jpg' } }, 3: { title: 'Isack Hadjar' } } } }
          : { query: { pages: { 1: { title: 'File:Max.jpg', imageinfo: [{ extmetadata: { Artist: { value: '<a href="x">Stepro</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] }, 2: { title: 'File:Lando.jpg', imageinfo: [{ extmetadata: {} }] } } } },
    });
    const f = await haalCoureurFotos(['Max Verstappen', 'Lando Norris', 'Isack Hadjar'], { fetcher });
    expect(Object.keys(f)).toEqual(['Max Verstappen']);
    expect(f['Max Verstappen']).toMatchObject({ foto: 'https://upload.wikimedia.org/max.jpg', maker: 'Stepro', licentie: 'CC BY-SA 4.0' });
    delete globalThis.localStorage;
  });
});
