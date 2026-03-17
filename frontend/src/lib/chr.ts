import fs from "fs"
import type { ChrTile } from "./types"

const INES_MAGIC = Buffer.from([0x4e, 0x45, 0x53, 0x1a])
const HEADER_SIZE = 16
const PRG_PAGE = 16 * 1024
const CHR_PAGE = 8 * 1024

export function loadChrTiles(romPath: string): ChrTile[] {
  const rom = fs.readFileSync(romPath)

  if (rom.subarray(0, 4).compare(INES_MAGIC) !== 0)
    throw new Error("Not an iNES file")

  const prgBanks = rom[4]
  const chrBanks = rom[5]
  if (chrBanks === 0)
    throw new Error("ROM has CHR-RAM — no CHR-ROM in file")

  const chrStart = HEADER_SIZE + prgBanks * PRG_PAGE
  const chrSize = chrBanks * CHR_PAGE
  const chrData = rom.subarray(chrStart, chrStart + chrSize)

  const tileCount = chrSize / 16
  const tiles: ChrTile[] = []

  for (let i = 0; i < tileCount; i++) {
    const offset = i * 16
    const pixels: number[] = []

    for (let row = 0; row < 8; row++) {
      const lo = chrData[offset + row]
      const hi = chrData[offset + row + 8]
      for (let bit = 7; bit >= 0; bit--) {
        pixels.push(((hi >> bit) & 1) << 1 | ((lo >> bit) & 1))
      }
    }

    tiles.push({ index: i, pixels })
  }

  return tiles
}

export function flipTile(pixels: number[], hflip: boolean, vflip: boolean): number[] {
  if (!hflip && !vflip) return pixels

  const rows: number[][] = []
  for (let r = 0; r < 8; r++) {
    rows.push(pixels.slice(r * 8, r * 8 + 8))
  }

  const flipped = vflip ? rows.reverse() : rows
  const result: number[] = []
  for (const row of flipped) {
    result.push(...(hflip ? row.reverse() : row))
  }
  return result
}

export function matchCell(
  cell: number[],
  tiles: ChrTile[],
): { tileIndex: number; hflip: boolean; vflip: boolean; score: number } {
  let bestScore = 0
  let bestTile = 0
  let bestH = false
  let bestV = false

  const flips: [boolean, boolean][] = [
    [false, false], [true, false], [false, true], [true, true],
  ]

  for (const tile of tiles) {
    for (const [hflip, vflip] of flips) {
      const flipped = flipTile(tile.pixels, hflip, vflip)
      let score = 0
      for (let i = 0; i < 64; i++) {
        if (cell[i] === flipped[i]) score++
      }
      if (score > bestScore) {
        bestScore = score
        bestTile = tile.index
        bestH = hflip
        bestV = vflip
        if (score === 64) return { tileIndex: bestTile, hflip: bestH, vflip: bestV, score: 64 }
      }
    }
  }

  return { tileIndex: bestTile, hflip: bestH, vflip: bestV, score: bestScore }
}

export function renderTileToRGBA(
  pixels: number[],
  palette: [number, number, number][],
): Uint8Array {
  const rgba = new Uint8Array(64 * 4)
  for (let i = 0; i < 64; i++) {
    const [r, g, b] = palette[pixels[i]]
    rgba[i * 4] = r
    rgba[i * 4 + 1] = g
    rgba[i * 4 + 2] = b
    rgba[i * 4 + 3] = pixels[i] === 0 ? 0 : 255
  }
  return rgba
}
