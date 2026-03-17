"use client"

import { useRef, useEffect, useCallback } from "react"
import type { ChrTile, TileMapping } from "@/lib/types"
import { getPaletteById } from "@/lib/palettes"

const CHR_GREY: [number, number, number][] = [
  [0, 0, 0],
  [85, 85, 85],
  [170, 170, 170],
  [255, 255, 255],
]

interface SpriteCanvasProps {
  mappings: TileMapping[]
  chrTiles: ChrTile[]
  width: number
  height: number
  scale?: number
  showGrid?: boolean
  showIndices?: boolean
  palette?: [number, number, number][]
  bgColor?: [number, number, number]
  altIndex?: number | null
  highlightMapping?: number | null
  onMappingClick?: (mapping: TileMapping, index: number) => void
  onMappingHover?: (mapping: TileMapping | null, index: number | null) => void
}

function flipPixels(pixels: number[], hflip: boolean, vflip: boolean): number[] {
  if (!hflip && !vflip) return pixels
  const rows: number[][] = []
  for (let r = 0; r < 8; r++) rows.push(pixels.slice(r * 8, r * 8 + 8))
  const flipped = vflip ? [...rows].reverse() : rows
  return flipped.flatMap(row => hflip ? [...row].reverse() : row)
}

export function SpriteCanvas({
  mappings,
  chrTiles,
  width,
  height,
  scale = 4,
  showGrid = false,
  showIndices = false,
  palette,
  bgColor = [108, 106, 255],
  altIndex,
  highlightMapping,
  onMappingClick,
  onMappingHover,
}: SpriteCanvasProps) {
  const colors = palette ?? CHR_GREY
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasW = width * scale
  const canvasH = height * scale

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = `rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]})`
    ctx.fillRect(0, 0, canvasW, canvasH)

    for (const m of mappings) {
      const mx = m.col * 8
      const my = m.row * 8

      if (m.chr_tile == null) {
        ctx.fillStyle = "rgba(255,255,255,0.03)"
        for (let py = 0; py < 8; py++)
          for (let px = 0; px < 8; px++)
            if ((px + py) % 2 === 0)
              ctx.fillRect((mx + px) * scale, (my + py) * scale, scale, scale)
        continue
      }

      const tile = chrTiles.find(t => t.index === m.chr_tile)
      if (!tile) continue
      const pixels = flipPixels(tile.pixels, m.hflip, m.vflip)
      const mappingPalId = altIndex != null && m.other_palette_ids?.[altIndex] != null
        ? m.other_palette_ids[altIndex]
        : m.palette_id
      const tileColors = mappingPalId != null ? getPaletteById(mappingPalId).colors : colors

      for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
          const idx = pixels[py * 8 + px]
          if (idx === 0) continue
          const [r, g, b] = tileColors[idx]
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillRect((mx + px) * scale, (my + py) * scale, scale, scale)
        }
      }
    }

    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)"
      ctx.lineWidth = 1
      for (let x = 0; x <= width; x += 8) {
        ctx.beginPath()
        ctx.moveTo(x * scale, 0)
        ctx.lineTo(x * scale, canvasH)
        ctx.stroke()
      }
      for (let y = 0; y <= height; y += 8) {
        ctx.beginPath()
        ctx.moveTo(0, y * scale)
        ctx.lineTo(canvasW, y * scale)
        ctx.stroke()
      }
    }

    if (showIndices) {
      const fontSize = Math.max(8, scale * 2)
      ctx.font = `bold ${fontSize}px monospace`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      for (const m of mappings) {
        if (m.chr_tile == null) continue
        const cx = (m.col * 8 + 4) * scale
        const cy = (m.row * 8 + 4) * scale
        const label = `${m.chr_tile}`

        ctx.fillStyle = "rgba(0,0,0,0.7)"
        const metrics = ctx.measureText(label)
        const pw = metrics.width + 4
        const ph = fontSize + 2
        ctx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph)

        ctx.fillStyle = "#4ade80"
        ctx.fillText(label, cx, cy)
      }
    }

    if (highlightMapping !== null && highlightMapping !== undefined) {
      const m = mappings[highlightMapping]
      if (m) {
        ctx.strokeStyle = "#22d3ee"
        ctx.lineWidth = 2
        ctx.strokeRect(m.col * 8 * scale + 1, m.row * 8 * scale + 1, 8 * scale - 2, 8 * scale - 2)
      }
    }
  }, [mappings, chrTiles, width, height, scale, canvasW, canvasH, showGrid, showIndices, colors, bgColor, altIndex, highlightMapping])

  useEffect(() => { draw() }, [draw])

  function getMappingAt(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const sx = canvasW / rect.width
    const sy = canvasH / rect.height
    const px = Math.floor((e.clientX - rect.left) * sx / scale)
    const py = Math.floor((e.clientY - rect.top) * sy / scale)

    for (let i = 0; i < mappings.length; i++) {
      const m = mappings[i]
      const mx = m.col * 8
      const my = m.row * 8
      if (px >= mx && px < mx + 8 && py >= my && py < my + 8) {
        return { mapping: m, index: i }
      }
    }
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      className="border border-white/10 cursor-crosshair"
      style={{ imageRendering: "pixelated" }}
      onClick={e => {
        const hit = getMappingAt(e)
        if (hit) onMappingClick?.(hit.mapping, hit.index)
      }}
      onMouseMove={e => {
        const hit = getMappingAt(e)
        onMappingHover?.(hit?.mapping ?? null, hit?.index ?? null)
      }}
      onMouseLeave={() => onMappingHover?.(null, null)}
    />
  )
}
