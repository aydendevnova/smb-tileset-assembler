"use client"

import Link from "next/link"
import type { RecipeSummary } from "@/lib/types"

interface RecipeCardProps {
  recipe: RecipeSummary
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link
      href={`/recipes/${recipe.name}`}
      className="block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-4 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-mono font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
          {recipe.name}
        </h3>

      </div>

      <div className="text-sm text-white/50 space-y-1 font-mono">
        <div>{recipe.sheet_width}x{recipe.sheet_height} px</div>
        <div>{recipe.tileCount} tiles mapped</div>
      </div>
    </Link>
  )
}
