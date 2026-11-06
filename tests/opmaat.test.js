import { describe, expect, it } from 'vitest';
import { leesOmschrijving, maakVraag, weegUitkomsten, smaakUitOordeel, begrepen, periodeGrenzen } from '../src/opmaat.js';

describe('omschrijving lezen', () => {
  it('herkent kinderfilm, animatie en een voorbeeld', () => {
    const o = leesOmschrijving('Een kinderfilm, leuk om mee te kijken als ouders, animatie, zoals Toy Story');
    expect(o.kinderen).toBe(true);
    expect(o.sferen).toEqual(['animatie']);
    expect(o.soort).toBe('film');
    expect(o.zoals).toBe('toy story');
  });
  it('herkent onderwerpen en sfeer', () => {
    const o = leesOmschrijving('spannende serie over een overval, waargebeurd');
    expect(o.sferen).toEqual(['spannend', 'waargebeurd']);
    expect(o.woorden).toEqual(['heist']);
    expect(o.soort).toBe('serie');
  });
  it('korte woorden alleen als heel woord: "eng" niet in "engels"', () => {
    expect(leesOmschrijving('engelse film').sferen).toEqual([]);
    expect(leesOmschrijving('iets engs').sferen).toEqual([]);
    expect(leesOmschrijving('iets eng').sferen).toEqual(['eng']);
  });
});

describe('vraag en wegen', () => {
  const vraag = maakVraag({ soort: 'beide', voorWie: 'iedereen', sferen: [], periode: 'altijd' }, 'kinderfilm animatie');
  it('aangetikte keuzes en tekst samen', () => {
    expect(vraag).toMatchObject({ soorten: ['film'], voorWie: 'kinderen', sferen: ['animatie'] });
    expect(begrepen(vraag, { titel: 'Toy Story' })).toBe('Films · Met kinderen · Animatie · zoals Toy Story');
  });
  it('weegt: lijkt op voorbeeld en je smaak tellen; wat op je lijst staat en horror vallen weg', () => {
    const k = (id, genreIds, bron, extra = {}) => ({ tmdbId: id, soort: 'film', titel: `T${id}`, jaar: '2015', genreIds, score: 7, stemmen: 1000, bron, ...extra });
    const smaak = smaakUitOordeel(
      [{ soort: 'film', tmdbId: 90, sterren: 5, status: 'Gezien' }, { soort: 'film', tmdbId: 91, sterren: 1, status: 'Gezien' }],
      (t) => ({ 90: [16, 35], 91: [16, 18] })[t.tmdbId]
    );
    expect([...smaak.slecht.keys()]).toEqual([18]);
    const uit = weegUitkomsten(
      [k(1, [16, 10751], 'genre'), k(2, [16, 35], 'zoals'), k(3, [16, 27], 'genre'), k(4, [16], 'genre'), k(5, [16, 18], 'genre'), k(6, [28], 'genre')],
      vraag,
      { opLijst: new Set(['film:4']), smaak, zoals: { soort: 'film', tmdbId: 99, titel: 'Toy Story' } }
    );
    expect(uit.map((x) => x.tmdbId)).toEqual([2, 1, 5]);
    expect(uit[0].reden).toBe('Lijkt op Toy Story');
  });
  it('periodes', () => {
    expect(periodeGrenzen('nieuw', new Date('2026-11-06T12:00:00Z'))).toEqual({ vanaf: '2024-11-06' });
    expect(periodeGrenzen('klassiek', new Date('2026-11-06T12:00:00Z'))).toEqual({ tot: '2006-11-06' });
  });
});
