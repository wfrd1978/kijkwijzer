# SPEC — Kijkwijzer

Versie 0.1 · 26 oktober 2026

## Doel

Een persoonlijke mobiele webapp waarmee je films en series bijhoudt die je wilt zien of gezien hebt, direct ziet waar je iets in Nederland kunt kijken, en tips krijgt op basis van wat je goed vond. Gratis in gebruik, zonder eigen server, en de data blijft van jou. Zusje van de boekenapp: dezelfde bouwwijze, dezelfde rust.

## Uitgangspunten (uit de intake)

- **Opslag:** de lijst staat op de telefoon. Met één knop gaat er een backupbestand naar Google Drive (map Kijkwijzer); terugzetten kan ook.
- **Startimport:** geen. De lijst begint leeg.
- **Databron:** TMDB (gratis). Je vraagt één keer een sleutel aan en plakt die in de instellingen van de app. De sleutel blijft op de telefoon en staat niet in de code.
- **Kosten:** alleen gratis diensten. Geen betaalde AI-API.
- **Accounts:** GitHub is aanwezig; de app draait gratis op GitHub Pages.
- **Privacy:** geen namen, mailadressen of andere persoonsgegevens in de code, documentatie of commitberichten.

## Fase 1 — De kern

| Nr | Functie | Wat het doet | Hoe (gratis) |
|---|---|---|---|
| 1.1 | Sleutel instellen | Eenmalig de TMDB-sleutel plakken, met korte uitleg hoe je die aanvraagt | Opslag op de telefoon |
| 1.2 | Zoeken en toevoegen | Titel typen, films en series door elkaar, kiezen uit resultaten met poster | TMDB |
| 1.3 | Eigen gegevens | Status (wil ik zien / bezig / gezien), 0–5 sterren, kijkdatum, notitie (bijv. "tip van …") | Opslag op de telefoon |
| 1.4 | Waar kijken | Per titel: bij welke dienst in NL (abonnement, huren, kopen), met datum "bijgewerkt op" | TMDB, data van JustWatch |
| 1.5 | Mijn lijst | Zoeken, filteren op status en film/serie, sorteren op datum, sterren, titel | In de app |
| 1.6 | Dubbel-waarschuwing | "Staat al in je lijst (gezien op …)" vóór toevoegen | Vergelijk op TMDB-nummer |
| 1.7 | Backup & terugzetten | Backupbestand via het deelmenu naar Google Drive; later terugzetten | JSON-bestand, Web Share |
| 1.8 | Ontdekken | Trending films en series; filter op "mijn diensten" (welke abonnementen je hebt) | TMDB |
| 1.9 | Tips voor mij | Aanbevelingen op basis van titels met 4–5 sterren; titels die al in je lijst staan vallen weg | TMDB-aanbevelingen, op basis van regels |

**Bewust beperkt:** de streaminginformatie komt van JustWatch via TMDB en loopt soms een paar dagen achter. Daarom staat bij elke titel wanneer die informatie is opgehaald.

### Gegevens per titel

TMDB-nummer · film of serie · titel · jaar · poster · genres · status · sterren · kijkdatum · notitie · diensten (laatst opgehaald) · toegevoegd op

### Klaar wanneer

Je kunt op je telefoon (vanaf het beginscherm) een film of serie zoeken en toevoegen, krijgt een waarschuwing bij een dubbele titel, ziet per titel waar je die in Nederland kunt kijken, vindt elke titel in je lijst binnen enkele seconden terug, krijgt tips op basis van wat je hoog waardeerde, en hebt een backupbestand in je Google Drive.

## Fase 2 — Verdieping (later uitwerken)

Voortgang bij series (seizoen en aflevering), melding als een titel uit je lijst bij een van je diensten verschijnt, trailer en cast, en importeren uit Letterboxd, IMDb of Netflix-kijkgeschiedenis.

## Fase 3 — Delen (later uitwerken)

Lijsten of tips delen met anderen. **Open beslissing:** delen vraagt online opslag of een deelbare export. Dat kiezen we bij de start van fase 3, zodat fase 1 eenvoudig en gratis blijft. Mogelijke koppeling met de boekenapp (één leesprofiel en kijkprofiel) hoort hier ook.

## Risico's en afspraken

- **Dataverlies:** Safari kan gegevens van websites wissen die je lang niet opent. Daarom: app op het beginscherm zetten (dan geldt dat niet) én regelmatig backuppen. De app herinnert je als de laatste backup ouder is dan 14 dagen.
- **De sleutel:** de TMDB-sleutel staat op de telefoon en is in principe zichtbaar voor wie je ontgrendelde telefoon heeft. Het is een gratis sleutel waarmee je alleen gegevens kunt lezen; dat risico is acceptabel. Hij staat nooit in de code op GitHub.
- **Nederlandse teksten:** niet elke titel heeft een Nederlandse beschrijving. Dan toont de app de Engelse.
- **Bronvermelding:** TMDB en JustWatch eisen een vermelding in de app. Die staat onderaan.
- **Openbare code:** de code staat openbaar op GitHub (gratis Pages). Er staan geen sleutels, kijkdata of persoonsgegevens in de code; je lijst blijft op je telefoon.
