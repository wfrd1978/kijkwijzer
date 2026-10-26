import { describe, expect, it } from 'vitest';
import { maakVerzoek, naarTitel, posterUrl } from '../src/tmdb.js';

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
