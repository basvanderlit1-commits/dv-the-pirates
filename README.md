# D.V. The Pirates – clubsite

Stand, uitslagen en statistieken van alle Pirates-teams in de DBMN, automatisch van teambeheer.nl.

- Clubsite: https://basvanderlit1-commits.github.io/dv-the-pirates/ (clubpagina + per team `/<team>/`, bv. `/pirates-7/`)
- Pirates 7 houdt ook zijn eigen adres: https://basvanderlit1-commits.github.io/pirates7/ (repo `pirates7` bouwt met deze code)

## Hoe het werkt
`scrape.py` zoekt op teambeheer alle teams met "Pirates" in de naam (seizoen, divisie en team-id gaan vanzelf) en bouwt in `site/`:
een clubpagina, per team een dashboard, Excel (alleen ruwe data) en agenda (iCal, 20:00–23:00).
GitHub Actions (`.github/workflows/dashboard.yml`) draait dit elke dag om 05:00, 22:30 en 23:30 UTC, bij elke push en via
*Actions → Clubsite bijwerken → Run workflow*. Volgorde: controles (`test_scrape.py`) → bouwen → uitrollen → meldingen.

| Bestand | Wat |
|---|---|
| `scrape.py` | ophalen en bouwen |
| `dashboard_template.html` / `club_template.html` | teamdashboard / clubpagina |
| `web/` | huisstijl (`style.css`), gedeelde scripts (`gedeeld.js`), logo, banner, iconen |
| `test_scrape.py` | snelle controles zonder internet |
| `archief/` | eindstanden van vorige seizoenen (vult zich vanzelf bij de seizoenswissel) |

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
