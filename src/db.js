import Dexie from 'dexie';
import { nieuweTitel } from './titels.js';

// Je lijst staat in IndexedDB op het toestel zelf.
export const db = new Dexie('kijkwijzer');

db.version(1).stores({
  // Elke film of serie maar één keer: de combinatie soort + TMDB-nummer is uniek.
  titels: '++id, &[soort+tmdbId], toegevoegdOp, status',
});

// Vraag de browser om de opslag niet zomaar op te ruimen.
export async function vraagBlijvendeOpslag() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Niet elke browser ondersteunt dit; de app werkt ook zonder.
  }
}

export function alleTitels() {
  return db.titels.orderBy('toegevoegdOp').reverse().toArray();
}

// Zet een zoekresultaat op je lijst. Staat hij er al, dan blijft alles zoals het was.
export async function titelToevoegen(t) {
  const bestaand = await db.titels.where({ soort: t.soort, tmdbId: t.tmdbId }).first();
  if (bestaand) return { titel: bestaand, nieuw: false };
  const titel = nieuweTitel(t);
  titel.id = await db.titels.add(titel);
  return { titel, nieuw: true };
}
