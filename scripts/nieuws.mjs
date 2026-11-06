// Sportnieuws: de koppen uit de RSS-feeds van NOS Sport, klaargezet als public/nieuws.json.
// Draait in GitHub, elk uur. Volgens de algemene voorwaarden van de NOS (artikel 7, RSS-Feeds) mag
// een particulier voor niet-commercieel gebruik de artikelkop overnemen uit een door de NOS
// aangeboden feed, met duidelijke bronvermelding en zonder iets te bewerken. Daarom neemt dit script
// alleen de kop (letterlijk), de link naar het artikel bij de NOS en het tijdstip over; geen tekst en
// geen foto's. Lukt het niet, dan blijft de vorige versie staan.
import { writeFile } from 'node:fs/promises';
import { houdVorige } from './vorige.mjs';

const FEEDS = {
  voetbal: 'https://feeds.nos.nl/nosvoetbal',
  f1: 'https://feeds.nos.nl/nossportformule1',
  wielrennen: 'https://feeds.nos.nl/nossportwielrennen',
  sport: 'https://feeds.nos.nl/nossportalgemeen',
};
const MAX_UREN = 48;

// De paar tekens die in een RSS-kop als code staan, terug naar gewone tekst (de kop zelf blijft gelijk).
const ontcijfer = (t) =>
  t
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
const veld = (item, naam) => ontcijfer(item.match(new RegExp(`<${naam}[^>]*>([\\s\\S]*?)</${naam}>`))?.[1] ?? '');

const grens = Date.now() - MAX_UREN * 3600000;
const berichten = new Map(); // link → bericht (een bericht kan in meer feeds staan)
let gelukt = 0;
for (const [soort, adres] of Object.entries(FEEDS)) {
  try {
    const antwoord = await fetch(adres, { signal: AbortSignal.timeout(30000) });
    if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
    const xml = await antwoord.text();
    let n = 0;
    for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
      const titel = veld(item, 'title');
      const link = veld(item, 'link');
      const tijd = new Date(veld(item, 'pubDate'));
      // Alleen echte NOS-links en berichten van de laatste twee dagen.
      if (!titel || !/^https:\/\/nos\.nl\//.test(link) || Number.isNaN(tijd.getTime()) || tijd.getTime() < grens) continue;
      if (!berichten.has(link)) berichten.set(link, { titel, link, tijd: tijd.toISOString(), soort });
      n += 1;
    }
    gelukt += 1;
    console.log(`${soort}: ${n} koppen`);
  } catch (fout) {
    console.log(`${soort}: niet gelukt (${fout.message})`);
  }
}

if (!gelukt) {
  console.log('Geen enkele feed opgehaald: nieuws.json niet opnieuw geschreven.');
  await houdVorige('nieuws');
  process.exit(0);
}
const items = [...berichten.values()].sort((a, b) => b.tijd.localeCompare(a.tijd));
await writeFile(new URL('../public/nieuws.json', import.meta.url), JSON.stringify({ op: new Date().toISOString(), bron: 'NOS Sport', items }));
console.log(`nieuws.json geschreven: ${items.length} koppen.`);
