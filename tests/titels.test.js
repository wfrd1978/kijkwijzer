import { describe, expect, it } from 'vitest';
import {
  nieuweTitel, titelSleutel, STATUSSEN, statusWijziging, vandaag, datumTekst, filterTitels, sorteerTitels, dubbelTekst,
} from '../src/titels.js';

describe('nieuweTitel', () => {
  it('neemt de gegevens over en zet de status op Wil ik zien', () => {
    const t = nieuweTitel(
      { tmdbId: 1, soort: 'film', titel: 'Dune', origineel: 'Dune', jaar: '2021', poster: '/a.jpg', beschrijving: 'Zand.' },
      new Date('2026-10-26T12:00:00Z')
    );
    expect(t).toEqual({
      tmdbId: 1, soort: 'film', titel: 'Dune', origineel: 'Dune', jaar: '2021', poster: '/a.jpg', beschrijving: 'Zand.',
      status: 'Wil ik zien', sterren: 0, kijkdatum: '', notitie: '', toegevoegdOp: '2026-10-26T12:00:00.000Z',
    });
    expect(STATUSSEN[0]).toBe('Wil ik zien');
  });
  it('vult ontbrekende velden leeg in', () => {
    expect(nieuweTitel({ tmdbId: 2, soort: 'serie', titel: 'Thuis' })).toMatchObject({ jaar: '', poster: '', beschrijving: '' });
  });
});

describe('titelSleutel', () => {
  it('maakt onderscheid tussen film en serie met hetzelfde nummer', () => {
    expect(titelSleutel({ soort: 'film', tmdbId: 5 })).not.toBe(titelSleutel({ soort: 'serie', tmdbId: 5 }));
  });
});

describe('statusWijziging', () => {
  const nu = new Date(2026, 9, 26);
  it('zet de kijkdatum op vandaag bij Gezien zonder datum', () => {
    expect(statusWijziging({ kijkdatum: '' }, 'Gezien', nu)).toEqual({ status: 'Gezien', kijkdatum: '2026-10-26' });
  });
  it('laat een bestaande kijkdatum staan', () => {
    expect(statusWijziging({ kijkdatum: '2025-01-02' }, 'Gezien', nu)).toEqual({ status: 'Gezien' });
  });
  it('verandert bij andere statussen alleen de status', () => {
    expect(statusWijziging({ kijkdatum: '' }, 'Bezig', nu)).toEqual({ status: 'Bezig' });
  });
});

describe('vandaag en datumTekst', () => {
  it('schrijft de datum met voorloopnullen', () => {
    expect(vandaag(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('maakt een leesbare datum', () => {
    expect(datumTekst('2026-10-26')).toBe('26 oktober 2026');
    expect(datumTekst('')).toBe('');
  });
});

const lijst = [
  { titel: 'Amélie', origineel: "Le Fabuleux Destin d'Amélie Poulain", soort: 'film', status: 'Gezien', sterren: 5, kijkdatum: '2024-03-01', notitie: '', toegevoegdOp: '2026-01-01T00:00:00Z' },
  { titel: 'Thuis', origineel: '', soort: 'serie', status: 'Bezig', sterren: 0, kijkdatum: '', notitie: 'Tip van de buren', toegevoegdOp: '2026-03-01T00:00:00Z' },
  { titel: 'Dune', origineel: 'Dune', soort: 'film', status: 'Wil ik zien', sterren: 0, kijkdatum: '', notitie: '', toegevoegdOp: '2026-02-01T00:00:00Z' },
  { titel: 'Borgen', origineel: 'Borgen', soort: 'serie', status: 'Gezien', sterren: 5, kijkdatum: '2025-06-01', notitie: '', toegevoegdOp: '2025-12-01T00:00:00Z' },
];
const namen = (l) => l.map((t) => t.titel);

describe('filterTitels', () => {
  it('filtert op status en soort', () => {
    expect(namen(filterTitels(lijst, { tab: 'Gezien' }))).toEqual(['Amélie', 'Borgen']);
    expect(namen(filterTitels(lijst, { tab: 'Gezien', soort: 'serie' }))).toEqual(['Borgen']);
    expect(filterTitels(lijst)).toHaveLength(4);
  });
  it('zoekt zonder accenten en hoofdletters, ook in de notitie', () => {
    expect(namen(filterTitels(lijst, { zoek: 'AMELIE' }))).toEqual(['Amélie']);
    expect(namen(filterTitels(lijst, { zoek: 'poulain' }))).toEqual(['Amélie']);
    expect(namen(filterTitels(lijst, { zoek: 'tip buren' }))).toEqual(['Thuis']);
    expect(filterTitels(lijst, { zoek: 'matrix' })).toHaveLength(0);
  });
});

describe('sorteerTitels', () => {
  it('sorteert op laatst toegevoegd', () => {
    expect(namen(sorteerTitels(lijst))).toEqual(['Thuis', 'Dune', 'Amélie', 'Borgen']);
  });
  it('sorteert op titel, met accenten op de goede plek', () => {
    expect(namen(sorteerTitels(lijst, 'titel'))).toEqual(['Amélie', 'Borgen', 'Dune', 'Thuis']);
  });
  it('sorteert op sterren en bij gelijkspel op titel', () => {
    expect(namen(sorteerTitels(lijst, 'sterren'))).toEqual(['Amélie', 'Borgen', 'Dune', 'Thuis']);
  });
  it('sorteert op laatst gezien, titels zonder datum achteraan', () => {
    expect(namen(sorteerTitels(lijst, 'gezien'))).toEqual(['Borgen', 'Amélie', 'Dune', 'Thuis']);
  });
  it('laat de originele lijst ongemoeid', () => {
    sorteerTitels(lijst, 'titel');
    expect(lijst[0].titel).toBe('Amélie');
    expect(lijst[1].titel).toBe('Thuis');
  });
});

describe('dubbelTekst', () => {
  it('noemt de kijkdatum als je hem gezien hebt', () => {
    expect(dubbelTekst({ status: 'Gezien', kijkdatum: '2024-03-01' })).toBe('Staat al op je lijst · Gezien op 1 maart 2024');
  });
  it('noemt anders de status', () => {
    expect(dubbelTekst({ status: 'Wil ik zien', kijkdatum: '' })).toBe('Staat al op je lijst · Wil ik zien');
    expect(dubbelTekst({ status: 'Gezien', kijkdatum: '' })).toBe('Staat al op je lijst · Gezien');
  });
});
