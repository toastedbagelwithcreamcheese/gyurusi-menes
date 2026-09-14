"""
A megosztási képekhez (src/app/og/…) használt Fraunces TTF előállítása a weboldal saját woff2-jéből.
A Satori (next/og) sem woff2-t, sem változtatható betűt nem kezel, ezért egy rögzített opsz-példányt
mentünk sima TrueType-ként. A PEP 668 miatt NE a rendszer-pythonba telepíts — egy eldobható venv kell:

  python3 -m venv /tmp/fontvenv && /tmp/fontvenv/bin/pip install fonttools brotli
  /tmp/fontvenv/bin/python scripts/og-font.py

Kimenet: src/fonts/fraunces-og.ttf (a gitben van; csak a forrás cseréjekor kell újra futtatni).
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src/fonts/fraunces-opsz-500.woff2"
OUT = ROOT / "src/fonts/fraunces-og.ttf"

font = TTFont(str(SRC))
font.flavor = None  # woff2 → sima TrueType
# opsz 72: a nagy címek rajza (a weboldal a font-optical-sizing: auto miatt hasonló méreten ezt mutatja)
static = instancer.instantiateVariableFont(font, {"opsz": 72})
static.save(str(OUT))

check = TTFont(str(OUT))
cmap = check.getBestCmap()
missing = [c for c in "őűŐŰáéíóöúüÁÉÍÓÖÚÜäßÄ–·’„”…" if ord(c) not in cmap]
assert "fvar" not in check, "a kimenet még változtatható betű"
assert not missing, f"hiányzó karakterek: {missing}"
print(f"{OUT.relative_to(ROOT)}: {OUT.stat().st_size // 1024} KB, {len(cmap)} karakter, statikus")
