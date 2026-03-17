#!/usr/bin/env python3
"""
Render a spritesheet PNG from chr-mapping.csv + chr-mapping.json.

Reads the CHR ROM from the NES ROM, resolves each cell's palette via
palettes.json, and composites every 8×8 tile into a single image.

Usage:
    python3 chr_mapping_render.py [options]

Options:
    --rom PATH          Path to NES ROM              (default: ../smb.nes)
    --csv PATH          Path to chr-mapping.csv      (default: ../chr-mapping.csv)
    --meta PATH         Path to chr-mapping.json     (default: ../chr-mapping.json)
    --palettes PATH     Path to palettes.json        (default: ../palettes.json)
    --layout PATH       Path to export-layout.json   (default: ../export-layout.json)
    --recipes PATH      Path to recipes directory    (default: ../recipes)
    --output PATH       Output PNG path              (default: ../mario-godot-project/chr-mapping.png)
    --scale N           Integer upscale factor       (default: 1)
    --no-transparent    Render index-0 pixels as palette color (default: transparent)
    --indexed           Render palette-indexed (R channel) from recipes+layout only,
                        base variant only — no palette duplicates on sheet.

Requires: Pillow  (pip install Pillow)
"""

import argparse
import csv
import json
import pathlib
import sys
from PIL import Image

# ── NES hardware palette (64 RGB triples) ──────────────────────────────────

NES_PALETTE = [
    ( 84, 84, 84), (  0, 30,116), (  8, 16,144), ( 48,  0,136),
    ( 68,  0,100), ( 92,  0, 48), ( 84,  4,  0), ( 60, 24,  0),
    ( 32, 42,  0), (  8, 58,  0), (  0, 64,  0), (  0, 60,  0),
    (  0, 50, 60), (  0,  0,  0), (  0,  0,  0), (  0,  0,  0),
    (152,150,152), (  8, 76,196), ( 48, 50,236), ( 92, 30,228),
    (136, 20,176), (160, 20,100), (152, 34, 32), (120, 60,  0),
    ( 84, 90,  0), ( 40,114,  0), (  8,124,  0), (  0,118, 40),
    (  0,102,120), (  0,  0,  0), (  0,  0,  0), (  0,  0,  0),
    (236,238,236), ( 76,154,236), (120,124,236), (176, 98,236),
    (228, 84,236), (236, 88,180), (236,106,100), (212,136, 32),
    (160,170,  0), (116,196,  0), ( 76,208, 32), ( 56,204,108),
    ( 56,180,204), ( 60, 60, 60), (  0,  0,  0), (  0,  0,  0),
    (236,238,236), (168,204,236), (188,188,236), (212,178,236),
    (236,174,236), (236,174,212), (236,180,176), (228,196,144),
    (204,210,120), (180,222,120), (168,226,144), (152,226,180),
    (160,214,228), (160,162,160), (  0,  0,  0), (  0,  0,  0),
]

INDEX_COLORS = {
    0: (0, 0, 0, 0),
    1: (85, 0, 0, 255),
    2: (170, 0, 0, 255),
    3: (255, 0, 0, 255),
}

# ── ROM / CHR helpers ──────────────────────────────────────────────────────

def load_chr_rom(rom_path: pathlib.Path) -> bytes:
    data = rom_path.read_bytes()
    if data[:4] != b"NES\x1a":
        raise ValueError(f"{rom_path} is not a valid iNES ROM")
    prg_size = data[4] * 16384
    chr_banks = data[5]
    if chr_banks == 0:
        raise ValueError("ROM uses CHR RAM — no CHR ROM to extract")
    chr_start = 16 + prg_size
    chr_size = chr_banks * 8192
    return data[chr_start : chr_start + chr_size]


def decode_tile(chr_data: bytes, tile_index: int) -> list[list[int]]:
    """Decode one 8×8 tile (16 bytes, 2-bitplane) → 8 rows of 8 palette indices (0–3)."""
    base = tile_index * 16
    rows = []
    for r in range(8):
        lo = chr_data[base + r]
        hi = chr_data[base + r + 8]
        rows.append([((hi >> b) & 1) << 1 | ((lo >> b) & 1) for b in range(7, -1, -1)])
    return rows


def flip_tile(rows: list[list[int]], hflip: bool, vflip: bool) -> list[list[int]]:
    if vflip:
        rows = rows[::-1]
    if hflip:
        rows = [row[::-1] for row in rows]
    return rows

# ── Palette loading ────────────────────────────────────────────────────────

def load_palettes(path: pathlib.Path) -> dict[int, list[tuple[int, int, int]]]:
    """Return {palette_id: [rgb0, rgb1, rgb2, rgb3]} resolved from NES indices."""
    raw = json.loads(path.read_text())
    out = {}
    for entry in raw:
        pid = entry["id"]
        out[pid] = [NES_PALETTE[i % 64] for i in entry["nes_indices"]]
    return out

# ── Colored render (original CSV-based path) ──────────────────────────────

def render_colored(args) -> None:
    meta = json.loads(args.meta.read_text())
    width = meta["sheet_width"]
    height = meta["sheet_height"]
    print(f"Sheet: {width}×{height}px  tile_size={meta['tile_size']}  cells={meta['cell_count']}")

    chr_data = load_chr_rom(args.rom)
    palettes = load_palettes(args.palettes)

    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    pixels = img.load()

    cell_count = 0
    with open(args.csv, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            col       = int(row["col"])
            r         = int(row["row"])
            chr_tile  = int(row["chr_tile"])
            hflip     = int(row["hflip"]) != 0
            vflip     = int(row["vflip"]) != 0
            pal_id    = int(row["palette_id"])

            tile_rows = decode_tile(chr_data, chr_tile)
            tile_rows = flip_tile(tile_rows, hflip, vflip)
            colors = palettes.get(pal_id, palettes[0])

            ox = col * 8
            oy = r * 8
            for ty in range(8):
                for tx in range(8):
                    idx = tile_rows[ty][tx]
                    if idx == 0 and args.transparent:
                        continue
                    rgb = colors[idx]
                    pixels[ox + tx, oy + ty] = (*rgb, 255)

            cell_count += 1

    if args.scale > 1:
        img = img.resize((width * args.scale, height * args.scale), Image.NEAREST)

    img.save(args.output)
    print(f"Rendered {cell_count} cells → {args.output}  ({img.width}×{img.height}px)")

# ── Indexed render (recipe+layout based, base variant only) ───────────────

def render_indexed(args) -> None:
    layout = json.loads(args.layout.read_text())
    placements = layout["placements"]
    hidden = set(layout.get("hidden_recipes", []))
    chr_data = load_chr_rom(args.rom)

    max_x = 0
    max_y = 0
    sprites = []

    for name, placement in placements.items():
        if name in hidden:
            continue
        recipe_path = args.recipes / f"{name}.recipe.json"
        if not recipe_path.exists():
            print(f"  SKIP {name} (no recipe)")
            continue
        recipe = json.loads(recipe_path.read_text())

        ox = placement["col"] * 8
        oy = placement["row"] * 8
        w = recipe["sheet_width"]
        h = recipe["sheet_height"]
        max_x = max(max_x, ox + w)
        max_y = max(max_y, oy + h)
        sprites.append((name, ox, oy, recipe))

    max_x = -(-max_x // 16) * 16
    max_y = -(-max_y // 16) * 16
    img = Image.new("RGBA", (max_x, max_y), (0, 0, 0, 0))
    pixels = img.load()
    cell_count = 0

    for name, ox, oy, recipe in sprites:
        for m in recipe["mappings"]:
            if m["chr_tile"] is None:
                continue
            tile_rows = decode_tile(chr_data, m["chr_tile"])
            tile_rows = flip_tile(tile_rows, m["hflip"], m["vflip"])

            tx0 = ox + m["col"] * 8
            ty0 = oy + m["row"] * 8
            for ty in range(8):
                for tx in range(8):
                    idx = tile_rows[ty][tx]
                    if idx == 0:
                        continue
                    pixels[tx0 + tx, ty0 + ty] = INDEX_COLORS[idx]
            cell_count += 1

    if args.scale > 1:
        img = img.resize((max_x * args.scale, max_y * args.scale), Image.NEAREST)

    img.save(args.output)
    print(f"Rendered {cell_count} cells ({len(sprites)} sprites) → {args.output}  ({img.width}×{img.height}px)")

# ── Main ───────────────────────────────────────────────────────────────────

def main():
    here = pathlib.Path(__file__).resolve().parent
    root = here.parent

    ap = argparse.ArgumentParser(description="Render spritesheet from CHR mapping")
    ap.add_argument("--rom",        type=pathlib.Path, default=root / "smb.nes")
    ap.add_argument("--csv",        type=pathlib.Path, default=root / "chr-mapping.csv")
    ap.add_argument("--meta",       type=pathlib.Path, default=root / "chr-mapping.json")
    ap.add_argument("--palettes",   type=pathlib.Path, default=root / "palettes.json")
    ap.add_argument("--layout",     type=pathlib.Path, default=root / "export-layout.json")
    ap.add_argument("--recipes",    type=pathlib.Path, default=root / "recipes")
    ap.add_argument("--output",     type=pathlib.Path, default="./tileset.png")
    ap.add_argument("--scale",      type=int,          default=1)
    ap.add_argument("--indexed",    action="store_true", default=0,
                    help="Render palette-indexed (R channel) from recipes+layout, base variant only")
    ap.add_argument("--no-transparent", action="store_true",
                    help="Render index-0 pixels as their palette color instead of transparent")
    args = ap.parse_args()
    args.transparent = not args.no_transparent

    if args.indexed:
        render_indexed(args)
    else:
        render_colored(args)


if __name__ == "__main__":
    main()
