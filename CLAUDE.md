# CLAUDE.md — Kijkwijzer

Lees dit bestand en SPEC.md aan het begin van elke sessie.

## Voor wie en waarom

Kijkwijzer is een persoonlijke mobiele webapp om films en series bij te houden. De eigenaar is geen programmeur. Het doel is een rustige, betrouwbare app die echt gebruikt wordt: snel toevoegen, direct zien waar je iets kunt kijken, en je eigen oordeel bewaren. Eenvoud gaat boven features. Kijkwijzer wordt gebouwd op dezelfde manier als de boekenapp van de eigenaar (repository `boeken-app`); houd beide apps herkenbaar gelijk.

## Fases

1. **Kern** — sleutel instellen; zoeken en toevoegen; status, sterren, kijkdatum, notitie; waar kijken in NL; mijn lijst met zoeken en filteren; dubbel-waarschuwing; backup/terugzetten naar Google Drive; mijn diensten; samen kijken delen; ontdekken; tips voor mij.
2. **Verdieping** — voortgang bij series, melding als een titel bij je dienst verschijnt, trailer, acteurs bij films en series, sport: Formule 1, wielrennen en voetbal.
3. **Delen** — lijsten en tips delen; mogelijke koppeling met de boekenapp.

Werk alleen aan de fase die actief is. Fase 1 is af. Nu actief: **Fase 2**.

## Gekozen techniek (en waarom, in gewoon Nederlands)

| Onderdeel | Keuze | Waarom |
|---|---|---|
| Soort app | Webapp die je op je beginscherm zet (PWA) | Werkt als een app, zonder App Store |
| Bouwgereedschap | Vite + gewoon JavaScript, geen framework | Gelijk aan de boekenapp; weinig onderdelen, makkelijk te volgen |
| Opslag | IndexedDB op de telefoon, via Dexie.js | Gelijk aan de boekenapp; werkt offline |
| Backup | JSON-bestand via het deelmenu naar Google Drive (map Kijkwijzer) | Gratis, data blijft van de eigenaar |
| Film- en seriegegevens | TMDB (gratis sleutel, door de eigenaar zelf in de app geplakt) | Beste gratis bron, inclusief NL-streaminginfo |
| Online zetten | GitHub Pages via GitHub Actions, automatisch bij elke push en elke ochtend | Gratis; geen server nodig |
| Voetbalschema | football-data.org, opgehaald door GitHub tijdens het online zetten (`scripts/voetbal.mjs`) en klaargezet als `voetbal.json` | football-data staat ophalen vanuit de app niet toe; de sleutel staat als GitHub-geheim `FOOTBALL_DATA_KEY`, niet in de code |

Geen betaalde diensten, geen eigen server en geen sleutels in de code. De TMDB-sleutel komt alleen in de opslag op de telefoon; de football-data-sleutel alleen als geheim in GitHub. De versie in de app is het moment van de laatste codewijziging, zodat de dagelijkse run geen melding "Nieuwe versie" geeft.

Adres van de app: https://wfrd1978.github.io/kijkwijzer/

## Werkafspraken

1. **Kleine stappen.** Eén stap = één zichtbaar resultaat dat de eigenaar op de telefoon kan testen. Begin elke stap met één zin: wat we gaan bouwen en hoe je het test.
2. **De eigenaar test zelf.** Na elke stap geef je het adres en een korte testinstructie (maximaal drie handelingen). Pas als de eigenaar zegt dat het werkt, is de stap klaar.
3. **Git-commit na elke werkende stap.** Duidelijk Nederlands bericht, bijvoorbeeld Stap 3: sterren en notitie toevoegen. Nooit committen wat nog niet werkt.
4. **Uitleg in gewoon Nederlands.** Licht keuzes kort toe: wat, waarom, en wat het alternatief was. Geen vakjargon zonder uitleg. Vraag het bij twijfel in plaats van te gokken.
5. **Data is heilig.** Nooit iets wijzigen aan de opslag of backup zonder de eigenaar te waarschuwen en eerst een backup te laten maken.
6. **Spec bijhouden.** Verandert er iets aan de plannen, werk dan SPEC.md bij in dezelfde commit. De versies in deze repository zijn leidend.
7. **Hergebruik de boekenapp.** Neem onderdelen die daar al werken (backup, sterren, dubbel-waarschuwing, PWA-opzet) over in plaats van ze opnieuw te bedenken.
8. **Privacy.** Noem nergens de naam, het mailadres of andere persoonsgegevens van de eigenaar: niet in code, documentatie, README, commitberichten of de app zelf. Gebruik "de eigenaar" of "je". Commits gaan op naam van het GitHub-account met het `noreply`-adres van GitHub.

## Stappenplan Fase 1

| Stap | Resultaat om te testen |
|---|---|
| 0 | Lege app online op GitHub Pages en op het beginscherm te zetten |
| 1 | TMDB-sleutel instellen; zoeken op titel met posters |
| 2 | Titel toevoegen; lijst met posters |
| 3 | Titel openen: status, sterren, kijkdatum, notitie; wijzigen en verwijderen |
| 4 | Waar kijken in NL op de titelpagina |
| 5 | Zoeken, filteren en sorteren in mijn lijst + dubbel-waarschuwing |
| 6 | Backup maken en terugzetten (+ herinnering na 14 dagen) |
| 7 | Mijn diensten: per dienst Abonnement / Tonen / Verbergen; "Bij jou te zien" en doorklikken op de titelpagina |
| 8 | Samen kijken: titel delen als uitnodiging, met optioneel dag en tijd |
| 9 | Ontdekken: trending + filter op mijn diensten |
| 10 | Tips voor mij |

## Stappenplan Fase 2

| Stap | Resultaat om te testen |
|---|---|
| 11 | Trailer en acteurs (foto en rol) op de titelpagina |
| 12 | Tikken op een acteur: andere films en series met die acteur, en die op je lijst zetten |
| 13 | Zoeken op acteur in Mijn lijst |
| 14 | Melding in de app: "Nieuw bij jouw diensten" voor titels op Wil ik zien (bij openen, max. 1x per dag gecontroleerd; geen pushmelding, want geen server) |
| 15 | Voortgang bij series: bij welk seizoen en welke aflevering je bent, met één tik naar de volgende aflevering |
| 16 | Sport: nieuw scherm in het menu, met Formule 1 (komende races in Nederlandse tijd, en waar te zien) |
| 17 | Wielrennen in Sport: kalender van de grote koersen met zender, meegeleverd in de app en per seizoen bijgewerkt |
| 18 | Voetbal in Sport: wedstrijdschema via football-data.org. Kan niet rechtstreeks vanuit de app; bij de start kiezen of GitHub het dagelijks ophaalt (sleutel als GitHub-geheim) |
| vervallen | Films en series op gewone tv: geen toegestane gratis tv-gids, en niet nodig |
| vervallen | Importeren uit Letterboxd/IMDb/Netflix: er is geen kijkgeschiedenis om te importeren |

## Stappenplan Nieuw ontwerp (na fase 2)

Gebaseerd op de schets "Kijkwijzer – schets nieuw ontwerp" en de keuzes in SPEC.md (werklijst).

| Stap | Resultaat om te testen |
|---|---|
| 19 | Nieuwe look op alle schermen: stevige smalle koppenletter, donker als basis, felle accentkleur (letters in de app zelf, niet van Google) |
| 20 | Nieuwe indeling: onderin Vandaag, Films & series (Ontdekken · Wil ik zien · Gezien, één zoekveld) en Sport; Instellingen als tandwiel |
| 21 | Status Bezig opheffen (eerst backup): series met voortgang staan bij Wil ik zien en op Vandaag bij Verder kijken |
| 22 | Vandaag compleet: kijktip uit je lijst bij jouw diensten, en Deze week (maandag tot en met zondag) |
| 23 | Sport met schakelaar Voetbal · Formule 1 · Wielrennen |
| 24 | Instellingen opgeschoond in vier blokken |

Het nieuwe ontwerp is af (stap 19–24).

## Stappenplan Vandaag verder inrichten

| Stap | Resultaat om te testen |
|---|---|
| 25 | Nieuwe afleveringen van series op je lijst: op Vandaag (gisteren en vandaag) en in Deze week |
| 26 | Op Vandaag een korte agenda "Straks deze week": de eerstvolgende sport en afleveringen |
| 27 | Nieuws op Vandaag; eerst samen een gratis, toegestane bron kiezen |
