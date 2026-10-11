"""Snelle controles van de rekenregels in scrape.py, zonder internet. Draait in de workflow vóór het ophalen;
faalt er één, dan wordt er niets uitgerold en blijft de vorige site staan.  python test_scrape.py"""
from openpyxl import Workbook

import scrape as s

# getallen: alleen echte getallen omzetten, namen blijven tekst
assert s.num("12") == 12 and s.num("6.3") == 6.3 and s.num("75%") == 75 and s.num("-2") == -2
assert s.num("Nan") == "Nan" and s.num("Infinity") == "Infinity" and s.num("1_000") == "1_000" and s.num("") == ""

# soort partij: de namen verschillen per divisie
for naam, soort in [("Single 1", "Single"), ("Singel 2 U* b.o 5/501", "Single"), ("Koppel 3", "Koppel"),
                    ("Koppel 1 - A*: b.o. 5/501", "Koppel"), ("K 1* - K A: b.o 5/501", "Koppel"),
                    ("RR 3 - C* 301", "RR"), ("RR Solo (bull bepaalt wie start!)", "RR"), ("Team 1001/3", "Team")]:
    assert s.game_type(naam) == soort, naam

# namen voor mappen, topics en bestanden
assert s.slugify("The Pirates 2") == "the-pirates-2" and s.short("Pirates 7") == "pirates7"

# agenda: regels van hooguit 75 bytes, vervolgregels met een spatie, niets kwijt
regel = "DESCRIPTION:" + "é" * 60 + "x" * 40
gevouwen = s.fold(regel).split("\r\n")
assert all(len(r.encode()) <= 75 for r in gevouwen) and all(r[0] == " " for r in gevouwen[1:])
assert "".join(r[1:] if i else r for i, r in enumerate(gevouwen)) == regel

# Excel: een naam die met "=" begint wordt geen formule
wb = Workbook()
wb.remove(wb.active)
s.sheet(wb, "t", ["Naam"], [["=1+1"]])
assert wb["t"]["A2"].data_type == "s" and wb["t"]["A2"].value == "=1+1"

# meldingen: alleen nieuwe uitslagen, naar teamtopic én clubtopic
d = dict(team="Pirates 7", div="4A", ntfy="pirates7-dbmn-uitslagen", stand=[dict(team="Pirates 7", pos=3, pnt=20)],
         matches=[dict(ronde="1", datum="09-09-2026", tegen="X", tu="Thuis", uitslag="W", wij=6, zij=3),
                  dict(ronde="2", datum="16-09-2026", tegen="Y", tu="Uit", uitslag="V", wij=2, zij=7),
                  dict(ronde="3", datum="23-09-2026", tegen="Z", tu="Uit", uitslag="", wij=None, zij=None)])
b = s.nieuwe_uitslagen(d, {"1"}, "https://x/")
assert [x["topic"] for x in b] == ["pirates7-dbmn-uitslagen", s.CLUB_TOPIC], b
assert b[0]["title"] == "Pirates 7 verliest 2-7 van Y" and "3e in 4A" in b[0]["message"]
assert s.nieuwe_uitslagen(d, {"1", "2"}, "https://x/") == []

# archief: korte eindstand per team
a = s.archief_van(dict(seizoen="25-26", teams=[dict(naam="Pirates 7", div="4A", pos=2, teams=14, pnt=150, w=18, v=8,
                                                    bijz=[dict(prestatie="2x 180"), dict(prestatie="1x 171"), dict(prestatie="121 finish")])]))
assert a["seizoen"] == "25-26" and a["teams"][0]["n180"] == 2 and a["teams"][0]["finish"] == 121

# ---------- echte pagina's van teambeheer (testdata/), met de gevallen die eerder fout gingen ----------
# Geen zelfbedachte voorbeelden: de notatie van teambeheer ("1x 180", "5--5") is precies waar het misging.
import re
from pathlib import Path
from bs4 import BeautifulSoup
pagina = lambda f: s.desktop(BeautifulSoup((Path(__file__).parent / "testdata" / f).read_bytes().decode("utf-8", "replace"), "html.parser"))

# reglementaire uitslag (The Pirates 1 - Darth Vader 5, "W 5--5" zonder formulier) telt mee in de stand
ms, spelers, _ = s.parse_team(pagina("team-reglementair-5--5.html"), "The Pirates 1")
m = next(x for x in ms if x["ronde"] == "1")
assert (m["uitslag"], m["h"], m["u"], m["form"]) == ("W", 5, -5, None), m
assert all(x["uitslag"] in "WVG" for x in ms) and spelers

# 2x 180 op één avond (Jasper van Vulpen, 06-10) telt als 2; uitslag = som van de partijen (RR samen één punt)
wed = dict(ronde="5", datum="06-10-2026", thuis="Breehoek the Force", uit="The Pirates 2")
games, bijz, locatie = s.parse_form(pagina("formulier-2x180.html"), wed, "The Pirates 2")
assert sum(s.n180(b["prestatie"]) for b in bijz if b["speler"] == "Jasper van Vulpen") == 2, bijz
assert all(re.fullmatch(r"\d+x \d+|\d+ finish", b["prestatie"]) for b in bijz), bijz
rr = [g for g in games if s.game_type(g["onderdeel"]) == "RR"]
punten = sum(g["uitslag"] == "W" for g in games if g not in rr) + (sum(g["legs_wij"] for g in rr) > sum(g["legs_zij"] for g in rr))
assert punten == 3 and locatie, (punten, locatie)  # uitslag 6-3 voor Breehoek

# beslissende "RR Solo" bij 4-4: derde RR van Jasper (17-09) is echt en mag geen controle-seintje geven
wed = dict(ronde="2", datum="17-09-2026", thuis="The Pirates 2", uit="DC DVSA")
games, bijz, _ = s.parse_form(pagina("formulier-rr-solo.html"), wed, "The Pirates 2")
assert sum(g["wij"] == "Jasper van Vulpen" and s.game_type(g["onderdeel"]) == "RR" for g in games) == 3
leeg = [["#", "Speler", "Team", "Divisie", "Hoeveel"]]
namen = [dict(naam=n, singles=None, winst=None) for n in {p for g in games for p in g["wij"].split(", ")}]
fout = s.controleer("The Pirates 2", [], games, namen, s.defaultdict(lambda: s.defaultdict(int)), [[]], {}, bijz, {"180ers": leeg, "171ers": leeg, "Hoogste finishes": leeg}, {})
assert not [f for f in fout if "speelde" in f], fout

# opstellingsplek = volgorde op het formulier (4A, Pirates 7 uit bij Wheels & Arrows, 11-09): 3e en 4e koppelpartij
# zijn Koppel 3 en 4, ook al spelen dezelfde paren ("Koppel 1* - B" = 3e koppel). Door de gebruiker bevestigd.
wed = dict(ronde="1", datum="11-09-2026", thuis="Wheels & Arrows", uit="Pirates 7")
games, bijz, _ = s.parse_form(pagina("formulier-4a-uit.html"), wed, "Pirates 7")
assert [(p, g["uitslag"]) for p, g in s.plekken_van(games)] == [("Single 1", "V"), ("Single 2", "V"), ("Single 3", "V"), ("Single 4", "W"),
                                                                ("Koppel 1", "V"), ("Koppel 2", "W"), ("Koppel 3", "V"), ("Koppel 4", "V")]
assert sum(s.spannend(g) for g in games) == 6 and not any(s.spannend(g) for g in games if s.game_type(g["onderdeel"]) == "RR")
# andere divisie ("Koppel 1: 1* - A (501 bo 5)" ... "Koppel 4: 2 - A*"): ook daar de volgorde
wed = dict(ronde="5", datum="06-10-2026", thuis="Breehoek the Force", uit="The Pirates 2")
games, bijz, _ = s.parse_form(pagina("formulier-2x180.html"), wed, "The Pirates 2")
assert [p for p, g in s.plekken_van(games) if p.startswith("Koppel")] == [f"Koppel {i}" for i in range(1, 5)]
assert [g["onderdeel"][:8] for p, g in s.plekken_van(games) if p == "Koppel 3"] == ["Koppel 3"]
assert s.maximum("2x 180") == (180, 2) and s.maximum("1x 171") == (171, 1) and s.maximum("13 darter") is None

# extra_stats mag niet crashen op het begin van het seizoen (lege stand, nog niets gespeeld)
leeg = s.extra_stats("T", [dict(ronde="1", datum="01-09-2026", tegen="X", tu="Thuis", uitslag="", form=None, vrij=False)], [], [],
                     [dict(pos="", team="T", wed="", w="", v="", pnt="", gem="", zone=""), dict(pos=1, team="X", wed=0, w=0, v=0, pnt=0, gem="", zone="")])
assert leeg["prognose"]["rest"] == 1 and leeg["thuisuit"]["Thuis"]["avonden"] == 0 and leeg["plekken"] == [], leeg

print("alle controles OK")
