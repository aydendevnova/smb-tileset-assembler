"use client"

import { useState, useCallback } from "react"
import type { Recipe, ChrTile, TileMapping } from "@/lib/types"
import { PALETTES, DEFAULT_PALETTE_ID, getPaletteById, toPaletteSlots, getThemeSlot, THEME_SLOT_COUNT, THEME_LABELS } from "@/lib/palettes"
import { SpriteCanvas } from "@/components/sprite-canvas"
import { ChrGrid } from "@/components/chr-grid"
import { TileInspector } from "@/components/tile-inspector"

interface RecipeEditorProps {
  initialRecipe: Recipe
  recipeName: string
  chrTiles: ChrTile[]
  onSaved?: () => void
}

export function RecipeEditor({ initialRecipe, recipeName, chrTiles, onSaved }: RecipeEditorProps) {
  const [recipe, setRecipe] = useState<Recipe>(initialRecipe)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [showIndices, setShowIndices] = useState(false)
  const [reassigning, setReassigning] = useState(false)

  const activePalette = getPaletteById(recipe.palette_id ?? DEFAULT_PALETTE_ID)

  function setPaletteId(id: number) {
    setRecipe(prev => ({ ...prev, palette_id: id }))
    setDirty(true)
    setSaveMsg(null)
  }

  const updateMapping = useCallback((idx: number, patch: Partial<TileMapping>) => {
    setRecipe(prev => {
      const updated = { ...prev, mappings: [...prev.mappings] }
      updated.mappings[idx] = { ...updated.mappings[idx], ...patch }
      return updated
    })
    setDirty(true)
    setSaveMsg(null)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const slots = recipe.other_palette_ids ?? []
      const padded = slots.length >= THEME_SLOT_COUNT
        ? slots.slice(0, THEME_SLOT_COUNT)
        : [...slots, ...Array(THEME_SLOT_COUNT - slots.length).fill(null)]
      const normalized = {
        ...recipe,
        other_palette_ids: padded as (number | null)[],
      }
      setRecipe(normalized)
      const res = await fetch(`/api/recipes/${recipeName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDirty(false)
      setSaveMsg("Saved")
      onSaved?.()
      setTimeout(() => setSaveMsg(null), 2000)
    } catch (e) {
      setSaveMsg(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }, [recipe, recipeName, onSaved])

  function toggleOtherPalette(id: number) {
    const slots = [...(recipe.other_palette_ids ?? [])]
    while (slots.length < THEME_SLOT_COUNT) slots.push(null)
    const existingIdx = slots.indexOf(id)
    if (existingIdx >= 0) {
      slots[existingIdx] = null
    } else {
      const themeSlot = getThemeSlot(id)
      if (themeSlot != null) {
        slots[themeSlot] = id
      } else {
        const freeIdx = slots.findIndex(s => s == null)
        if (freeIdx >= 0) slots[freeIdx] = id
      }
    }
    setRecipe(prev => ({ ...prev, other_palette_ids: slots }))
    setDirty(true)
    setSaveMsg(null)
  }

  const selectedMapping = selectedIdx !== null ? recipe.mappings[selectedIdx] ?? null : null
  const usedTileIndices = new Set(recipe.mappings.map(m => m.chr_tile).filter((t): t is number => t != null))
  const hasMappings = recipe.mappings.length > 0
  const totalMapped = recipe.mappings.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono">{recipeName}</h1>
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
      <div className="space-y-3">
        <div className="space-y-1.5">
          <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">Primary Palette</h2>
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

        <div className="space-y-1.5">
          <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">Other Valid Palettes</h2>
          <div className="flex gap-2 flex-wrap">
            {PALETTES.filter(p => p.id !== activePalette.id).map(p => {
              const isSelected = (recipe.other_palette_ids ?? []).some(s => s === p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => toggleOtherPalette(p.id)}
                  title={p.label}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded border transition-colors ${
                    isSelected
                      ? "border-green-500 bg-green-500/10"
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
                  <span className={`text-[10px] font-mono ${isSelected ? "text-green-400" : "text-white/40"}`}>
                    {p.label}
                  </span>
                </button>
              )
            })}
          </div>
          {(recipe.other_palette_ids ?? []).every(s => s == null) && (
            <p className="text-xs text-white/25 font-mono">Click palettes above to mark them as valid alternates</p>
          )}
        </div>
      </div>

  

      {/* Metadata fields */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={recipe.godot_tileset ?? false}
            onChange={e => {
              setRecipe(prev => ({ ...prev, godot_tileset: e.target.checked }))
              setDirty(true)
              setSaveMsg(null)
            }}
            className="w-4 h-4 rounded border-white/20 bg-white/5 accent-cyan-500"
          />
          <span className="text-sm font-mono text-white/60 group-hover:text-white/80 transition-colors">
            godot_tileset
          </span>
        </label>

        <div className="flex items-center gap-2">
          <label className="text-sm font-mono text-white/60">metatile_id</label>
          <input
            type="number"
            value={recipe.metatile_id ?? ""}
            onChange={e => {
              const val = e.target.value === "" ? null : parseInt(e.target.value, 10)
              setRecipe(prev => ({ ...prev, metatile_id: val }))
              setDirty(true)
              setSaveMsg(null)
            }}
            placeholder="—"
            className="w-20 px-2 py-1 text-sm font-mono rounded border border-white/10 bg-white/5 text-white placeholder-white/20 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {!hasMappings ? (
        <div className="text-center py-16 text-white/30">
          <p className="text-lg">No sprite tiles in this recipe</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                if (selectedIdx !== null) updateMapping(selectedIdx, { hflip, vflip })
              }}
              onClearTile={() => {
                if (selectedIdx !== null)
                  updateMapping(selectedIdx, { chr_tile: null })
              }}
            />

{hasMappings && (recipe.other_palette_ids ?? []).some(s => s != null) && (
        <div className="space-y-2">
          <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">Theme Previews</h2>
          <div className="flex gap-4 flex-wrap">
            {(recipe.other_palette_ids ?? []).map((pid, idx) => {
              if (pid == null) return null
              const pal = getPaletteById(pid)
              return (
                <div key={idx} className="space-y-1">
                  <p className="text-[10px] font-mono text-green-400">
                    {THEME_LABELS[idx + 1] ?? `Alt ${idx + 1}`} — {pal.label}
                  </p>
                  <div className="border border-green-500/30 overflow-hidden bg-[#6c6aff] w-fit">
                    <SpriteCanvas
                      mappings={recipe.mappings}
                      chrTiles={chrTiles}
                      width={recipe.sheet_width}
                      height={recipe.sheet_height}
                      scale={3}
                      palette={pal.colors}
                      altIndex={idx}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">
              CHR ROM &mdash; {usedTileIndices.size} tiles used
              {reassigning && (
                <span className="text-yellow-400 ml-2 normal-case">&mdash; click a tile to assign</span>
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
                : "Yellow = tiles used by this recipe. Click to inspect."}
            </div>

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
                          {m.chr_tile != null ? m.chr_tile : "\u2014"}
                        </td>
                        <td className="px-2 py-1 text-white/40">
                          {m.hflip ? "H" : ""}{m.vflip ? "V" : ""}{!m.hflip && !m.vflip ? "\u2014" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  )
}
