export interface TileMapping {
  col: number
  row: number
  chr_tile: number | null
  hflip: boolean
  vflip: boolean
  palette_id?: number
  other_palette_ids?: (number | null)[]
  palette_map?: Record<string, number>
}

export interface Recipe {
  name?: string
  palette_id?: number
  other_palette_ids?: (number | null)[]
  no_animation?: boolean
  godot_tileset?: boolean
  metatile_id?: number | null
  sheet_width: number
  sheet_height: number
  tile_size: number
  palette_map?: Record<string, number>
  mappings: TileMapping[]
}

export interface NESPalette {
  id: number
  label: string
  category: string
  nes_indices: number[]
  colors: [number, number, number][]
  animation_frames?: number[]
}

export interface RecipeSummary {
  filename: string
  name: string
  sheet_width: number
  sheet_height: number
  tileCount: number
}

export interface ChrTile {
  index: number
  pixels: number[] // 64 values, each 0-3
}

export interface RecipeListItem extends RecipeSummary {
  palette_id?: number
  other_palette_ids?: (number | null)[]
  no_animation?: boolean
  mappings: TileMapping[]
}

export interface ImportResult {
  recipe: Recipe
  preview: string // base64 PNG
}

export interface SpritePlacement {
  col: number
  row: number
  gap?: number
}

export interface ExportLayout {
  sheet_width: number
  placements: Record<string, SpritePlacement>
  disable_palettes?: boolean
  hidden_recipes?: string[]
}

