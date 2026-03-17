"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Recipe, ChrTile, TileMapping } from "@/lib/types"
import { PALETTES, DEFAULT_PALETTE_ID, getPaletteById, CATEGORY_PRESETS, type CategoryPreset } from "@/lib/palettes"
import { SpriteCanvas } from "@/components/sprite-canvas"
import { ChrGrid } from "@/components/chr-grid"
import { TileInspector } from "@/components/tile-inspector"
import { mapImageClientSide, loadImageElement } from "@/lib/client-mapper"

type ImportStep = "upload" | "review" | "label"

export default function ImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<ImportStep>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [chrTiles, setChrTiles] = useState<ChrTile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [spriteName, setSpriteName] = useState("")
  const [selectedPreset, setSelectedPreset] = useState<CategoryPreset | null>(null)
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE_ID)
  const [tolerance, setTolerance] = useState(15)

  const [selectedMapping, setSelectedMapping] = useState<TileMapping | null>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [showIndices, setShowIndices] = useState(true)

  const [reassigningIdx, setReassigningIdx] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/chr")
      .then(r => r.json())
      .then(data => { if (!data.error) setChrTiles(data.tiles) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (step !== "upload") return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (!item.type.startsWith("image/")) continue
        const blob = item.getAsFile()
        if (!blob) continue
        e.preventDefault()
        const pasted = new File([blob], "pasted-sprite.png", { type: blob.type })
        setFile(pasted)
        setPreview(URL.createObjectURL(pasted))
        if (!spriteName) setSpriteName("pasted_sprite")
        break
      }
    }
    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [step, spriteName])

  function selectPreset(preset: CategoryPreset | null) {
    setSelectedPreset(preset)
    if (preset) {
      setPaletteId(preset.palette_id)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.type.startsWith("image/")) {
      setFile(dropped)
      setPreview(URL.createObjectURL(dropped))
      setSpriteName(dropped.name.replace(/\.[^.]+$/, ""))
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setPreview(URL.createObjectURL(selected))
      setSpriteName(selected.name.replace(/\.[^.]+$/, ""))
    }
  }, [])

  async function runAutoDetect() {
    if (!file || chrTiles.length === 0) return
    setLoading(true)
    setError(null)

    try {
      const img = await loadImageElement(file)
      await new Promise(r => setTimeout(r, 0))

      const result = mapImageClientSide(img, chrTiles, tolerance)
      result.name = spriteName
      setRecipe(result)
      setStep("review")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function handleReassignTile(chrTile: ChrTile) {
    if (reassigningIdx === null || !recipe) return

    const updated = { ...recipe }
    updated.mappings = [...updated.mappings]
    const m = { ...updated.mappings[reassigningIdx] }
    m.chr_tile = chrTile.index
    m.hflip = false
    m.vflip = false
    updated.mappings[reassigningIdx] = m

    setRecipe(updated)
    setSelectedMapping(m)
    setReassigningIdx(null)
  }

  async function saveRecipe() {
    if (!recipe || !spriteName) return
    setSaving(true)

    try {
      const toSave = {
        ...recipe,
        name: spriteName,
        palette_id: paletteId,
        other_palette_ids: selectedPreset?.other_palette_ids ?? [],
      }
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: spriteName, recipe: toSave }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      router.push(`/recipes/${spriteName}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (step === "upload") {
    return (
      <div className="space-y-6 max-w-2xl mx-auto px-4 py-6 overflow-y-auto h-full">
        <h1 className="text-2xl font-bold font-mono">Import Sprite</h1>

        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-lg p-12 text-center transition-colors cursor-pointer"
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="Preview"
                className="mx-auto border border-white/20 rounded"
                style={{ imageRendering: "pixelated", maxWidth: 256, maxHeight: 256 }}
              />
              <p className="text-sm text-white/60">{file?.name}</p>
            </div>
          ) : (
            <div className="space-y-2 text-white/40">
              <p className="text-lg">Drop or paste a sprite image here</p>
              <p className="text-sm">or click to browse &mdash; Ctrl+V to paste from clipboard</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-mono text-white/40 mb-1 uppercase">Sprite Name</label>
          <input
            type="text"
            value={spriteName}
            onChange={e => setSpriteName(e.target.value)}
            placeholder="e.g. star, goomba, small_mario_idle"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-mono text-white/40 uppercase">Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORY_PRESETS.map(preset => {
              const isActive = selectedPreset?.id === preset.id
              const primary = getPaletteById(preset.palette_id)
              const altPals = preset.other_palette_ids.filter((id): id is number => id != null).map(getPaletteById)
              return (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(isActive ? null : preset)}
                  className={`text-left p-2.5 rounded-lg border transition-colors ${
                    isActive
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-white/10 hover:border-white/25 bg-white/5"
                  }`}
                >
                  <p className={`text-sm font-medium ${isActive ? "text-cyan-400" : "text-white/80"}`}>
                    {preset.label}
                  </p>
                  <p className="text-[10px] text-white/30 mt-0.5">{preset.description}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex" title={primary.label}>
                      {primary.colors.slice(1).map((c, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 first:rounded-l last:rounded-r"
                          style={{ backgroundColor: `rgb(${c[0]},${c[1]},${c[2]})` }}
                        />
                      ))}
                    </div>
                    {altPals.length > 0 && (
                      <>
                        <span className="text-[9px] text-white/20">+</span>
                        {altPals.map(alt => (
                          <div key={alt.id} className="flex" title={alt.label}>
                            {alt.colors.slice(1).map((c, i) => (
                              <div
                                key={i}
                                className="w-2 h-2 first:rounded-l last:rounded-r opacity-60"
                                style={{ backgroundColor: `rgb(${c[0]},${c[1]},${c[2]})` }}
                              />
                            ))}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          {!selectedPreset && (
            <p className="text-[11px] text-white/25 font-mono">
              Select a category to auto-assign palettes
            </p>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-mono text-white/40 mb-2 uppercase">
              Color Tolerance: {tolerance}
            </label>
            <input
              type="range"
              min={0}
              max={50}
              value={tolerance}
              onChange={e => setTolerance(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-white/25 mt-1">
              <span>Exact</span>
              <span>Fuzzy</span>
            </div>
          </div>
          <p className="text-[11px] text-white/30">
            Per-channel tolerance when matching image colors to CHR tile patterns.
            Raise for noisy or anti-aliased images.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={runAutoDetect}
          disabled={!file || !spriteName || loading || chrTiles.length === 0}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/10 disabled:text-white/30 text-white py-3 rounded-lg font-medium transition-colors"
        >
          {loading ? "Matching tiles..." : "Auto-Detect CHR Tiles"}
        </button>
      </div>
    )
  }

  if (!recipe) return null

  const usedTileIndices = new Set(recipe.mappings.map(m => m.chr_tile).filter((t): t is number => t != null))

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("upload")} className="text-white/40 hover:text-white text-sm">&larr; Back</button>
          <h1 className="text-2xl font-bold font-mono">Review: {spriteName}</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setStep("upload")}
            className="px-4 py-2 text-sm border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
          >
            Re-import
          </button>
          <button
            onClick={saveRecipe}
            disabled={saving}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Recipe"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Palette selector */}
      <div className="space-y-1.5">
        <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">Palette</h2>
        <div className="flex gap-2 flex-wrap">
          {PALETTES.map(p => {
            const isActive = p.id === paletteId
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
        {/* Left: sprite result */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">Detected Tiles</h2>
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

          <div className="flex gap-4 flex-wrap">
            {preview && (
              <div>
                <p className="text-xs text-white/30 mb-1 font-mono">Original</p>
                <img
                  src={preview}
                  alt="Original"
                  className="border border-white/20 rounded"
                  style={{ imageRendering: "pixelated", width: recipe.sheet_width * 4, height: recipe.sheet_height * 4 }}
                />
              </div>
            )}
            <div>
              <p className="text-xs text-white/30 mb-1 font-mono">Matched</p>
              <SpriteCanvas
                mappings={recipe.mappings}
                chrTiles={chrTiles}
                width={recipe.sheet_width}
                height={recipe.sheet_height}
                scale={4}
                palette={getPaletteById(paletteId).colors}
                showGrid={showGrid}
                showIndices={showIndices}
                highlightMapping={hoveredIdx}
                onMappingClick={(m, _idx) => {
                  setSelectedMapping(m)
                  setReassigningIdx(null)
                }}
                onMappingHover={(_m, idx) => setHoveredIdx(idx)}
              />
            </div>
          </div>

          <div className="text-xs font-mono text-white/30">
            {recipe.mappings.length} tiles mapped
          </div>

          <TileInspector
            mapping={selectedMapping}
            chrTiles={chrTiles}
            isReassigning={reassigningIdx !== null}
            onReassignStart={() => {
              if (!selectedMapping) return
              const idx = recipe.mappings.indexOf(selectedMapping)
              if (idx >= 0) setReassigningIdx(idx)
            }}
            onReassignCancel={() => setReassigningIdx(null)}
            onFlipChange={(hflip, vflip) => {
              if (!selectedMapping) return
              const idx = recipe.mappings.indexOf(selectedMapping)
              if (idx < 0) return
              const updated = { ...recipe, mappings: [...recipe.mappings] }
              const m = { ...updated.mappings[idx], hflip, vflip }
              updated.mappings[idx] = m
              setRecipe(updated)
              setSelectedMapping(m)
            }}
            onClearTile={() => {
              if (!selectedMapping) return
              const idx = recipe.mappings.indexOf(selectedMapping)
              if (idx < 0) return
              const updated = { ...recipe, mappings: [...recipe.mappings] }
              const m = { ...updated.mappings[idx], chr_tile: null as number | null }
              updated.mappings[idx] = m
              setRecipe(updated)
              setSelectedMapping(m)
            }}
          />
        </div>

        {/* Right: CHR ROM */}
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">
            CHR ROM
            {reassigningIdx !== null && (
              <span className="text-yellow-400 ml-2">— Click a tile to reassign</span>
            )}
          </h2>

          <div className="overflow-auto">
            <ChrGrid
              tiles={chrTiles}
              scale={3}
              columns={16}
              palette={getPaletteById(paletteId).colors}
              highlightTiles={usedTileIndices}
              selectedTile={selectedMapping?.chr_tile ?? null}
              onTileClick={(tile) => {
                if (reassigningIdx !== null) {
                  handleReassignTile(tile)
                } else {
                  const mapping = recipe.mappings.find(m => m.chr_tile === tile.index)
                  if (mapping) setSelectedMapping(mapping)
                }
              }}
            />
          </div>

          {/* Editable fields */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-mono text-white/50 uppercase tracking-wider">Metadata</h3>
            <div>
              <label className="block text-xs font-mono text-white/40 mb-1">Name</label>
              <input
                type="text"
                value={spriteName}
                onChange={e => setSpriteName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-white/40 mb-1">Category</label>
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORY_PRESETS.map(preset => {
                  const isActive = selectedPreset?.id === preset.id
                  return (
                    <button
                      key={preset.id}
                      onClick={() => selectPreset(isActive ? null : preset)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        isActive
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                          : "border-white/10 hover:border-white/25 text-white/40"
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
