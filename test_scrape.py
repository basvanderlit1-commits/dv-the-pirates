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
                                                    bijz=[dict(prestatie="180"), dict(prestatie="121 finish")])]))
assert a["seizoen"] == "25-26" and a["teams"][0]["n180"] == 1 and a["teams"][0]["finish"] == 121

print("alle controles OK")
