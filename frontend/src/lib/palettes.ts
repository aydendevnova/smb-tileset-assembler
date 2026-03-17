import type { NESPalette } from "./types"
import { NES_PALETTE } from "./nes-palette"

// Palette definitions extracted from the SMB decomp (nmi_data.s, bg.s).
// nes_indices reference the 64-color NES hardware palette.
// RGB colors are derived at load time — never stored.
// Must stay in sync with /palettes.json (shared contract with Python scripts).

interface RawPalette {
  id: number
  label: string
  category: string
  nes_indices: number[]
  animation_frames?: number[]
}

function resolveColors(indices: number[]): [number, number, number][] {
  return indices.map(i => NES_PALETTE[i % 64])
}

const RAW: RawPalette[] = [
  // Foregrounds
  { id: 0,  label: "Overworld Foreground",       category: "sprite",     nes_indices: [0x0F, 0x0F, 0x36, 0x17] },
  { id: 1,  label: "Underground Foreground",     category: "sprite",     nes_indices: [0x0F, 0x0C, 0x3C, 0x1C] },
  { id: 2,  label: "Castle Foreground",          category: "sprite",     nes_indices: [0x0F, 0x00, 0x30, 0x10] },
  { id: 3,  label: "Underwater Foreground",      category: "sprite",     nes_indices: [0x0F, 0x0F, 0x30, 0x10] },
  // Background
  { id: 4,  label: "Overworld Background",     category: "background", nes_indices: [0x0F, 0x36, 0x17, 0x0F] },
  { id: 5,  label: "Underground Background",   category: "background", nes_indices: [0x0F, 0x3C, 0x1C, 0x0F] },
  { id: 6,  label: "Castle Background",        category: "background", nes_indices: [0x0F, 0x30, 0x10, 0x00] },
  { id: 7,  label: "Underwater Background",    category: "background", nes_indices: [0x0F, 0x3A, 0x1A, 0x0F] },
  // Golds
  { id: 8,  label: "Overworld Gold",       category: "background", nes_indices: [0x0F, 0x27, 0x17, 0x0F], animation_frames: [28, 32] },
  { id: 9,  label: "Underground Gold",     category: "background", nes_indices: [0x0F, 0x27, 0x17, 0x1C], animation_frames: [29, 33] },
  { id: 10, label: "Castle Gold",          category: "background", nes_indices: [0x0F, 0x27, 0x17, 0x00], animation_frames: [30, 34] },
  { id: 11, label: "Underwater Gold",      category: "background", nes_indices: [0x0F, 0x27, 0x12, 0x0F], animation_frames: [31, 35] },
  // Scenery
  { id: 12, label: "Scenery Overworld",    category: "background", nes_indices: [0x0F, 0x29, 0x1A, 0x0F] },
  { id: 13, label: "Scenery Underground",  category: "background", nes_indices: [0x0F, 0x29, 0x1A, 0x09] },
  { id: 14, label: "Scenery Underwater",   category: "background", nes_indices: [0x0F, 0x15, 0x12, 0x25] },
  { id: 15, label: "Scenery Snow",         category: "background", nes_indices: [0x0F, 0x10, 0x30, 0x00] },
  { id: 16, label: "Scenery Mushrooms",    category: "background", nes_indices: [0x0F, 0x27, 0x16, 0x0F] },
  // Clouds / Blues
  { id: 17, label: "Overworld Atmospheric",      category: "background", nes_indices: [0x0F, 0x30, 0x21, 0x0F] },
  { id: 18, label: "Underground Atmospheric",   category: "background", nes_indices: [0x0F, 0x30, 0x21, 0x1C] },
  { id: 19, label: "Underwater Atmospheric",    category: "background", nes_indices: [0x0F, 0x30, 0x12, 0x0F] },
  // Misc BG
  { id: 20, label: "Castle Atmospheric",         category: "background", nes_indices: [0x0F, 0x30, 0x16, 0x00] },
  // Player
  { id: 21, label: "Mario",               category: "player",     nes_indices: [0x0F, 0x16, 0x27, 0x18] },
  { id: 22, label: "Luigi",               category: "player",     nes_indices: [0x0F, 0x30, 0x27, 0x19] },
  { id: 23, label: "Fire Mario",          category: "player",     nes_indices: [0x0F, 0x37, 0x27, 0x16] },
  // Enemies
  { id: 24, label: "Overworld Enemies",   category: "sprite",     nes_indices: [0x0F, 0x1A, 0x30, 0x27] },
  { id: 25, label: "Underground Enemies", category: "sprite",     nes_indices: [0x0F, 0x1C, 0x36, 0x17] },
  { id: 26, label: "Underwater Enemies",  category: "sprite",     nes_indices: [0x0F, 0x10, 0x30, 0x27] },
  { id: 27, label: "Red Enemies",         category: "sprite",     nes_indices: [0x0F, 0x16, 0x30, 0x27] },
  // Gold animation frames (coin shimmer: index 1 cycles 0x27 → 0x17 → 0x07)
  { id: 28, label: "Overworld Gold F1",   category: "background", nes_indices: [0x0F, 0x17, 0x17, 0x0F] },
  { id: 29, label: "Underground Gold F1", category: "background", nes_indices: [0x0F, 0x17, 0x17, 0x1C] },
  { id: 30, label: "Castle Gold F1",      category: "background", nes_indices: [0x0F, 0x17, 0x17, 0x00] },
  { id: 31, label: "Underwater Gold F1",  category: "background", nes_indices: [0x0F, 0x17, 0x12, 0x0F] },
  { id: 32, label: "Overworld Gold F2",   category: "background", nes_indices: [0x0F, 0x07, 0x17, 0x0F] },
  { id: 33, label: "Underground Gold F2", category: "background", nes_indices: [0x0F, 0x07, 0x17, 0x1C] },
  { id: 34, label: "Castle Gold F2",      category: "background", nes_indices: [0x0F, 0x07, 0x17, 0x00] },
  { id: 35, label: "Underwater Gold F2",  category: "background", nes_indices: [0x0F, 0x07, 0x12, 0x0F] },
]

export const PALETTES: NESPalette[] = RAW.map(p => ({
  ...p,
  colors: resolveColors(p.nes_indices),
}))

export const DEFAULT_PALETTE_ID = 0

export function getPaletteById(id: number): NESPalette {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0]
}

export interface CategoryPreset {
  id: string
  label: string
  description: string
  category: string
  palette_id: number
  other_palette_ids: (number | null)[]
}

// Known SMB1 object categories with their canonical palette assignments.
// Each category maps to a primary palette (overworld default) and the
// area-type variants that share the same tile data.
export const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    id: "block",
    label: "Blocks & Bricks (Sprite)",
    description: "Sprite-table bricks and used blocks",
    category: "block",
    palette_id: 0,
    other_palette_ids: [1, 2, 3, null, null],
  },
  {
    id: "terrain",
    label: "Terrain (BG)",
    description: "Ground, stairs, cannons, bricks (background tiles)",
    category: "terrain",
    palette_id: 4,
    other_palette_ids: [5, 6, 7, null, null],
  },
  {
    id: "gold",
    label: "? Blocks & Coins",
    description: "Question blocks, coins, axe",
    category: "item",
    palette_id: 8,
    other_palette_ids: [9, 10, 11, null, null],
  },
  {
    id: "scenery",
    label: "Scenery",
    description: "Bushes, hills, fences, clouds, trees",
    category: "scenery",
    palette_id: 12,
    other_palette_ids: [13, 6, 14, 15, 16],
  },
  {
    id: "pipe",
    label: "Pipes",
    description: "Warp pipes, pipe caps",
    category: "pipe",
    palette_id: 12,
    other_palette_ids: [null, null, null, null, null],
  },
  {
    id: "enemy",
    label: "Enemies",
    description: "Goombas, Koopas, Piranha Plants, Buzzy Beetles",
    category: "enemy",
    palette_id: 24,
    other_palette_ids: [25, null, 26, null, null],
  },
  {
    id: "player",
    label: "Player",
    description: "Mario, Luigi, Fire Mario",
    category: "player",
    palette_id: 21,
    other_palette_ids: [null, null, null, null, null],
  },
  {
    id: "item",
    label: "Items & Powerups (Sprite)",
    description: "Stars, mushrooms, fire flowers",
    category: "item",
    palette_id: 27,
    other_palette_ids: [null, null, null, null, null],
  },
  {
    id: "castle_bg",
    label: "Castle Background",
    description: "Castle walls, pillars, bridge, chain",
    category: "castle",
    palette_id: 6,
    other_palette_ids: [null, 20, null, null, null],
  },
]

export const THEME_LABELS = ["Overworld", "Underground", "Castle", "Underwater", "Snow", "Mushrooms"]

export const THEME_SLOT_COUNT = 5

const THEME_KEYWORDS: [string, number][] = [
  ["underground", 1],
  ["castle", 2],
  ["lava", 2],
  ["underwater", 3],
  ["snow", 4],
  ["mushroom", 5],
]

export const THEME_SORT_KEY = new Map<number, number>()
for (const p of RAW) {
  const lower = p.label.toLowerCase()
  const match = THEME_KEYWORDS.find(([kw]) => lower.includes(kw))
  THEME_SORT_KEY.set(p.id, match ? match[1] : 100 + p.id)
}

function paletteFamily(id: number): number {
  if (id <= 3) return 0
  if (id <= 7) return 4
  if (id <= 11) return 8
  if (id <= 16) return 12
  if (id <= 19) return 17
  if (id === 20) return 6
  if (id <= 23) return 21
  if (id <= 27) return 24
  if (id <= 35) return 8
  return 24
}

export function getThemeSlot(paletteId: number): number | null {
  const key = THEME_SORT_KEY.get(paletteId)
  if (key == null || key >= 100) return null
  return key - 1
}

export function toPaletteSlots(ids: number[], defaultPaletteId?: number): (number | null)[] {
  const slots: (number | null)[] = [null, null, null, null, null]
  const defFamily = defaultPaletteId != null ? paletteFamily(defaultPaletteId) : -1

  for (const id of ids) {
    const slot = getThemeSlot(id)
    if (slot == null) continue
    const existing = slots[slot]
    if (existing == null) {
      slots[slot] = id
    } else {
      const existingFam = paletteFamily(existing)
      const newFam = paletteFamily(id)
      if (newFam === defFamily && existingFam !== defFamily) {
        slots[slot] = id
      }
    }
  }

  return slots
}

export function getCategoryPreset(id: string): CategoryPreset | undefined {
  return CATEGORY_PRESETS.find(p => p.id === id)
}
