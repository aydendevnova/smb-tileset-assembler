"use client"

import { useEffect, useState, useCallback, use } from "react"
import Link from "next/link"
import type { Recipe, ChrTile, TileMapping } from "@/lib/types"
import { SpriteCanvas } from "@/components/sprite-canvas"
import { ChrGrid } from "@/components/chr-grid"
import { TileInspector } from "@/components/tile-inspector"
import { PALETTES, DEFAULT_PALETTE_ID, getPaletteById } from "@/lib/palettes"

export default function RecipeViewerPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [chrTiles, setChrTiles] = useState<ChrTile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [showIndices, setShowIndices] = useState(false)
  const [reassigning, setReassigning] = useState(false)
  const [paletteId, setPaletteId] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/recipes/${name}`).then(r => r.json()),
      fetch("/api/chr").then(r => r.json()),
    ])
      .then(([recipeData, chrData]) => {
        if (recipeData.error) throw new Error(recipeData.error)
        if (chrData.error) throw new Error(chrData.error)
        setRecipe(recipeData)
        setPaletteId(recipeData.palette_id ?? DEFAULT_PALETTE_ID)
        setChrTiles(chrData.tiles)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [name])

  const updateMapping = useCallback((idx: number, patch: Partial<TileMapping>) => {
    setRecipe(prev => {
      if (!prev) return prev
      const updated = { ...prev, mappings: [...prev.mappings] }
      updated.mappings[idx] = { ...updated.mappings[idx], ...patch }
      return updated
    })
    setDirty(true)
    setSaveMsg(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!recipe) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`/api/recipes/${name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDirty(false)
      setSaveMsg("Saved")
      setTimeout(() => setSaveMsg(null), 2000)
    } catch (e) {
      setSaveMsg(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }, [recipe, name])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-white/40">Loading recipe...</div>
  }
  if (error || !recipe) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
        {error || "Recipe not found"}
      </div>
    )
  }

  const activePalette = getPaletteById(paletteId ?? recipe.palette_id ?? DEFAULT_PALETTE_ID)

  const selectedMapping = selectedIdx !== null ? recipe.mappings[selectedIdx] ?? null : null
  const usedTileIndices = new Set(recipe.mappings.map(m => m.chr_tile).filter((t): t is number => t != null))
  const totalMapped = recipe.mappings.length

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition-colors text-sm">&larr; Back</Link>
          <h1 className="text-2xl font-bold font-mono">{name}</h1>
  
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className={`text-xs font-mono ${saveMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              dirty
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-white/5 text-white/30 cursor-default"
            }`}
          >
            {saving ? "Saving..." : dirty ? "Save Changes" : "Saved"}
          </button>
        </div>
      </div>

      {/* Palette selector */}
      <div className="space-y-1.5">
        <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">Palette</h2>
        <div className="flex gap-2 flex-wrap">
          {PALETTES.map(p => {
            const isActive = p.id === activePalette.id
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Sprite preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">Sprite Preview</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  showGrid ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10" : "border-white/10 text-white/40"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setShowIndices(!showIndices)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  showIndices ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10" : "border-white/10 text-white/40"
                }`}
              >
                Indices
              </button>
            </div>
          </div>

          <div className="overflow-auto">
            <SpriteCanvas
              mappings={recipe.mappings}
              chrTiles={chrTiles}
              width={recipe.sheet_width}
              height={recipe.sheet_height}
              scale={4}
              palette={activePalette.colors}
              showGrid={showGrid}
              showIndices={showIndices}
              highlightMapping={hoveredIdx ?? selectedIdx}
              onMappingClick={(_m, idx) => {
                setSelectedIdx(idx)
                setReassigning(false)
              }}
              onMappingHover={(_m, idx) => setHoveredIdx(idx)}
            />
          </div>

          <div className="text-xs font-mono text-white/30">
            {recipe.sheet_width}x{recipe.sheet_height} px &mdash; {totalMapped} tiles mapped
          </div>

          <TileInspector
            mapping={selectedMapping}
            chrTiles={chrTiles}
            isReassigning={reassigning}
            onReassignStart={() => setReassigning(true)}
            onReassignCancel={() => setReassigning(false)}
            onFlipChange={(hflip, vflip) => {
              if (selectedIdx !== null) {
                updateMapping(selectedIdx, { hflip, vflip })
              }
            }}
            onClearTile={() => {
              if (selectedIdx !== null) {
                updateMapping(selectedIdx, { chr_tile: null as unknown as number })
              }
            }}
          />
        </div>

        {/* Right: CHR ROM */}
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">
            CHR ROM — {usedTileIndices.size} tiles used
            {reassigning && (
              <span className="text-yellow-400 ml-2 normal-case">— click a tile to assign</span>
            )}
          </h2>

          <div className="overflow-auto">
            <ChrGrid
              tiles={chrTiles}
              scale={3}
              columns={16}
              palette={activePalette.colors}
              highlightTiles={usedTileIndices}
              selectedTile={selectedMapping?.chr_tile ?? null}
              onTileClick={(tile) => {
                if (reassigning && selectedIdx !== null) {
                  updateMapping(selectedIdx, {
                    chr_tile: tile.index,
                    hflip: false,
                    vflip: false,
                  })
                  setReassigning(false)
                } else {
                  const idx = recipe.mappings.findIndex(m => m.chr_tile === tile.index)
                  if (idx >= 0) {
                    setSelectedIdx(idx)
                    setReassigning(false)
                  }
                }
              }}
            />
          </div>

          <div className="text-xs font-mono text-white/30">
            {reassigning
              ? "Click any CHR tile above to assign it to the selected sprite cell"
              : "Yellow = tiles used by this recipe. Click to inspect."
            }
          </div>

          {/* Mapping table */}
          <div className="space-y-2">
            <h3 className="text-sm font-mono text-white/50 uppercase tracking-wider">All Mappings</h3>
            <div className="max-h-64 overflow-y-auto border border-white/10 rounded-lg">
              <table className="w-full text-xs font-mono">
                <thead className="sticky top-0 bg-[#0a0a0f] border-b border-white/10">
                  <tr className="text-white/40">
                    <th className="px-2 py-1.5 text-left">Pos</th>
                    <th className="px-2 py-1.5 text-left">CHR</th>
                    <th className="px-2 py-1.5 text-left">Flip</th>
                  </tr>
                </thead>
                <tbody>
                  {recipe.mappings.map((m, i) => (
                    <tr
                      key={i}
                      className={`border-b border-white/5 cursor-pointer transition-colors ${
                        hoveredIdx === i ? "bg-white/10" : "hover:bg-white/5"
                      } ${selectedIdx === i ? "bg-cyan-500/10" : ""}`}
                      onClick={() => { setSelectedIdx(i); setReassigning(false) }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      <td className="px-2 py-1 text-white/60">({m.col},{m.row})</td>
                      <td className={`px-2 py-1 ${m.chr_tile != null ? "text-cyan-400" : "text-red-400"}`}>
                        {m.chr_tile != null ? m.chr_tile : "—"}
                      </td>
                      <td className="px-2 py-1 text-white/40">
                        {m.hflip ? "H" : ""}{m.vflip ? "V" : ""}{!m.hflip && !m.vflip ? "—" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
