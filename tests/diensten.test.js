import { describe, expect, it } from 'vitest';
import { verdeelDiensten, doorklikLink, keuzeVan } from '../src/diensten.js';
import { naarDienstenLijst } from '../src/tmdb.js';

const n = { id: 8, naam: 'Netflix', logo: '' };
const v = { id: 72, naam: 'Videoland', logo: '' };
const npo = { id: 1867, naam: 'NPO Start', logo: '' };
const r = { id: 35, naam: 'Rakuten TV', logo: '' };
const a = { id: 2, naam: 'Apple TV', logo: '' };
const titel = { abonnement: [n, v], gratis: [npo], huren: [r, a], kopen: [a], link: '' };
const namen = (l) => l.map((x) => x.naam);

describe('verdeelDiensten', () => {
  it('zet je abonnementen bovenaan en haalt ze uit de rest', () => {
    const d = verdeelDiensten(titel, { 8: 'abonnement', 1867: 'abonnement' });
    expect(namen(d.bijJou)).toEqual(['Netflix', 'NPO Start']);
    expect(namen(d.abonnement)).toEqual(['Videoland']);
    expect(d.gratis).toEqual([]);
  });
  it('laat verborgen diensten weg en meldt dat', () => {
    const d = verdeelDiensten(titel, { 35: 'verbergen', 2: 'verbergen' });
    expect(d.huren).toEqual([]);
    expect(d.kopen).toEqual([]);
    expect(d.verborgen).toBe(true);
  });
  it('toont alles zonder keuzes', () => {
    const d = verdeelDiensten(titel, {});
    expect(d.bijJou).toEqual([]);
    expect(namen(d.huren)).toEqual(['Rakuten TV', 'Apple TV']);
    expect(d.verborgen).toBe(false);
  });
  it('kent alleen bekende keuzes', () => {
    expect(keuzeVan({ 8: 'onzin' }, 8)).toBe('tonen');
  });
});

describe('doorklikLink', () => {
  it('opent Netflix met de titel als zoekterm', () => {
    expect(doorklikLink(n, 'Amélie & co')).toBe('https://www.netflix.com/search?q=Am%C3%A9lie%20%26%20co');
  });
  it('kent ook varianten van een naam', () => {
    expect(doorklikLink({ naam: 'Amazon Prime Video' }, 'Dune')).toContain('primevideo.com');
    expect(doorklikLink({ naam: 'Netflix basic with Ads' }, 'Dune')).toContain('netflix.com');
  });
  it('geeft niets voor een onbekende dienst', () => {
    expect(doorklikLink({ naam: 'Onbekend' }, 'Dune')).toBe('');
  });
});

describe('naarDienstenLijst', () => {
  it('voegt films en series samen, bekendste eerst', () => {
    const films = { results: [{ provider_id: 8, provider_name: 'Netflix', display_priorities: { NL: 1 } }, { provider_id: 2, provider_name: 'Apple TV', display_priorities: { NL: 9 } }] };
    const series = { results: [{ provider_id: 8, provider_name: 'Netflix', display_priorities: { NL: 1 } }, { provider_id: 72, provider_name: 'Videoland', display_priorities: { NL: 3 } }] };
    expect(namen(naarDienstenLijst(films, series))).toEqual(['Netflix', 'Videoland', 'Apple TV']);
  });
});
