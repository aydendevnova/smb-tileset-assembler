"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import type { ChrTile, RecipeListItem, ExportLayout } from "@/lib/types"
import { getPaletteById, PALETTES, THEME_SLOT_COUNT } from "@/lib/palettes"

interface DragInfo {
  recipeName: string
  originalCol: number
  originalRow: number
  grabOffsetCol: number
  grabOffsetRow: number
  currentCol: number
  currentRow: number
  isValid: boolean
}

const MIN_GRID_ROWS = 32
const GRID_PADDING_ROWS = 8

function flipPixels(pixels: number[], hflip: boolean, vflip: boolean): number[] {
  if (!hflip && !vflip) return pixels
  const rows: number[][] = []
  for (let r = 0; r < 8; r++) rows.push(pixels.slice(r * 8, r * 8 + 8))
  const flipped = vflip ? [...rows].reverse() : rows
  return flipped.flatMap(row => (hflip ? [...row].reverse() : row))
}

function resolveAnimPalette(paletteId: number, animFrameIdx?: number): ReturnType<typeof getPaletteById> {
  const pal = getPaletteById(paletteId)
  if (animFrameIdx != null && pal.animation_frames?.[animFrameIdx] != null)
    return getPaletteById(pal.animation_frames[animFrameIdx])
  return pal
}

function renderSpriteToCanvas(
  recipe: RecipeListItem,
  tileMap: Map<number, ChrTile>,
  altIndex?: number,
  animFrameIdx?: number,
  forcePaletteId?: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = recipe.sheet_width
  canvas.height = recipe.sheet_height
  const ctx = canvas.getContext("2d")!
  const imageData = ctx.createImageData(recipe.sheet_width, recipe.sheet_height)
  const d = imageData.data

  const forceColors = forcePaletteId != null ? getPaletteById(forcePaletteId).colors : null
  const basePalId = altIndex != null && recipe.other_palette_ids?.[altIndex] != null
    ? recipe.other_palette_ids[altIndex]
    : recipe.palette_id ?? 0
  const palette = resolveAnimPalette(basePalId, animFrameIdx)
  const colors = forceColors ?? palette.colors

  for (const m of recipe.mappings) {
    if (m.chr_tile == null) continue
    const tile = tileMap.get(m.chr_tile)
    if (!tile) continue
    const pixels = flipPixels(tile.pixels, m.hflip, m.vflip)
    const tc = forceColors ?? ((): [number, number, number][] => {
      const mappingPalId = altIndex != null && m.other_palette_ids?.[altIndex] != null
        ? m.other_palette_ids[altIndex]
        : m.palette_id
      return mappingPalId != null
        ? resolveAnimPalette(mappingPalId, animFrameIdx).colors
        : colors
    })()
    for (let py = 0; py < 8; py++) {
      for (let px = 0; px < 8; px++) {
        const idx = pixels[py * 8 + px]
        if (idx === 0) continue
        const x = m.col * 8 + px
        const y = m.row * 8 + py
        if (x < 0 || x >= recipe.sheet_width || y < 0 || y >= recipe.sheet_height) continue
        const i = (y * recipe.sheet_width + x) * 4
        d[i] = tc[idx][0]
        d[i + 1] = tc[idx][1]
        d[i + 2] = tc[idx][2]
        d[i + 3] = 255
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function hasChangedPalette(recipe: RecipeListItem, altIdx: number): boolean {
  if (recipe.other_palette_ids?.[altIdx] != null) return true
  return recipe.mappings.some(m => m.other_palette_ids?.[altIdx] != null)
}

function getVariantCount(recipe: RecipeListItem): number {
  let count = 0
  for (let i = 0; i < THEME_SLOT_COUNT; i++) {
    if (hasChangedPalette(recipe, i)) count++
  }
  return count
}

function getAnimFrameCount(recipe: RecipeListItem): number {
  if (recipe.no_animation) return 0
  const pal = getPaletteById(recipe.palette_id ?? 0)
  return pal.animation_frames?.length ?? 0
}

function autoArrange(
  recipes: RecipeListItem[],
  sheetWidth: number,
  gap = 0,
  skipPalettes = false
): Record<string, { col: number; row: number }> {
  const gridCols = Math.floor(sheetWidth / 8)
  const placements: Record<string, { col: number; row: number }> = {}
  let curCol = 0
  let curRow = 0
  let rowHeight = 0

  const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name))
  for (const r of sorted) {
    const variants = skipPalettes ? 0 : getVariantCount(r)
    const baseW = r.sheet_width / 8
    const totalW = baseW + (baseW + gap) * variants
    const animRows = 1 + (skipPalettes ? 0 : getAnimFrameCount(r))
    const h = (r.sheet_height / 8) * animRows
    if (curCol > 0 && curCol + totalW > gridCols) {
      curRow += rowHeight
      curCol = 0
      rowHeight = 0
    }
    placements[r.name] = { col: curCol, row: curRow }
    curCol += totalW
    rowHeight = Math.max(rowHeight, h)
  }

  return placements
}

function checkTopLeftCollision(
  placements: Record<string, { col: number; row: number }>,
  skipName: string,
  col: number,
  row: number,
  hidden?: Set<string>
): boolean {
  for (const [name, p] of Object.entries(placements)) {
    if (name === skipName) continue
    if (hidden?.has(name)) continue
    if (p.col === col && p.row === row) return true
  }
  return false
}

function computeGridRows(
  placements: Record<string, { col: number; row: number }>,
  recipeMap: Map<string, RecipeListItem>,
  skipPalettes = false,
  hidden?: Set<string>
): number {
  let maxRow = 0
  for (const [name, p] of Object.entries(placements)) {
    if (hidden?.has(name)) continue
    const r = recipeMap.get(name)
    if (!r) continue
    const animRows = 1 + (skipPalettes ? 0 : getAnimFrameCount(r))
    maxRow = Math.max(maxRow, p.row + (r.sheet_height / 8) * animRows)
  }
  return Math.max(maxRow + GRID_PADDING_ROWS, MIN_GRID_ROWS)
}

export default function ExportPage() {
  const [recipes, setRecipes] = useState<RecipeListItem[]>([])
  const [chrTiles, setChrTiles] = useState<ChrTile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [placements, setPlacements] = useState<Record<string, { col: number; row: number; gap?: number }>>({})
  const [sheetWidth, setSheetWidth] = useState(256)

  const [scale, setScale] = useState(3)
  const [bgTransparent, setBgTransparent] = useState(false)
  const [disablePalettes, setDisablePalettes] = useState(false)
  const [forceColorPalette, setForceColorPalette] = useState<number | null>(null)

  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [hoveredRecipe, setHoveredRecipe] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingChr, setSavingChr] = useState(false)
  const [savedChr, setSavedChr] = useState(false)
  const [sidebarFilter, setSidebarFilter] = useState("")
  const [hiddenRecipes, setHiddenRecipes] = useState<Set<string>>(new Set())

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragInfo | null>(null)
  const spriteCacheRef = useRef(new Map<string, HTMLCanvasElement[][]>())

  const placementsRef = useRef(placements)
  const scaleRef = useRef(scale)
  const recipeMapRef = useRef(new Map<string, RecipeListItem>())
  const recipeVariantsRef = useRef(new Map<string, number[]>())
  const hiddenRecipesRef = useRef(hiddenRecipes)
  const drawRef = useRef<() => void>(() => {})

  useEffect(() => { placementsRef.current = placements }, [placements])
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { hiddenRecipesRef.current = hiddenRecipes }, [hiddenRecipes])

  const recipeMap = useMemo(
    () => new Map(recipes.map(r => [r.name, r])),
    [recipes]
  )
  useEffect(() => { recipeMapRef.current = recipeMap }, [recipeMap])

  const gridCols = Math.floor(sheetWidth / 8)
  const gridRows = useMemo(
    () => computeGridRows(placements, recipeMap, disablePalettes, hiddenRecipes),
    [placements, recipeMap, disablePalettes, hiddenRecipes]
  )

  const recipeVariants = useMemo(() => {
    const map = new Map<string, number[]>()
    if (!disablePalettes) {
      for (const r of recipes) {
        const alts: number[] = []
        for (let i = 0; i < THEME_SLOT_COUNT; i++) {
          if (hasChangedPalette(r, i)) alts.push(i)
        }
        map.set(r.name, alts)
      }
    }
    return map
  }, [recipes, disablePalettes])

  useEffect(() => { recipeVariantsRef.current = recipeVariants }, [recipeVariants])

  const canvasGridCols = useMemo(() => {
    let maxRight = gridCols
    for (const [name, p] of Object.entries(placements)) {
      if (hiddenRecipes.has(name)) continue
      const r = recipeMap.get(name)
      if (!r) continue
      const alts = recipeVariants.get(name) ?? []
      const baseW = r.sheet_width / 8
      const gap = p.gap ?? 0
      const totalW = baseW + (baseW + gap) * alts.length
      maxRight = Math.max(maxRight, p.col + totalW)
    }
    return maxRight
  }, [placements, recipeMap, recipeVariants, gridCols, hiddenRecipes])

  useEffect(() => {
    if (recipes.length === 0 || chrTiles.length === 0) return
    const cache = new Map<string, HTMLCanvasElement[][]>()
    const tm = new Map(chrTiles.map(t => [t.index, t]))
    for (const r of recipes) {
      const alts = recipeVariants.get(r.name) ?? []
      const animCount = disablePalettes ? 0 : getAnimFrameCount(r)
      const rows: HTMLCanvasElement[][] = []

      const fp = forceColorPalette ?? undefined
      const baseRow: HTMLCanvasElement[] = [renderSpriteToCanvas(r, tm, undefined, undefined, fp)]
      for (const altIdx of alts) baseRow.push(renderSpriteToCanvas(r, tm, altIdx, undefined, fp))
      rows.push(baseRow)

      for (let fi = 0; fi < animCount; fi++) {
        const animRow: HTMLCanvasElement[] = [renderSpriteToCanvas(r, tm, undefined, fi, fp)]
        for (const altIdx of alts) animRow.push(renderSpriteToCanvas(r, tm, altIdx, fi, fp))
        rows.push(animRow)
      }

      cache.set(r.name, rows)
    }
    spriteCacheRef.current = cache
  }, [recipes, chrTiles, recipeVariants, disablePalettes, forceColorPalette])

  useEffect(() => {
    Promise.all([
      fetch("/api/recipes").then(r => r.json()),
      fetch("/api/chr").then(r => r.json()),
    ])
      .then(([recipesData, chrData]) => {
        if (recipesData.error) throw new Error(recipesData.error)
        if (chrData.error) throw new Error(chrData.error)
        setRecipes(recipesData)
        setChrTiles(chrData.tiles)
        setPlacements(autoArrange(recipesData, 256))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // --- Drawing ---

  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const s = scale
    const gCols = canvasGridCols
    const gRows = gridRows
    const currentPlacements = placementsRef.current
    const currentDrag = dragRef.current
    const cache = spriteCacheRef.current
    const rMap = recipeMapRef.current

    const w = gCols * 8 * s
    const h = gRows * 8 * s
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    ctx.clearRect(0, 0, w, h)

    if (bgTransparent) {
      const ts = 8 * s
      for (let gy = 0; gy < gRows; gy++) {
        for (let gx = 0; gx < gCols; gx++) {
          ctx.fillStyle = (gx + gy) % 2 === 0 ? "#1a1a2e" : "#16162a"
          ctx.fillRect(gx * ts, gy * ts, ts, ts)
        }
      }
    } else {
      ctx.fillStyle = "#6c6aff"
      ctx.fillRect(0, 0, w, h)
    }

    ctx.strokeStyle = "rgba(255,255,255,0.06)"
    ctx.lineWidth = 1
    for (let gx = 0; gx <= gCols; gx++) {
      if (gx % 2 === 0) continue
      const x = Math.floor(gx * 8 * s) + 0.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let gy = 0; gy <= gRows; gy++) {
      if (gy % 2 === 0) continue
      const y = Math.floor(gy * 8 * s) + 0.5
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    ctx.strokeStyle = "rgba(255,255,255,0.3)"
    ctx.lineWidth = 1
    for (let gx = 0; gx <= gCols; gx += 2) {
      const x = Math.floor(gx * 8 * s) + 0.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let gy = 0; gy <= gRows; gy += 2) {
      const y = Math.floor(gy * 8 * s) + 0.5
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    const hidden = hiddenRecipesRef.current
    ctx.imageSmoothingEnabled = false
    for (const [name, p] of Object.entries(currentPlacements)) {
      if (hidden.has(name)) continue
      if (currentDrag && name === currentDrag.recipeName) continue
      const frameRows = cache.get(name)
      if (!frameRows || frameRows.length === 0) continue
      const r = rMap.get(name)
      if (!r) continue
      const stride = r.sheet_width + (p.gap ?? 0) * 8
      for (let fri = 0; fri < frameRows.length; fri++) {
        const row = frameRows[fri]
        const yOff = p.row * 8 + r.sheet_height * fri
        for (let ci = 0; ci < row.length; ci++) {
          const c = row[ci]
          ctx.drawImage(
            c,
            (p.col * 8 + stride * ci) * s,
            yOff * s,
            c.width * s,
            c.height * s
          )
        }
      }
    }

    if (selectedRecipe && (!currentDrag || currentDrag.recipeName !== selectedRecipe)) {
      const p = currentPlacements[selectedRecipe]
      if (p) {
        const r = rMap.get(selectedRecipe)
        if (r) {
          const totalH = r.sheet_height * (1 + (disablePalettes ? 0 : getAnimFrameCount(r)))
          ctx.strokeStyle = "#22d3ee"
          ctx.lineWidth = 2
          ctx.strokeRect(p.col * 8 * s, p.row * 8 * s, r.sheet_width * s, totalH * s)
          const fontSize = Math.max(9, s * 2.5)
          ctx.font = `bold ${fontSize}px monospace`
          ctx.fillStyle = "rgba(0,0,0,0.7)"
          const tm = ctx.measureText(selectedRecipe)
          ctx.fillRect(p.col * 8 * s, p.row * 8 * s - fontSize - 4, tm.width + 8, fontSize + 4)
          ctx.fillStyle = "#22d3ee"
          ctx.textBaseline = "top"
          ctx.fillText(selectedRecipe, p.col * 8 * s + 4, p.row * 8 * s - fontSize - 2)
        }
      }
    }

    if (hoveredRecipe && hoveredRecipe !== selectedRecipe && !currentDrag) {
      const p = currentPlacements[hoveredRecipe]
      if (p) {
        const r = rMap.get(hoveredRecipe)
        if (r) {
          const totalH = r.sheet_height * (1 + (disablePalettes ? 0 : getAnimFrameCount(r)))
          ctx.strokeStyle = "rgba(255,255,255,0.25)"
          ctx.lineWidth = 1
          ctx.strokeRect(p.col * 8 * s, p.row * 8 * s, r.sheet_width * s, totalH * s)
          const fontSize = Math.max(9, s * 2.5)
          ctx.font = `bold ${fontSize}px monospace`
          ctx.fillStyle = "rgba(0,0,0,0.5)"
          const tm2 = ctx.measureText(hoveredRecipe)
          ctx.fillRect(p.col * 8 * s, p.row * 8 * s - fontSize - 4, tm2.width + 8, fontSize + 4)
          ctx.fillStyle = "rgba(255,255,255,0.6)"
          ctx.textBaseline = "top"
          ctx.fillText(hoveredRecipe, p.col * 8 * s + 4, p.row * 8 * s - fontSize - 2)
        }
      }
    }

    if (currentDrag) {
      const frameRows = cache.get(currentDrag.recipeName)
      const r = rMap.get(currentDrag.recipeName)
      if (frameRows && frameRows.length > 0 && r) {
        const dragGap = (currentPlacements[currentDrag.recipeName]?.gap ?? 0) * 8
        const dragStride = r.sheet_width + dragGap
        ctx.globalAlpha = 0.5
        for (let fri = 0; fri < frameRows.length; fri++) {
          const row = frameRows[fri]
          const yOff = currentDrag.currentRow * 8 + r.sheet_height * fri
          for (let ci = 0; ci < row.length; ci++) {
            const c = row[ci]
            ctx.drawImage(
              c,
              (currentDrag.currentCol * 8 + dragStride * ci) * s,
              yOff * s,
              c.width * s,
              c.height * s
            )
          }
        }
        ctx.globalAlpha = 1.0

        const totalH = r.sheet_height * frameRows.length
        ctx.strokeStyle = currentDrag.isValid ? "#22c55e" : "#ef4444"
        ctx.lineWidth = 2
        ctx.setLineDash(currentDrag.isValid ? [] : [4, 4])
        ctx.strokeRect(
          currentDrag.currentCol * 8 * s,
          currentDrag.currentRow * 8 * s,
          r.sheet_width * s,
          totalH * s
        )
        ctx.setLineDash([])

        const fontSize = Math.max(9, s * 2.5)
        ctx.font = `bold ${fontSize}px monospace`
        ctx.fillStyle = "rgba(0,0,0,0.7)"
        const tm3 = ctx.measureText(currentDrag.recipeName)
        ctx.fillRect(
          currentDrag.currentCol * 8 * s,
          currentDrag.currentRow * 8 * s - fontSize - 4,
          tm3.width + 8,
          fontSize + 4
        )
        ctx.fillStyle = currentDrag.isValid ? "#22c55e" : "#ef4444"
        ctx.textBaseline = "top"
        ctx.fillText(
          currentDrag.recipeName,
          currentDrag.currentCol * 8 * s + 4,
          currentDrag.currentRow * 8 * s - fontSize - 2
        )
      }
    }
  }

  drawRef.current = drawCanvas

  useEffect(() => {
    drawCanvas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements, scale, sheetWidth, bgTransparent, disablePalettes, forceColorPalette, hiddenRecipes, selectedRecipe, hoveredRecipe, gridRows, recipes, chrTiles, canvasGridCols, recipeVariants])

  // --- Mouse handlers ---

  function getGridPos(e: React.MouseEvent | MouseEvent): { col: number; row: number } | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    const cx = (e.clientX - rect.left) * sx
    const cy = (e.clientY - rect.top) * sy
    const s = scaleRef.current
    return { col: Math.floor(cx / (8 * s)), row: Math.floor(cy / (8 * s)) }
  }

  function findSpriteAt(col: number, row: number): string | null {
    const p = placementsRef.current
    const rMap = recipeMapRef.current
    for (const [name, pos] of Object.entries(p)) {
      if (hiddenRecipesRef.current.has(name)) continue
      const r = rMap.get(name)
      if (!r) continue
      const totalHTiles = (r.sheet_height / 8) * (1 + (disablePalettes ? 0 : getAnimFrameCount(r)))
      if (col >= pos.col && col < pos.col + r.sheet_width / 8 && row >= pos.row && row < pos.row + totalHTiles) {
        return name
      }
    }
    return null
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getGridPos(e)
    if (!pos) return

    const hitName = findSpriteAt(pos.col, pos.row)
    if (!hitName) {
      setSelectedRecipe(null)
      return
    }

    setSelectedRecipe(hitName)

    const p = placements[hitName]
    const capturedScale = scale

    dragRef.current = {
      recipeName: hitName,
      originalCol: p.col,
      originalRow: p.row,
      grabOffsetCol: pos.col - p.col,
      grabOffsetRow: pos.row - p.row,
      currentCol: p.col,
      currentRow: p.row,
      isValid: true,
    }

    document.body.style.cursor = "grabbing"
    document.body.style.userSelect = "none"

    function onMove(me: MouseEvent) {
      const drag = dragRef.current
      if (!drag) return

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const sx = canvas.width / rect.width
      const sy = canvas.height / rect.height
      const cx = (me.clientX - rect.left) * sx
      const cy = (me.clientY - rect.top) * sy

      const gridCol = Math.floor(cx / (8 * capturedScale)) - drag.grabOffsetCol
      const gridRow = Math.floor(cy / (8 * capturedScale)) - drag.grabOffsetRow

      const rMap = recipeMapRef.current
      const r = rMap.get(drag.recipeName)
      if (!r) return

      const clampedCol = Math.max(0, gridCol)
      const clampedRow = Math.max(0, gridRow)

      drag.currentCol = clampedCol
      drag.currentRow = clampedRow
      drag.isValid = !checkTopLeftCollision(
        placementsRef.current, drag.recipeName,
        clampedCol, clampedRow,
        hiddenRecipesRef.current
      )

      requestAnimationFrame(() => drawRef.current())
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""

      const drag = dragRef.current
      if (!drag) return

      if (drag.isValid && (drag.currentCol !== drag.originalCol || drag.currentRow !== drag.originalRow)) {
        setPlacements(prev => ({
          ...prev,
          [drag.recipeName]: { ...prev[drag.recipeName], col: drag.currentCol, row: drag.currentRow },
        }))
        setSaved(false)
      }

      dragRef.current = null
      requestAnimationFrame(() => drawRef.current())
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    e.preventDefault()
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (dragRef.current) return
    const pos = getGridPos(e)
    if (!pos) return
    setHoveredRecipe(findSpriteAt(pos.col, pos.row))
  }

  // --- Layout operations ---

  function toggleHidden(name: string) {
    setHiddenRecipes(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
    setSaved(false)
  }

  function handleAutoArrange() {
    const visible = recipes.filter(r => !hiddenRecipes.has(r.name))
    setPlacements(autoArrange(visible, sheetWidth, 0, disablePalettes))
    setSaved(false)
    setSelectedRecipe(null)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const layout: ExportLayout = {
        sheet_width: sheetWidth,
        placements,
        disable_palettes: disablePalettes,
        hidden_recipes: hiddenRecipes.size > 0 ? [...hiddenRecipes].sort() : undefined,
      }
      const res = await fetch("/api/export-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSaved(true)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleLoad() {
    try {
      const res = await fetch("/api/export-layout")
      const data = await res.json()

      if (data.groups && !data.placements) {
        setPlacements(autoArrange(recipes, data.sheet_width || 256))
        setSheetWidth(data.sheet_width || 256)
        setSaved(false)
        return
      }

      if (!data.placements) {
        setError("No saved layout found")
        return
      }

      const loadedWidth = data.sheet_width || 256
      setSheetWidth(loadedWidth)
      setDisablePalettes(data.disable_palettes ?? false)
      setHiddenRecipes(new Set(data.hidden_recipes ?? []))
      const loaded: Record<string, { col: number; row: number }> = { ...data.placements }

      const rMap = new Map(recipes.map(r => [r.name, r]))
      const missing = recipes.filter(r => !(r.name in loaded))

      if (missing.length > 0) {
        let maxRow = 0
        for (const [name, p] of Object.entries(loaded)) {
          const r = rMap.get(name)
          if (!r) continue
          const animRows = 1 + getAnimFrameCount(r)
          maxRow = Math.max(maxRow, p.row + (r.sheet_height / 8) * animRows)
        }
        const gCols = Math.floor(loadedWidth / 8)
        let curCol = 0
        let curRow = maxRow + 1
        let rowH = 0
        for (const r of missing.sort((a, b) => a.name.localeCompare(b.name))) {
          const variants = getVariantCount(r)
          const baseW = r.sheet_width / 8
          const totalW = baseW + baseW * variants
          const animRows = 1 + getAnimFrameCount(r)
          const h = (r.sheet_height / 8) * animRows
          if (curCol > 0 && curCol + totalW > gCols) {
            curRow += rowH
            curCol = 0
            rowH = 0
          }
          loaded[r.name] = { col: curCol, row: curRow }
          curCol += totalW
          rowH = Math.max(rowH, h)
        }
      }

      const validNames = new Set(recipes.map(r => r.name))
      for (const name of Object.keys(loaded)) {
        if (!validNames.has(name)) delete loaded[name]
      }

      setPlacements(loaded)
      setSaved(true)
    } catch (e) {
      setError(String(e))
    }
  }

  function resolvePaletteId(
    recipe: RecipeListItem,
    mapping: { palette_id?: number; other_palette_ids?: (number | null)[] },
    altIndex?: number
  ): number {
    if (altIndex != null) {
      const mappingAlt = mapping.other_palette_ids?.[altIndex]
      if (mappingAlt != null) return mappingAlt
      if (mapping.palette_id != null) return mapping.palette_id
      const recipeAlt = recipe.other_palette_ids?.[altIndex]
      if (recipeAlt != null) return recipeAlt
      return recipe.palette_id ?? 0
    }
    return mapping.palette_id ?? recipe.palette_id ?? 0
  }

  async function handleSaveChrMapping() {
    setSavingChr(true)
    try {
      const rows: string[] = []
      let maxX = 0
      let maxY = 0

      function addCell(col: number, row: number, chr: number, hf: boolean, vf: boolean, pal: number) {
        rows.push(`${col},${row},${chr},${hf ? 1 : 0},${vf ? 1 : 0},${pal}`)
        maxX = Math.max(maxX, col + 1)
        maxY = Math.max(maxY, row + 1)
      }

      for (const [name, p] of Object.entries(placements)) {
        if (hiddenRecipes.has(name)) continue
        const r = recipeMap.get(name)
        if (!r) continue
        const alts = recipeVariants.get(name) ?? []
        const gapTiles = p.gap ?? 0
        const baseWidthTiles = r.sheet_width / 8
        const strideTiles = baseWidthTiles + gapTiles
        const animCount = disablePalettes ? 0 : getAnimFrameCount(r)
        const heightTiles = r.sheet_height / 8

        for (let fi = -1; fi < animCount; fi++) {
          const rowOffset = p.row + heightTiles * (fi + 1)

          for (const m of r.mappings) {
            if (m.chr_tile == null) continue
            let palId = resolvePaletteId(r, m)
            if (fi >= 0) {
              const resolved = resolveAnimPalette(palId, fi)
              palId = resolved.id
            }
            addCell(p.col + m.col, rowOffset + m.row, m.chr_tile, m.hflip, m.vflip, palId)
          }

          for (let vi = 0; vi < alts.length; vi++) {
            const altIndex = alts[vi]
            const colOffset = strideTiles * (vi + 1)
            for (const m of r.mappings) {
              if (m.chr_tile == null) continue
              let palId = resolvePaletteId(r, m, altIndex)
              if (fi >= 0) {
                const resolved = resolveAnimPalette(palId, fi)
                palId = resolved.id
              }
              addCell(p.col + colOffset + m.col, rowOffset + m.row, m.chr_tile, m.hflip, m.vflip, palId)
            }
          }
        }
      }

      const csv = [
        "col,row,chr_tile,hflip,vflip,palette_id",
        ...rows,
      ].join("\n") + "\n"

      const meta = {
        sheet_width: maxX * 8,
        sheet_height: maxY * 8,
        tile_size: 8,
        cell_count: rows.length,
      }

      const res = await fetch("/api/chr-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, meta }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSavedChr(true)
    } catch (e) {
      setError(String(e))
    } finally {
      setSavingChr(false)
    }
  }

  function locateRecipe(name: string) {
    setSelectedRecipe(name)
    const p = placements[name]
    if (!p || !containerRef.current) return
    const r = recipeMap.get(name)
    if (!r) return
    const alts = recipeVariants.get(name) ?? []
    const g = (placements[name]?.gap ?? 0) * 8
    const totalW = r.sheet_width + (r.sheet_width + g) * alts.length
    const totalH = r.sheet_height * (1 + (disablePalettes ? 0 : getAnimFrameCount(r)))
    const centerX = (p.col * 8 + totalW / 2) * scale
    const centerY = (p.row * 8 + totalH / 2) * scale
    containerRef.current.scrollTo({
      left: centerX - containerRef.current.clientWidth / 2,
      top: centerY - containerRef.current.clientHeight / 2,
      behavior: "smooth",
    })
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/40">
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-300 underline text-sm">
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  const sortedRecipes = [...recipes].sort((a, b) => a.name.localeCompare(b.name))
  const filteredRecipes = sidebarFilter
    ? sortedRecipes.filter(r => r.name.toLowerCase().includes(sidebarFilter.toLowerCase()))
    : sortedRecipes
  const placedCount = Object.keys(placements).length

  return (
    <div className="flex h-full">
      <aside className="w-72 shrink-0 border-r border-white/10 overflow-y-auto p-4 space-y-4">
        <h2 className="font-mono font-bold text-sm text-white/60 uppercase tracking-wider">
          Sprite Sheet Export
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-white/50">
            Sheet Width (px)
            <input
              type="number"
              className="mt-1 w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono text-sm"
              value={sheetWidth}
              onChange={e => {
                setSheetWidth(Math.max(64, Math.round((Number(e.target.value) || 256) / 8) * 8))
                setSaved(false)
              }}
              step={8}
              min={64}
            />
          </label>
          <label className="block text-xs text-white/50">
            Preview Scale
            <select
              className="mt-1 w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono text-sm"
              value={scale}
              onChange={e => setScale(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map(s => (
                <option key={s} value={s}>{s}x</option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer">
          <input
            type="checkbox"
            checked={bgTransparent}
            onChange={e => setBgTransparent(e.target.checked)}
            className="rounded"
          />
          Transparent Background
        </label>

        <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer">
          <input
            type="checkbox"
            checked={disablePalettes}
            onChange={e => setDisablePalettes(e.target.checked)}
            className="rounded"
          />
          Disable Palette Processing
        </label>

        {selectedRecipe && placements[selectedRecipe] && (
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <span className="block text-xs text-white/50 font-mono truncate">{selectedRecipe}</span>
            <label className="block text-xs text-white/50">
              Variant Gap (×8px)
              <input
                type="number"
                className="mt-1 w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono text-sm"
                value={placements[selectedRecipe].gap ?? 0}
                onChange={e => {
                  const gap = Math.max(0, Number(e.target.value) || 0)
                  setPlacements(prev => ({
                    ...prev,
                    [selectedRecipe]: { ...prev[selectedRecipe], gap },
                  }))
                  setSaved(false)
                }}
                min={0}
                step={1}
              />
            </label>
          </div>
        )}

        <label className="block text-xs text-white/50">
          Force Color Palette
          <select
            className="mt-1 w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono text-sm"
            value={forceColorPalette ?? ""}
            onChange={e => setForceColorPalette(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">None</option>
            {PALETTES.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <button
            onClick={handleAutoArrange}
            className="w-full px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded text-xs font-mono hover:bg-cyan-500/30 transition-colors"
          >
            Auto Arrange
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-3 py-2 bg-green-500/20 text-green-400 rounded text-xs font-mono hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : saved ? "Saved" : "Save Layout"}
            </button>
            <button
              onClick={handleLoad}
              className="flex-1 px-3 py-2 bg-purple-500/20 text-purple-400 rounded text-xs font-mono hover:bg-purple-500/30 transition-colors"
            >
              Load Layout
            </button>
          </div>
          <button
            onClick={handleSaveChrMapping}
            disabled={savingChr}
            className="w-full px-3 py-2 bg-rose-500/20 text-rose-400 rounded text-xs font-mono hover:bg-rose-500/30 transition-colors disabled:opacity-50"
          >
            {savingChr ? "Saving..." : savedChr ? "CHR Mapping Saved" : "Save to CHR Mapping"}
          </button>
        </div>

        <div className="pt-2 border-t border-white/10 space-y-2">
          <h3 className="font-mono font-bold text-xs text-white/40 uppercase tracking-wider">
            Sprites ({recipes.length - hiddenRecipes.size} / {recipes.length})
          </h3>
          <input
            type="text"
            placeholder="Filter..."
            value={sidebarFilter}
            onChange={e => setSidebarFilter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono text-xs placeholder:text-white/20"
          />
          <div className="max-h-[50vh] overflow-y-auto space-y-0.5">
            {filteredRecipes.map(r => {
              const isSelected = selectedRecipe === r.name
              const isHidden = hiddenRecipes.has(r.name)
              return (
                <div
                  key={r.name}
                  className={`flex items-center gap-1 rounded text-xs font-mono transition-colors ${
                    isHidden
                      ? "opacity-40"
                      : isSelected
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-white/50 hover:bg-white/5 hover:text-white/70"
                  }`}
                >
                  <button
                    onClick={() => toggleHidden(r.name)}
                    className="shrink-0 w-5 h-5 flex items-center justify-center text-[10px] hover:text-white/80"
                    title={isHidden ? "Show" : "Hide"}
                  >
                    {isHidden ? "○" : "●"}
                  </button>
                  <button
                    onClick={() => { if (!isHidden) locateRecipe(r.name) }}
                    className="flex-1 text-left py-1 pr-2 truncate"
                  >
                    {r.name}
                  </button>
                  <span className="text-[10px] text-white/20 shrink-0 pr-2">
                    {r.sheet_width}&times;{r.sheet_height}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 text-xs text-white/30 font-mono space-y-1">
          <div>Grid: {gridCols}&times;{gridRows} tiles ({sheetWidth}&times;{gridRows * 8}px)</div>
          <div>Placed: {placedCount} / {recipes.length}</div>
        </div>
      </aside>

      <main
        ref={containerRef}
        className="flex-1 overflow-auto p-6"
      >
        <canvas
          ref={canvasRef}
          style={{
            imageRendering: "pixelated",
            display: "block",
            cursor: hoveredRecipe ? "grab" : "default",
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => { if (!dragRef.current) setHoveredRecipe(null) }}
        />
      </main>
    </div>
  )
}
