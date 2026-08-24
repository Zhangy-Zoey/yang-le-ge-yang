#!/usr/bin/env python3
"""从霞鹜文楷生成游戏子集字体 assets/fonts/lxgw-wenkai.ttf"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTS_DIR = ROOT / 'assets' / 'fonts'
OUT = FONTS_DIR / 'lxgw-wenkai.ttf'
SOURCE_CANDIDATES = [
    FONTS_DIR / '_source' / 'LXGWWenKai-Regular.ttf',
    Path('/Library/Fonts/LXGWWenKai-Regular.ttf'),
    Path.home() / 'Library/Fonts/LXGWWenKai-Regular.ttf',
]
RELEASE_URL = (
    'https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Regular.ttf'
)
OFL_URL = 'https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/OFL.txt'


def collect_game_text() -> str:
    parts = []
    for rel in ['js/config.js', 'js/render.js', 'js/game.js', 'js/flowers.js']:
        parts.append((ROOT / rel).read_text(encoding='utf-8'))
    text = ''.join(parts)
    chars = set(re.findall(r'[\u4e00-\u9fff]', text))
    chars.update('0123456789·×余芳轻点续下一折重开此局满园已满被压住了无步可悔已一步无可移之花暂寄洗尽序乱三联连消')
    chars.update('秾葳蕤疏影清浅天心月圆浓华')
    return ''.join(sorted(chars))


def find_source() -> Path:
    for p in SOURCE_CANDIDATES:
        if p.exists():
            return p
    dest = FONTS_DIR / '_source' / 'LXGWWenKai-Regular.ttf'
    dest.parent.mkdir(parents=True, exist_ok=True)
    print('下载源字体…', RELEASE_URL)
    subprocess.run(['curl', '-fsSL', '-o', str(dest), RELEASE_URL], check=True)
    return dest


def ensure_ofl():
    ofl = FONTS_DIR / 'OFL.txt'
    if ofl.exists():
        return
    print('下载 OFL 协议…')
    subprocess.run(['curl', '-fsSL', '-o', str(ofl), OFL_URL], check=True)


def main():
    try:
        from fontTools.subset import main as subset_main
    except ImportError:
        print('请先: pip install fonttools')
        sys.exit(1)

    FONTS_DIR.mkdir(parents=True, exist_ok=True)
    source = find_source()
    glyphs = collect_game_text()
    text_file = ROOT / 'scripts' / '.game-glyphs.txt'
    text_file.write_text(glyphs, encoding='utf-8')

    pyftsubset = ROOT / '.venv' / 'bin' / 'pyftsubset'
    cmd = [
        str(pyftsubset) if pyftsubset.exists() else 'pyftsubset',
        str(source),
        f'--text-file={text_file}',
        f'--output-file={OUT}',
        '--layout-features=*',
        '--glyph-names',
        '--symbol-cmap',
        '--legacy-cmap',
        '--notdef-glyph',
        '--recommended-glyphs',
    ]
    print('子集化…', len(glyphs), '字')
    subprocess.run(cmd, check=True)
    ensure_ofl()
    size_kb = OUT.stat().st_size / 1024
    print(f'完成: {OUT} ({size_kb:.0f} KB)')


if __name__ == '__main__':
    main()
