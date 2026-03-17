"use client"

import type { TileMapping, ChrTile } from "@/lib/types"

const CHR_COLORS = ["#000", "#555", "#aaa", "#fff"]

interface TileInspectorProps {
  mapping: TileMapping | null
  chrTiles: ChrTile[]
  isReassigning?: boolean
  onReassignStart?: () => void
  onReassignCancel?: () => void
  onFlipChange?: (hflip: boolean, vflip: boolean) => void
  onClearTile?: () => void
}

function flipPixels(pixels: number[], hflip: boolean, vflip: boolean): number[] {
  if (!hflip && !vflip) return pixels
  const rows: number[][] = []
  for (let r = 0; r < 8; r++) rows.push(pixels.slice(r * 8, r * 8 + 8))
  const flipped = vflip ? [...rows].reverse() : rows
  return flipped.flatMap(row => hflip ? [...row].reverse() : row)
}

export function TileInspector({
  mapping,
  chrTiles,
  isReassigning,
  onReassignStart,
  onReassignCancel,
  onFlipChange,
  onClearTile,
}: TileInspectorProps) {
  if (!mapping) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/40">
        Click a tile in the sprite to inspect and edit
      </div>
    )
  }

  const hasTile = mapping.chr_tile != null
  const tile = hasTile ? chrTiles.find(t => t.index === mapping.chr_tile) : null
  const displayPixels = tile ? flipPixels(tile.pixels, mapping.hflip, mapping.vflip) : null

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-4">
        <div
          className="border border-white/20 rounded shrink-0"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 6px)",
            gridTemplateRows: "repeat(8, 6px)",
            width: 48,
            height: 48,
          }}
        >
          {displayPixels
            ? displayPixels.map((px, i) => (
                <div key={i} style={{ backgroundColor: CHR_COLORS[px] }} />
              ))
            : Array.from({ length: 64 }, (_, i) => (
                <div key={i} style={{ backgroundColor: i % 2 === 0 ? "#1a1a2e" : "#12121f" }} />
              ))
          }
        </div>

        <div className="space-y-1 text-sm font-mono flex-1">
          <div>
            <span className="text-white/50">CHR tile: </span>
            {hasTile ? (
              <>
                <span className="text-cyan-400 font-bold">{mapping.chr_tile}</span>
                <span className="text-white/30"> (0x{mapping.chr_tile!.toString(16).toUpperCase().padStart(2, "0")})</span>
              </>
            ) : (
              <span className="text-red-400">unassigned</span>
            )}
          </div>
          <div>
            <span className="text-white/50">Position: </span>
            col {mapping.col}, row {mapping.row}
          </div>
          <div>
            <span className="text-white/50">Flip: </span>
            {mapping.hflip ? "H" : "—"}{mapping.vflip ? "V" : "—"}
          </div>
        </div>
      </div>

      {/* Edit controls */}
      <div className="border-t border-white/10 pt-3 space-y-2">
        {/* Flip toggles */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 font-mono w-10">Flip:</span>
          <button
            onClick={() => onFlipChange?.(!mapping.hflip, mapping.vflip)}
            className={`text-xs px-3 py-1 rounded border font-mono transition-colors ${
              mapping.hflip
                ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
                : "border-white/10 text-white/40 hover:border-white/30"
            }`}
          >
            H-Flip
          </button>
          <button
            onClick={() => onFlipChange?.(mapping.hflip, !mapping.vflip)}
            className={`text-xs px-3 py-1 rounded border font-mono transition-colors ${
              mapping.vflip
                ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
                : "border-white/10 text-white/40 hover:border-white/30"
            }`}
          >
            V-Flip
          </button>
        </div>

        {/* Reassign / Clear */}
        <div className="flex items-center gap-2">
          {isReassigning ? (
            <>
              <span className="text-xs text-yellow-400 font-mono flex-1">
                Click a CHR tile on the right to assign
              </span>
              <button
                onClick={onReassignCancel}
                className="text-xs px-3 py-1 border border-white/20 text-white/50 rounded hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onReassignStart}
                className="text-xs px-3 py-1 border border-yellow-500/40 text-yellow-400 rounded hover:bg-yellow-500/10 transition-colors font-mono"
              >
                {hasTile ? "Reassign" : "Assign Tile"}
              </button>
              {hasTile && (
                <button
                  onClick={onClearTile}
                  className="text-xs px-3 py-1 border border-red-500/30 text-red-400 rounded hover:bg-red-500/10 transition-colors font-mono"
                >
                  Clear
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
