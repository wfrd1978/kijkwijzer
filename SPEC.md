# SPEC — Kijkwijzer

Versie 0.2 · 26 oktober 2026

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
| 1.5 | Mijn lijst | Zoeken, filteren op status en film/serie, sorteren op datum, sterren, titel; een titel naar links vegen om te verwijderen (met Ongedaan maken, zoals in de boekenapp) | In de app |
| 1.6 | Dubbel-waarschuwing | "Staat al in je lijst (gezien op …)" vóór toevoegen | Vergelijk op TMDB-nummer |
| 1.7 | Backup & terugzetten | Backupbestand via het deelmenu naar Google Drive; later terugzetten. Je TMDB-sleutel zit er bewust niet in | JSON-bestand, Web Share |
| 1.8 | Mijn diensten | In Instellingen (in een blok dat je kunt in- en uitklappen) per streamingdienst kiezen: Abonnement, Tonen of Verbergen, of in één tik alles verbergen behalve je abonnementen (of alles weer tonen). Op de titelpagina eerst "Bij jou te zien", verborgen diensten niet tonen. Per dienst een knop die de dienst opent (met de titel als zoekterm waar de dienst dat toelaat) | TMDB-lijst van NL-diensten; keuze op de telefoon |
| 1.9 | Samen kijken | Een titel delen via het deelmenu (WhatsApp, iMessage, mail) als uitnodiging om samen te kijken: titel, waar te zien, link en optioneel een voorstel voor dag en tijd | Web Share |
| 1.10 | Ontdekken | Trending films en series; filter op "mijn diensten" | TMDB |
| 1.11 | Tips voor mij | In Ontdekken: aanbevelingen op basis van titels met 4–5 sterren, met de reden erbij ("Omdat je … hoog waardeerde"); titels die al in je lijst staan vallen weg | TMDB-aanbevelingen, op basis van regels |
| 1.12 | Nieuwe versie | Staat er een nieuwe versie online, dan verschijnt bovenin een knop om te vernieuwen (zoals in de boekenapp). Gecontroleerd bij opstarten, bij terugkeren naar de app en elk half uur | In de app |
| 1.13 | Weergave | In Instellingen kiezen: donker 's avonds, zoals de iPhone, altijd licht of altijd donker (zoals in de boekenapp) | In de app |

**Bewust beperkt:** de streaminginformatie komt van JustWatch via TMDB en loopt soms een paar dagen achter. Daarom staat bij elke titel wanneer die informatie is opgehaald. TMDB geeft geen directe link naar een titel bij een dienst; doorklikken opent de dienst (waar mogelijk met de titel als zoekterm) of de overzichtspagina met alle opties.

### Gegevens per titel

TMDB-nummer · film of serie · titel · jaar · poster · genres · status · sterren · kijkdatum · notitie · diensten (laatst opgehaald) · toegevoegd op

### Klaar wanneer

Je kunt op je telefoon (vanaf het beginscherm) een film of serie zoeken en toevoegen, krijgt een waarschuwing bij een dubbele titel, ziet per titel waar je die in Nederland kunt kijken (eerst bij je eigen abonnementen), kunt iemand uitnodigen om samen te kijken, vindt elke titel in je lijst binnen enkele seconden terug, krijgt tips op basis van wat je hoog waardeerde, en hebt een backupbestand in je Google Drive.

## Werklijst — kleine verbeteringen

- **Vormgeving.** Later kijken naar de opmaak van de Sport-pagina, en eigenlijk naar de vormgeving van de hele app. Eerst verder bouwen.

## Fase 2 — Verdieping

Trailer en acteurs, melding als een titel uit je lijst bij een van je diensten verschijnt, en voortgang bij series.

**Trailer en acteurs.** Op de titelpagina de trailer, direct zichtbaar als groot beeld met afspeelknop (beeld van TMDB); na een tik speelt hij in de pagina (privacyvriendelijke YouTube-speler zonder volgcookies; altijd ook een link "Open in YouTube") en de belangrijkste acteurs met foto en rol (TMDB). Tik je op een acteur, dan zie je andere films en series met die acteur en kun je die op je lijst zetten. In Mijn lijst kun je ook op acteur zoeken; daarvoor bewaart de app de namen van de belangrijkste acteurs bij elke titel. In Zoek vind je ook acteurs die (nog) niet in je lijst voorkomen; tik je erop, dan zie je al hun films en series.

**Nieuw bij jouw diensten.** Bij het openen van de app (hoogstens één keer per dag) kijkt de app of titels op "Wil ik zien" nieuw te zien zijn bij een van je abonnementen. Zo ja, dan staat bovenaan Mijn lijst een melding en krijgt de titel een label. Een pushmelding als de app dicht is kan niet zonder eigen server; daar is bewust van afgezien.

**Voortgang bij series.** Bij een serie die je aan het kijken bent (status Bezig) houd je bij in welk seizoen en bij welke aflevering je bent. Met één tik ga je naar de volgende aflevering; in Mijn lijst zie je waar je bent (bijvoorbeeld S2 · A5). Na de laatste aflevering stelt de app voor de serie op Gezien te zetten. De seizoenen en het aantal afleveringen komen van TMDB.

**Importeren (vervallen).** Uit Letterboxd, IMDb of de Netflix-kijkgeschiedenis. Vervallen omdat er geen kijkgeschiedenis is om te importeren.

**Tv en sport.** Gewenst: (1) wedstrijden en races van een vaste selectie eigen sporten, met waar je ze kunt zien, en daarbij rekening houden met sportzenders waarop je een abonnement hebt (bijvoorbeeld Ziggo Sport); (2) een melding of overzicht als een film of serie van je lijst op een gewone tv-zender komt. **Uitkomst onderzoek (oktober 2026):**
- *Tv-gids (films en series op gewone zenders):* er is geen officiële, gratis Nederlandse tv-gids om te gebruiken. Wat er is, haalt de gegevens van tvgids.nl af (scrapen), bijvoorbeeld met een GitHub Action die twee keer per dag een gidsbestand maakt. Of tvgids.nl dat toestaat is niet bekend; programmabeschrijvingen kunnen auteursrechtelijk beschermd zijn. Advies: niet scrapen. Wel kan: per titel een knop "Komt hij op tv?" die zoekt in tvgids.nl.
- *Formule 1:* het raceschema komt gratis en zonder sleutel van Jolpica (opvolger van Ergast) en werkt direct in de app (getest). Een zender staat er niet bij; die is bekend: live bij Viaplay (rechten tot en met 2029), Ziggo Sport heeft samenvattingen en voorbeschouwingen, geen live races.
- *Wielrennen:* er is geen gratis bron met een koerskalender én zender (ProCyclingStats heeft geen officiële API). Uitzendingen zijn verspreid over NOS, Sporza, Eurosport en HBO Max (sport add-on). Mogelijk: een eigen kalender van de grote koersen met zender, in de app meegeleverd en per seizoen bijgewerkt (zoals de lijsten in de boekenapp).
- *Voetbal:* wedstrijdschema's kunnen via football-data.org (gratis, maar een tweede sleutel nodig); de zender staat er niet bij. De dienst laat niet toe dat de app het rechtstreeks ophaalt (alleen vanaf een testomgeving). Wel mogelijk: GitHub haalt het schema dagelijks op met de sleutel als GitHub-geheim (niet in de code) en zet het klaar voor de app.

**Keuze van de eigenaar:** Formule 1, wielrennen en voetbal volgen in een nieuw scherm **Sport**. Films en series op gewone tv: niet nodig (vervallen). Uitwerking in de stappen 16 (Formule 1), 17 (wielrennen) en 18 (voetbal).

**Wensen voor voetbal (stap 18, verder te specificeren):** zelf kiezen welke clubs en wedstrijden je volgt; per dag en per week duidelijk zien welke wedstrijden er zijn en waar je ze kunt volgen, met nadruk op de zenders en diensten die je hebt. Jouw zenders: KPN-basispakket (waaronder ESPN 1), Viaplay en Ziggo Sport 1 t/m 6. Welke zender welke competitie uitzendt, wordt bij de start van stap 18 opgezocht en gecontroleerd. Die "mijn zenders" kunnen ook bij Formule 1 en wielrennen laten zien wat jij live kunt volgen.

**Mijn sportzenders (sinds stap 17).** In Instellingen kies je zelf welke zenders en diensten je hebt (NOS, ESPN, Viaplay, Ziggo Sport, HBO Max). Sport laat daarmee zien wat jij live kunt volgen. De keuze staat op de telefoon en gaat mee in de backup; ze staat bewust niet in de code.

**Wielrennen (stap 17).** De grote koersen van het seizoen (grote rondes, monumenten, belangrijkste klassiekers, WK) met datum en zender, meegeleverd in de app (`src/wielrennen.js`). Data uit de UCI WorldTour-kalender; zenders met de hand gecontroleerd, met "onder voorbehoud" waar het nog niet vaststaat. Elk seizoen bijwerken.

## Fase 3 — Delen (later uitwerken)

Lijsten of tips delen met anderen (één titel delen om samen te kijken zit al in fase 1). **Open beslissing:** delen vraagt online opslag of een deelbare export. Dat kiezen we bij de start van fase 3, zodat fase 1 eenvoudig en gratis blijft. Mogelijke koppeling met de boekenapp (één leesprofiel en kijkprofiel) hoort hier ook.

## Risico's en afspraken

- **Dataverlies:** Safari kan gegevens van websites wissen die je lang niet opent. Daarom: app op het beginscherm zetten (dan geldt dat niet) én regelmatig backuppen. De app herinnert je als de laatste backup ouder is dan 14 dagen.
- **De sleutel:** de TMDB-sleutel staat op de telefoon en is in principe zichtbaar voor wie je ontgrendelde telefoon heeft. Het is een gratis sleutel waarmee je alleen gegevens kunt lezen; dat risico is acceptabel. Hij staat nooit in de code op GitHub.
- **Nederlandse teksten:** niet elke titel heeft een Nederlandse beschrijving. Dan toont de app de Engelse.
- **Bronvermelding:** TMDB en JustWatch eisen een vermelding in de app. Die staat onderaan.
- **Openbare code:** de code staat openbaar op GitHub (gratis Pages). Er staan geen sleutels, kijkdata of persoonsgegevens in de code; je lijst blijft op je telefoon.
