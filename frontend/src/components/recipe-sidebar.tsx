"use client"

import type { RecipeListItem, ChrTile } from "@/lib/types"
import { getPaletteById, DEFAULT_PALETTE_ID } from "@/lib/palettes"
import { SpriteCanvas } from "./sprite-canvas"

interface RecipeSidebarProps {
  recipes: RecipeListItem[]
  chrTiles: ChrTile[]
  selectedName: string | null
  onSelect: (name: string) => void
}

export function RecipeSidebar({ recipes, chrTiles, selectedName, onSelect }: RecipeSidebarProps) {
  const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <aside className="w-40 shrink-0 border-r border-white/10 bg-white/2 overflow-y-auto flex flex-col">
      <div className="p-3 border-b border-white/10">
        <h2 className="text-sm font-mono text-white/50 uppercase tracking-wider">Recipes</h2>
        <p className="text-xs text-white/30 mt-0.5">{recipes.length} recipes</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.map(r => {
          const isSelected = selectedName === r.name

          return (
            <button
              key={r.name}
              onClick={() => onSelect(r.name)}
              className={`w-full text-left px-3 py-2 transition-colors ${
                isSelected
                  ? "bg-cyan-500/10 border-l-2 border-l-cyan-400"
                  : "hover:bg-white/5 border-l-2 border-l-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-mono font-bold truncate ${
                  isSelected ? "text-cyan-400" : "text-white"
                }`}>
                  {r.name}
                </span>
              </div>

              {r.mappings.length > 0 && chrTiles.length > 0 && (
                <div className="pointer-events-none overflow-hidden border-white/5 bg-transparent">
                  <SpriteCanvas
                    mappings={r.mappings}
                    chrTiles={chrTiles}
                    width={r.sheet_width}
                    height={r.sheet_height}
                    scale={1}
                    palette={getPaletteById(r.palette_id ?? DEFAULT_PALETTE_ID).colors}
                  />
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-white/30">
                <span>{r.tileCount} tiles</span>
                <span>&middot;</span>
                <span>{r.sheet_width}&times;{r.sheet_height}</span>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
