// Logica voor het scherm Vandaag: de kijktip en de dagen van deze week.
import { verdeelDiensten } from './diensten.js';

// Titels van Wil ik zien die je nu bij een van je eigen diensten kunt kijken, met die dienst erbij.
// Series waar je al mee bezig bent staan bij Verder kijken en tellen hier niet mee.
// Wat net nieuw bij jouw diensten is komt eerst; de rest schuift elke dag één plek op,
// zodat je niet elke dag dezelfde tip ziet.
export function kiesKijktips(titels, keuzes, dag) {
  const kandidaten = titels
    .filter((t) => t.status === 'Wil ik zien' && !t.voortgang && t.diensten)
    .map((t) => ({ titel: t, dienst: verdeelDiensten(t.diensten, keuzes).bijJou[0] }))
    .filter((k) => k.dienst)
    .sort((a, b) => String(a.titel.toegevoegdOp).localeCompare(String(b.titel.toegevoegdOp)));
  const nieuw = kandidaten.filter((k) => k.titel.nieuwBij?.length);
  const rest = kandidaten.filter((k) => !k.titel.nieuwBij?.length);
  const verschuif = rest.length ? dagNummer(dag) % rest.length : 0;
  return [...nieuw, ...rest.slice(verschuif), ...rest.slice(0, verschuif)];
}

function dagNummer(dag) {
  return Math.floor(Date.parse(`${dag}T12:00:00Z`) / 86400000);
}

// De zeven dagen ('jjjj-mm-dd') van maandag tot en met zondag van de week waarin 'dag' valt.
export function weekDagen(dag) {
  const d = new Date(`${dag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

// 'Maandag 26 okt – zondag 1 nov'
export function weekTekst(dagen) {
  const opmaak = (dag, weekdag) =>
    new Date(`${dag}T12:00:00Z`).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/^\w/, (c) => (weekdag ? c.toUpperCase() : c));
  return `${opmaak(dagen[0], true)} – ${opmaak(dagen[6], false)}`;
}
