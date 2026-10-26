import { describe, expect, it } from 'vitest';
import { maakVerzoek, naarTitel, posterUrl, naarDiensten } from '../src/tmdb.js';

describe('maakVerzoek', () => {
  it('zet de korte sleutel in het adres', () => {
    const { url, headers } = maakVerzoek('/search/multi', { query: 'dune' }, '0123456789abcdef0123456789abcdef');
    expect(url).toContain('api_key=0123456789abcdef0123456789abcdef');
    expect(url).toContain('language=nl-NL');
    expect(url).toContain('query=dune');
    expect(headers.Authorization).toBeUndefined();
  });
  it('zet de lange token in de kopregel, niet in het adres', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJ4In0.abc';
    const { url, headers } = maakVerzoek('/search/multi', {}, token);
    expect(url).not.toContain(token);
    expect(headers.Authorization).toBe(`Bearer ${token}`);
  });
});

describe('naarTitel', () => {
  it('zet een film om', () => {
    expect(
      naarTitel({ media_type: 'movie', id: 1, title: 'Dune', original_title: 'Dune', release_date: '2021-09-15', poster_path: '/a.jpg', overview: 'Zand.' })
    ).toEqual({ tmdbId: 1, soort: 'film', titel: 'Dune', origineel: 'Dune', jaar: '2021', poster: '/a.jpg', beschrijving: 'Zand.' });
  });
  it('zet een serie om, ook zonder datum en poster', () => {
    const t = naarTitel({ media_type: 'tv', id: 2, name: 'Thuis' });
    expect(t).toMatchObject({ soort: 'serie', titel: 'Thuis', jaar: '', poster: '' });
  });
  it('laat personen weg', () => {
    expect(naarTitel({ media_type: 'person', id: 3, name: 'Iemand' })).toBe(null);
  });
});

describe('posterUrl', () => {
  it('geeft niets zonder poster', () => {
    expect(posterUrl('')).toBe('');
    expect(posterUrl('/a.jpg')).toBe('https://image.tmdb.org/t/p/w185/a.jpg');
  });
});

describe('naarDiensten', () => {
  const d = (id, naam, prio) => ({ provider_id: id, provider_name: naam, logo_path: `/${id}.jpg`, display_priority: prio });
  it('verdeelt over abonnement, gratis, huren en kopen', () => {
    const uit = naarDiensten({
      link: 'https://www.themoviedb.org/movie/1/watch?locale=NL',
      flatrate: [d(2, 'Videoland', 5), d(8, 'Netflix', 1)],
      ads: [d(1867, 'NPO Start', 3)],
      rent: [d(35, 'Rakuten TV', 2)],
      buy: [d(35, 'Rakuten TV', 2), d(2, 'Apple TV', 4)],
    });
    expect(uit.abonnement.map((x) => x.naam)).toEqual(['Netflix', 'Videoland']);
    expect(uit.gratis).toEqual([{ id: 1867, naam: 'NPO Start', logo: '/1867.jpg' }]);
    expect(uit.huren.map((x) => x.naam)).toEqual(['Rakuten TV']);
    expect(uit.kopen.map((x) => x.naam)).toEqual(['Rakuten TV', 'Apple TV']);
    expect(uit.link).toContain('watch');
  });
  it('telt een dienst die gratis én met reclame staat maar één keer', () => {
    expect(naarDiensten({ free: [d(1, 'A', 1)], ads: [d(1, 'A', 1)] }).gratis).toHaveLength(1);
  });
  it('geeft niets als het in Nederland nergens te zien is', () => {
    expect(naarDiensten(undefined)).toBe(null);
    expect(naarDiensten({ link: 'x' })).toBe(null);
  });
});
