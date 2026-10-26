import { defineConfig } from 'vite';

// De app draait op https://wfrd1978.github.io/kijkwijzer/
export default defineConfig({
  base: '/kijkwijzer/',
  // Moment van bouwen, zodat je in de app ziet welke versie je hebt.
  define: {
    __VERSIE__: JSON.stringify(
      new Date().toLocaleString('nl-NL', {
        timeZone: 'Europe/Amsterdam',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    ),
  },
});
