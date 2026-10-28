import { describe, expect, it } from 'vitest';
import { kiesKijktips, weekDagen, weekTekst } from '../src/vandaag.js';

const netflix = { id: 8, naam: 'Netflix', logo: '' };
const leeg = { abonnement: [], gratis: [], huren: [], kopen: [] };
const titel = (naam, extra = {}) => ({ titel: naam, status: 'Wil ik zien', toegevoegdOp: `2026-10-0${naam.length % 9}T00:00:00Z`, diensten: { ...leeg, abonnement: [netflix] }, ...extra });

describe('kiesKijktips', () => {
  const keuzes = { 8: 'abonnement' };
  it('alleen Wil ik zien, bij jouw diensten, niet al bij Verder kijken', () => {
    const lijst = [
      titel('Dune'),
      titel('Amélie', { status: 'Gezien' }),
      titel('Borgen', { voortgang: { seizoen: 1, aflevering: 2 } }),
      titel('Elders', { diensten: { ...leeg, huren: [netflix] } }),
      titel('Zonder', { diensten: undefined }),
    ];
    const tips = kiesKijktips(lijst, keuzes, '2026-10-28');
    expect(tips.map((k) => k.titel.titel)).toEqual(['Dune']);
    expect(tips[0].dienst.naam).toBe('Netflix');
  });
  it('zonder abonnementen geen tips', () => {
    expect(kiesKijktips([titel('Dune')], {}, '2026-10-28')).toEqual([]);
  });
  it('nieuw bij jouw diensten eerst, en elke dag een andere volgorde', () => {
    const lijst = [titel('A'), titel('BB'), titel('CCC', { nieuwBij: [netflix] })];
    const vandaag = kiesKijktips(lijst, keuzes, '2026-10-28').map((k) => k.titel.titel);
    const morgen = kiesKijktips(lijst, keuzes, '2026-10-29').map((k) => k.titel.titel);
    expect(vandaag[0]).toBe('CCC');
    expect(morgen[0]).toBe('CCC');
    expect(vandaag.slice(1)).not.toEqual(morgen.slice(1));
  });
});

describe('weekDagen', () => {
  it('maandag tot en met zondag', () => {
    expect(weekDagen('2026-10-28')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(weekDagen('2026-11-01')[0]).toBe('2026-10-26');
    expect(weekDagen('2026-10-26')[6]).toBe('2026-11-01');
  });
  it('als tekst', () => {
    expect(weekTekst(weekDagen('2026-10-28'))).toBe('Maandag 26 okt – zondag 1 nov');
  });
});
