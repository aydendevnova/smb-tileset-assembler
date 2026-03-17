import type { ChrTile, Recipe, TileMapping } from "./types"

const FLIP_VARIANTS: [boolean, boolean][] = [
  [false, false],
  [true, false],
  [false, true],
  [true, true],
]

function flipTile(pixels: number[], hflip: boolean, vflip: boolean): number[] {
  if (!hflip && !vflip) return pixels
  const rows: number[][] = []
  for (let r = 0; r < 8; r++) rows.push(pixels.slice(r * 8, r * 8 + 8))
  const flipped = vflip ? [...rows].reverse() : rows
  return flipped.flatMap(row => (hflip ? [...row].reverse() : row))
}

function getImagePixels(img: HTMLImageElement) {
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

function isCellEmpty(
  data: Uint8ClampedArray,
  imgWidth: number,
  cx: number,
  cy: number,
): boolean {
  let firstKey: string | null = null
  for (let py = 0; py < 8; py++) {
    for (let px = 0; px < 8; px++) {
      const off = ((cy + py) * imgWidth + (cx + px)) * 4
      if (data[off + 3] < 10) continue
      const key = `${data[off]},${data[off + 1]},${data[off + 2]}`
      if (firstKey === null) firstKey = key
      else if (firstKey !== key) return false
    }
  }
  return true
}

// Structural bijection matching: discovers the color-to-CHR-index mapping
// per cell rather than relying on a global luminance normalization.
// For each pixel, builds a bijection between image colors and CHR indices.
// Colors within `tolerance` of an already-mapped color are treated as the same.
function scoreCellAgainstTile(
  data: Uint8ClampedArray,
  imgWidth: number,
  cx: number,
  cy: number,
  tilePixels: number[],
  tolerance: number,
): number {
  const colorToIdx = new Map<string, number>()
  const idxToColor = new Map<number, string>()
  let score = 0

  for (let py = 0; py < 8; py++) {
    for (let px = 0; px < 8; px++) {
      const off = ((cy + py) * imgWidth + (cx + px)) * 4
      const r = data[off]
      const g = data[off + 1]
      const b = data[off + 2]
      const a = data[off + 3]
      const chrIdx = tilePixels[py * 8 + px]

      if (a < 10) {
        if (chrIdx === 0) score++
        continue
      }

      const colorKey = `${r},${g},${b}`

      if (colorToIdx.has(colorKey)) {
        if (colorToIdx.get(colorKey) === chrIdx) score++
      } else if (idxToColor.has(chrIdx)) {
        const [er, eg, eb] = idxToColor.get(chrIdx)!.split(",").map(Number)
        if (
          Math.abs(r - er) <= tolerance &&
          Math.abs(g - eg) <= tolerance &&
          Math.abs(b - eb) <= tolerance
        ) {
          colorToIdx.set(colorKey, chrIdx)
          score++
        }
      } else {
        colorToIdx.set(colorKey, chrIdx)
        idxToColor.set(chrIdx, colorKey)
        score++
      }
    }
  }

  return score
}

export function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }
    img.src = url
  })
}

export function mapImageClientSide(
  img: HTMLImageElement,
  chrTiles: ChrTile[],
  tolerance: number = 15,
): Recipe {
  const { width, height, data } = getImagePixels(img)

  if (width % 8 !== 0 || height % 8 !== 0)
    throw new Error(`Image ${width}\u00d7${height} is not divisible by 8`)

  const cols = width / 8
  const rows = height / 8
  const mappings: TileMapping[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ox = col * 8
      const oy = row * 8

      if (isCellEmpty(data, width, ox, oy)) {
        mappings.push({ col, row, chr_tile: null, hflip: false, vflip: false })
        continue
      }

      let bestScore = 0
      let bestTile = 0
      let bestH = false
      let bestV = false

      for (const tile of chrTiles) {
        for (const [hflip, vflip] of FLIP_VARIANTS) {
          const flipped = flipTile(tile.pixels, hflip, vflip)
          const score = scoreCellAgainstTile(
            data, width, ox, oy, flipped, tolerance,
          )
          if (score > bestScore) {
            bestScore = score
            bestTile = tile.index
            bestH = hflip
            bestV = vflip
            if (score === 64) break
          }
        }
        if (bestScore === 64) break
      }

      mappings.push({
        col,
        row,
        chr_tile: bestTile,
        hflip: bestH,
        vflip: bestV,
      })
    }
  }

  return {
    sheet_width: width,
    sheet_height: height,
    tile_size: 8,
    mappings,
  }
}
