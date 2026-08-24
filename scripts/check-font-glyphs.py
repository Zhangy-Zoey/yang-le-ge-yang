#!/usr/bin/env python3
"""检查 TTF 是否覆盖游戏内汉字。用法: python3 scripts/check-font-glyphs.py [字体路径]"""
import re
import sys
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
except ImportError:
    print('请先安装: pip install fonttools')
    sys.exit(1)

root = Path(__file__).resolve().parents[1]
font_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'assets/fonts/qigongti.ttf'
if not font_path.is_absolute():
    font_path = root / font_path

if not font_path.exists():
    print(f'找不到字体: {font_path}')
    print('请将正版启功体 TTF 命名为 qigongti.ttf 放入 assets/fonts/')
    sys.exit(1)

f = TTFont(str(font_path))
cmap = {}
for t in f['cmap'].tables:
    cmap.update(t.cmap)

name = f['name'].getDebugName(4) if 'name' in f else '?'
text = ''.join(
    (root / p).read_text(encoding='utf-8')
    for p in ['js/config.js', 'js/render.js', 'js/game.js']
)
need = set(re.findall(r'[\u4e00-\u9fff]', text))
need.update('秾葳蕤疏影清浅天心月圆浓华花鸟织绣移花悔步洗牌')
missing = sorted(c for c in need if ord(c) not in cmap)

print('Font:', name)
print('Glyphs in cmap:', len(cmap))
print('Game chars checked:', len(need))
print('Missing (' + str(len(missing)) + '):', ''.join(missing) if missing else '无')
