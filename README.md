# D.V. The Pirates – clubsite

Stand, uitslagen en statistieken van alle Pirates-teams in de DBMN, automatisch van teambeheer.nl.

- Clubsite: https://basvanderlit1-commits.github.io/dv-the-pirates/ (clubpagina + per team `/<team>/`, bv. `/pirates-7/`)
- Pirates 7 houdt ook zijn eigen adres: https://basvanderlit1-commits.github.io/pirates7/ (repo `pirates7` neemt de Pirates 7-pagina van de clubsite over)

## Hoe het werkt
`scrape.py` zoekt op teambeheer alle teams met "Pirates" in de naam (seizoen, divisie en team-id gaan vanzelf) en bouwt in `site/`:
een clubpagina, per team een dashboard, Excel (alleen ruwe data) en agenda (iCal, 20:00–23:00).
GitHub Actions (`.github/workflows/dashboard.yml`) bouwt elke ochtend (05:00 UTC), bij elke push en via
*Actions → Clubsite bijwerken → Run workflow*. Op speelavonden (22:00–01:00 NL) kijkt hij elke 10 minuten met een snelle
check (`scrape.py --check`, ~17 pagina's) of er op teambeheer iets veranderd is; alleen dan wordt er gebouwd.
Volgorde: check → controles (`test_scrape.py`) → bouwen → uitrollen → meldingen.

| Bestand | Wat |
|---|---|
| `scrape.py` | ophalen en bouwen |
| `dashboard_template.html` / `club_template.html` | teamdashboard / clubpagina |
| `web/` | huisstijl (`style.css`), gedeelde scripts (`gedeeld.js`), logo, banner, iconen |
| `test_scrape.py` | snelle controles zonder internet, ook op echte pagina's in `testdata/` |
| `archief/` | eindstanden van vorige seizoenen (vult zich vanzelf bij de seizoenswissel) |

## Rekenregels
Wat van teambeheer komt (uitslagen, stand, klassementen, lijsten) nemen we ongewijzigd over; dit zijn de regels voor
wat de site zelf uitrekent.
- **Partij**: elke regel op het wedstrijdformulier met een uitslag. Round robin telt per leg (301), ook de beslissende
  "RR Solo" bij 4–4. Per avond speelt een speler 1 single, 2 koppels en 2 round robins (+ eventueel de Solo).
- **Uitslag avond**: de punten van teambeheer. Controle: singles + koppels + 1 punt voor de round robin samen.
- **Reglementair** (bv. `5--5`, geen formulier): telt mee in stand, vorm en W–V, niet als gespeelde avond
  (beste avond, uitslag van de week).
- **Bijzondere prestaties** zoals teambeheer ze noteert: `2x 180` = twee 180's, `1x 171`, `153 finish`.
  Maximum-categorie = 180, 177, 174, 171, 162; in het aantal 180's tellen alleen echte 180's.
- **Speler van de week**: week = maandag t/m vrijdag. Per speler telt zijn beste avond (twee keer gespeeld = beste
  wedstrijd). Punten = gewonnen partijen + 1 per maximum + 1 per finish van 100+; gelijk: winst%, dan legsaldo.
- **Ranglijst spelers**: winstpercentage, meedoen vanaf meer dan 25% van het hoogste aantal partijen; competitie + beker.
  Het persoonlijk klassement komt van teambeheer (alleen competitie).

## Fouten voorkomen
1. **Elke build vergelijkt met teambeheer** (`controleer` in `scrape.py`): stand, singles per speler, persoonlijk
   klassement, 180's/171's/finishes, partijen per speler per avond, onbekende notaties. Een nieuwe afwijking = seintje
   aan de beheerder. Achterlopende stand van teambeheer (uitslag al binnen, stand nog niet) geeft geen seintje.
2. **Tests op echte pagina's** in `testdata/` (reglementaire uitslag, 2x 180, RR Solo). Gaat er iets mis met een
   nieuwe notatie, sla dan die pagina daar op en voeg een regel toe aan `test_scrape.py`. Nooit zelf voorbeelden
   verzinnen: juist daar ging het mis.
3. **Rekenregels hierboven** bijwerken bij elke wijziging in wat de site uitrekent.
4. **Nieuw onderdeel op de site?** Eerst nagaan wat er in het echt kan gebeuren en of de berekening dan nog klopt:
   twee keer spelen in één week, vrije week, reglementair, beslissende leg, beker, uitgestelde wedstrijd, nieuwe
   notatie op het formulier. Bij twijfel over de spelregels: navragen, niet aannemen.

## Meldingen (ntfy)
- Per team `<teamnaam zonder spaties>-dbmn-uitslagen` (bv. `pirates7-dbmn-uitslagen`) en clubtopic `dv-the-pirates-dbmn-uitslagen`.
- Pas verstuurd na een geslaagde uitrol; het logboek staat op de clubpagina onder Meldingen.
- Storingen gaan naar het beheer-topic in `NTFY_BEHEER` (workflow): een team dat niet bijgewerkt kon worden (dat team houdt
  zijn vorige versie), nieuwe afwijkingen in de gegevens, of een mislukte run.

## Lokaal
```
pip install -r requirements.txt
python test_scrape.py
python scrape.py                       # alle teams, ~2 min
python -m http.server 8765 --directory site
```
Eén team in de root bouwen (zoals de pirates7-repo): `python scrape.py --team "Pirates 7" --solo`.
Commits met `basvanderlit1-commits@users.noreply.github.com`; pushen naar `main` rolt meteen uit.

## Seizoenswissel
Niets te doen: het nieuwe seizoen wordt vanzelf gevonden, het oude komt in `archief/` (de workflow commit dat) en in
het Archief op de clubpagina. De eerste run van het nieuwe seizoen stuurt nog geen uitslagmeldingen.
Een nieuw team met "Pirates" in de naam verschijnt vanzelf.
