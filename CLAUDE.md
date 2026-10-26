# CLAUDE.md — Kijkwijzer

Lees dit bestand en SPEC.md aan het begin van elke sessie.

## Voor wie en waarom

Kijkwijzer is een persoonlijke mobiele webapp om films en series bij te houden. De eigenaar is geen programmeur. Het doel is een rustige, betrouwbare app die echt gebruikt wordt: snel toevoegen, direct zien waar je iets kunt kijken, en je eigen oordeel bewaren. Eenvoud gaat boven features. Kijkwijzer wordt gebouwd op dezelfde manier als de boekenapp van de eigenaar (repository `boeken-app`); houd beide apps herkenbaar gelijk.

## Fases

1. **Kern** — sleutel instellen; zoeken en toevoegen; status, sterren, kijkdatum, notitie; waar kijken in NL; mijn lijst met zoeken en filteren; dubbel-waarschuwing; backup/terugzetten naar Google Drive; mijn diensten; samen kijken delen; ontdekken; tips voor mij.
2. **Verdieping** — voortgang bij series, melding als een titel bij je dienst verschijnt, trailer, acteurs bij films en series, import uit Letterboxd/IMDb/Netflix, tv en sport (eerst onderzoek naar bronnen).
3. **Delen** — lijsten en tips delen; mogelijke koppeling met de boekenapp.

Werk alleen aan de fase die actief is. Nu actief: **Fase 1**.

## Gekozen techniek (en waarom, in gewoon Nederlands)

| Onderdeel | Keuze | Waarom |
|---|---|---|
| Soort app | Webapp die je op je beginscherm zet (PWA) | Werkt als een app, zonder App Store |
| Bouwgereedschap | Vite + gewoon JavaScript, geen framework | Gelijk aan de boekenapp; weinig onderdelen, makkelijk te volgen |
| Opslag | IndexedDB op de telefoon, via Dexie.js | Gelijk aan de boekenapp; werkt offline |
| Backup | JSON-bestand via het deelmenu naar Google Drive (map Kijkwijzer) | Gratis, data blijft van de eigenaar |
| Film- en seriegegevens | TMDB (gratis sleutel, door de eigenaar zelf in de app geplakt) | Beste gratis bron, inclusief NL-streaminginfo |
| Online zetten | GitHub Pages via GitHub Actions, automatisch bij elke push | Gratis; geen server nodig |

Geen betaalde diensten, geen eigen server en geen sleutels in de code. De TMDB-sleutel komt alleen in de opslag op de telefoon.

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
