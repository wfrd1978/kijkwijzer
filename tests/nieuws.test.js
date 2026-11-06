import { describe, expect, it } from 'vitest';
import { nieuwsVoorJou, clubNamen } from '../src/nieuws.js';

const items = [
  { titel: 'Arokodare leidt Ajax naar ruime zege op tiental Midtjylland', soort: 'voetbal', tijd: '2026-11-05T19:52:00Z', link: 'https://nos.nl/l/1' },
  { titel: 'AZ doet niet mee aan Nederlands avondje in Europa', soort: 'voetbal', tijd: '2026-11-05T22:01:00Z', link: 'https://nos.nl/l/2' },
  { titel: 'Verstappen is zelf ook verrast dat hij ineens tweede staat', soort: 'f1', tijd: '2026-11-06T05:22:00Z', link: 'https://nos.nl/l/3' },
  { titel: 'Handballers winnen eerste EK-kwalificatieduel', soort: 'sport', tijd: '2026-11-05T20:30:00Z', link: 'https://nos.nl/l/4' },
  { titel: 'Bazen van de Champions League', soort: 'voetbal', tijd: '2026-11-04T10:00:00Z', link: 'https://nos.nl/l/5' },
];

describe('sportnieuws voor jou', () => {
  it('maakt van volledige clubnamen bruikbare namen', () => {
    expect(clubNamen({ naam: 'Ajax', vol: 'AFC Ajax' })).toEqual(['Ajax']);
    expect(clubNamen({ naam: 'Twente', vol: "FC Twente '65" })).toEqual(['Twente']);
    expect(clubNamen({ naam: 'PSV', vol: 'PSV' })).toEqual(['PSV']);
  });
  it('zet nieuws over je clubs voorop, dan je competities, dan F1', () => {
    const uit = nieuwsVoorJou(items, { clubs: [{ naam: 'AZ', vol: 'AZ Alkmaar', logo: 'x' }], alles: ['CL'] }, 4);
    expect(uit.map((x) => x.link)).toEqual(['https://nos.nl/l/2', 'https://nos.nl/l/5', 'https://nos.nl/l/3']);
    expect(uit[0].waarom).toBe('AZ');
    expect(uit[0].club.logo).toBe('x');
    expect(uit[1].club).toBeUndefined();
  });
  it('herkent een korte clubnaam niet in een ander woord', () => {
    const uit = nieuwsVoorJou([{ titel: 'Bazen en baas', soort: 'voetbal', tijd: '2026-11-05T10:00:00Z' }], { clubs: [{ naam: 'AZ' }] });
    expect(uit[0].score).toBe(0);
  });
  it('geeft standaard twee koppen', () => {
    expect(nieuwsVoorJou(items, { clubs: [], alles: ['CL', 'DED'] })).toHaveLength(2);
  });
  it('toont het nieuwste algemene sportnieuws als er niets voor jou is', () => {
    const uit = nieuwsVoorJou(items.filter((x) => x.soort === 'sport'), { clubs: [], alles: [] });
    expect(uit.map((x) => x.link)).toEqual(['https://nos.nl/l/4']);
  });
});
