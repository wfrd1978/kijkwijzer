import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// De versie is het moment van de laatste wijziging in de code, niet van het bouwen: zo levert
// het dagelijks bijwerken van het voetbalschema geen melding 'Nieuwe versie' op.
// Bij de gedeelde versie geeft GitHub die datum mee (VERSIE_DATUM), omdat daar geen git-geschiedenis is.
function laatsteWijziging() {
  if (process.env.VERSIE_DATUM) return new Date(process.env.VERSIE_DATUM);
  try {
    return new Date(execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim());
  } catch {
    return new Date();
  }
}

// De eigen app draait op https://wfrd1978.github.io/kijkwijzer/ ; de gedeelde versie op .../kijkwijzer/deel/
// (gebouwd met VITE_EDITIE=deel en --base=/kijkwijzer/deel/).
export default defineConfig({
  base: '/kijkwijzer/',
  // Zodat je in de app ziet welke versie je hebt.
  define: {
    __VERSIE__: JSON.stringify(
      laatsteWijziging().toLocaleString('nl-NL', {
        timeZone: 'Europe/Amsterdam',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    ),
  },
});
