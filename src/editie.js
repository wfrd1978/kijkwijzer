// Welke versie van Kijkwijzer dit is: de eigen app, of de gedeelde versie voor familie en vrienden
// (gebouwd met VITE_EDITIE=deel, te vinden op /kijkwijzer/deel/).
// Beide staan op hetzelfde webadres, en een browser deelt de opslag per webadres. Daarom krijgt de
// gedeelde versie een eigen database en een voorvoegsel voor alles wat hij op de telefoon bewaart:
// zo raken de lijsten en instellingen van de twee versies nooit door elkaar.
export const DEEL = import.meta.env.VITE_EDITIE === 'deel';
export const DATABASE = DEEL ? 'kijkwijzer-deel' : 'kijkwijzer';
const VOORVOEGSEL = 'deel:';

if (DEEL && typeof Storage !== 'undefined') {
  const { getItem, setItem, removeItem } = Storage.prototype;
  Storage.prototype.getItem = function (k) {
    return getItem.call(this, VOORVOEGSEL + k);
  };
  Storage.prototype.setItem = function (k, v) {
    return setItem.call(this, VOORVOEGSEL + k, v);
  };
  Storage.prototype.removeItem = function (k) {
    return removeItem.call(this, VOORVOEGSEL + k);
  };
}

// De sleutels die deze versie bewaart (zonder voorvoegsel), om op te ruimen.
export function eigenSleutels() {
  try {
    const alle = Object.keys(localStorage);
    return DEEL ? alle.filter((k) => k.startsWith(VOORVOEGSEL)).map((k) => k.slice(VOORVOEGSEL.length)) : alle.filter((k) => !k.startsWith(VOORVOEGSEL));
  } catch {
    return [];
  }
}
