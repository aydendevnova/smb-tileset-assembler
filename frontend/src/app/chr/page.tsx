"use client"

import { useEffect, useState } from "react"
import type { ChrTile } from "@/lib/types"
import { PALETTES, DEFAULT_PALETTE_ID, getPaletteById } from "@/lib/palettes"
import { ChrGrid } from "@/components/chr-grid"

export default function ChrPage() {
  const [chrTiles, setChrTiles] = useState<ChrTile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredTile, setHoveredTile] = useState<ChrTile | null>(null)
  const [selectedTile, setSelectedTile] = useState<ChrTile | null>(null)
  const [scale, setScale] = useState(3)
  const [paletteId, setPaletteId] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/chr")
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setChrTiles(data.tiles)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-white/40">Loading CHR data...</div>
  }
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">{error}</div>
    )
  }

  const activeTile = selectedTile || hoveredTile
  const palette = paletteId !== null ? getPaletteById(paletteId) : null
  const paletteColors = palette?.colors
  const tilePreviewColors = paletteColors
    ? paletteColors.map(c => `rgb(${c[0]},${c[1]},${c[2]})`)
    : ["#000", "#555", "#aaa", "#fff"]

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">CHR ROM</h1>
          <p className="text-sm text-white/40 mt-1">{chrTiles.length} tiles</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-white/40 font-mono">Scale:</label>
          {[2, 3, 4, 6].map(s => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                scale === s ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10" : "border-white/10 text-white/40"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Palette selector */}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setPaletteId(null)}
          title="Greyscale"
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded border transition-colors ${
            paletteId === null
              ? "border-cyan-500 bg-cyan-500/10"
              : "border-white/10 hover:border-white/30 bg-white/5"
          }`}
        >
          <div className="flex">
            {["#555", "#aaa", "#fff"].map((c, i) => (
              <div key={i} className="w-4 h-4 first:rounded-l last:rounded-r" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className={`text-[10px] font-mono ${paletteId === null ? "text-cyan-400" : "text-white/40"}`}>
            Grey
          </span>
        </button>
        {PALETTES.map(p => {
          const isActive = paletteId === p.id
          return (
            <button
              key={p.id}
              onClick={() => setPaletteId(p.id)}
              title={p.label}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded border transition-colors ${
                isActive
                  ? "border-cyan-500 bg-cyan-500/10"
                  : "border-white/10 hover:border-white/30 bg-white/5"
              }`}
            >
              <div className="flex">
                {p.colors.slice(1).map((c, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 first:rounded-l last:rounded-r"
                    style={{ backgroundColor: `rgb(${c[0]},${c[1]},${c[2]})` }}
                  />
                ))}
              </div>
              <span className={`text-[10px] font-mono ${isActive ? "text-cyan-400" : "text-white/40"}`}>
                {p.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="overflow-auto bg-blue-200">
          <ChrGrid
            tiles={chrTiles}
            scale={scale}
            columns={16}
            palette={paletteColors}
            selectedTile={selectedTile?.index ?? null}
            onTileClick={setSelectedTile}
            onTileHover={setHoveredTile}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">Tile Info</h2>

          {activeTile ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div
                className="border border-white/20 rounded mx-auto"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(8, 8px)",
                  gridTemplateRows: "repeat(8, 8px)",
                  width: 64,
                  height: 64,
                }}
              >
                {activeTile.pixels.map((px, i) => (
                  <div
                    key={i}
                    style={{ backgroundColor: tilePreviewColors[px] }}
                  />
                ))}
              </div>

              <div className="text-sm font-mono space-y-1">
                <div>
                  <span className="text-white/50">Index: </span>
                  <span className="text-cyan-400 font-bold">{activeTile.index}</span>
                  <span className="text-white/30"> (0x{activeTile.index.toString(16).toUpperCase().padStart(2, "0")})</span>
                </div>
                <div>
                  <span className="text-white/50">Row: </span>{Math.floor(activeTile.index / 16)}
                  <span className="text-white/30 mx-2">|</span>
                  <span className="text-white/50">Col: </span>{activeTile.index % 16}
                </div>
                <div>
                  <span className="text-white/50">Bank: </span>
                  {activeTile.index < 256 ? "Left (sprites)" : "Right (BG)"}
                </div>
              </div>

              <div className="text-xs font-mono text-white/30 pt-2 border-t border-white/10">
                Raw pixel indices:
                <div className="mt-1 leading-relaxed break-all">
                  {Array.from({ length: 8 }, (_, row) =>
                    activeTile.pixels.slice(row * 8, row * 8 + 8).join("")
                  ).join("\n").split("\n").map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/40">
              Hover or click a tile to inspect
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
