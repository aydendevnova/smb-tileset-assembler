"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import type { ChrTile } from "@/lib/types"

const CHR_GREY = [
  [0, 0, 0],
  [85, 85, 85],
  [170, 170, 170],
  [255, 255, 255],
]

interface ChrGridProps {
  tiles: ChrTile[]
  scale?: number
  columns?: number
  palette?: [number, number, number][]
  highlightTiles?: Set<number>
  onTileClick?: (tile: ChrTile) => void
  onTileHover?: (tile: ChrTile | null) => void
  selectedTile?: number | null
}

export function ChrGrid({
  tiles,
  scale = 3,
  columns = 16,
  palette,
  highlightTiles,
  onTileClick,
  onTileHover,
  selectedTile,
}: ChrGridProps) {
  const colors = palette ?? CHR_GREY
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredTile, setHoveredTile] = useState<number | null>(null)

  const tilePixels = 8 * scale
  const rows = Math.ceil(tiles.length / columns)
  const canvasWidth = columns * tilePixels
  const canvasHeight = rows * tilePixels

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    for (const tile of tiles) {
      const col = tile.index % columns
      const row = Math.floor(tile.index / columns)
      const ox = col * tilePixels
      const oy = row * tilePixels

      for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
          const idx = tile.pixels[py * 8 + px]
          if (idx === 0) continue
          const [r, g, b] = colors[idx]
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillRect(ox + px * scale, oy + py * scale, scale, scale)
        }
      }
    }

    if (highlightTiles && highlightTiles.size > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
      for (const tile of tiles) {
        if (highlightTiles.has(tile.index)) continue
        const col = tile.index % columns
        const row = Math.floor(tile.index / columns)
        ctx.fillRect(col * tilePixels, row * tilePixels, tilePixels, tilePixels)
      }

      ctx.strokeStyle = "#facc15"
      ctx.lineWidth = 2
      for (const idx of highlightTiles) {
        const col = idx % columns
        const row = Math.floor(idx / columns)
        ctx.strokeRect(col * tilePixels + 1, row * tilePixels + 1, tilePixels - 2, tilePixels - 2)
      }
    }

    if (selectedTile !== null && selectedTile !== undefined) {
      const col = selectedTile % columns
      const row = Math.floor(selectedTile / columns)
      ctx.strokeStyle = "#22d3ee"
      ctx.lineWidth = 2
      ctx.strokeRect(col * tilePixels + 1, row * tilePixels + 1, tilePixels - 2, tilePixels - 2)
    }

    if (hoveredTile !== null) {
      const col = hoveredTile % columns
      const row = Math.floor(hoveredTile / columns)
      ctx.strokeStyle = "rgba(255,255,255,0.5)"
      ctx.lineWidth = 1
      ctx.strokeRect(col * tilePixels, row * tilePixels, tilePixels, tilePixels)
    }
  }, [tiles, canvasWidth, canvasHeight, tilePixels, columns, scale, colors, highlightTiles, selectedTile, hoveredTile])

  useEffect(() => { draw() }, [draw])

  function getTileAt(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const col = Math.floor(x / tilePixels)
    const row = Math.floor(y / tilePixels)
    const idx = row * columns + col
    return tiles.find(t => t.index === idx) ?? null
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="border border-white/10 rounded cursor-crosshair"
      style={{ imageRendering: "pixelated", width: canvasWidth, height: canvasHeight }}
      onClick={e => {
        const tile = getTileAt(e)
        if (tile) onTileClick?.(tile)
      }}
      onMouseMove={e => {
        const tile = getTileAt(e)
        setHoveredTile(tile?.index ?? null)
        onTileHover?.(tile ?? null)
      }}
      onMouseLeave={() => {
        setHoveredTile(null)
        onTileHover?.(null)
      }}
    />
  )
}
