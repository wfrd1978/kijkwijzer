import { describe, expect, it } from 'vitest';
import { nieuweTitel, titelSleutel, STATUSSEN, statusWijziging, vandaag, datumTekst } from '../src/titels.js';

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
