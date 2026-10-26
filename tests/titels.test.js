import { describe, expect, it } from 'vitest';
import { nieuweTitel, titelSleutel, STATUSSEN } from '../src/titels.js';

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
