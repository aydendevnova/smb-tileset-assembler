"use client"

import { useEffect, useState, useCallback } from "react"
import type { Recipe, ChrTile, RecipeListItem } from "@/lib/types"
import { RecipeEditor } from "@/components/recipe-editor"
import { RecipeSidebar } from "@/components/recipe-sidebar"

export default function MainPage() {
  const [recipes, setRecipes] = useState<RecipeListItem[]>([])
  const [chrTiles, setChrTiles] = useState<ChrTile[]>([])
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const refreshRecipes = useCallback(() => {
    fetch("/api/recipes")
      .then(r => r.json())
      .then(data => {
        if (!data.error) setRecipes(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedName) {
      setSelectedRecipe(null)
      return
    }
    setSelectedRecipe(null)
    fetch(`/api/recipes/${selectedName}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setSelectedRecipe(data)
      })
      .catch(e => setError(e.message))
  }, [selectedName])

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
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <RecipeSidebar
        recipes={recipes}
        chrTiles={chrTiles}
        selectedName={selectedName}
        onSelect={setSelectedName}
      />

      <main className="flex-1 overflow-y-auto p-6">
        {selectedRecipe && selectedName ? (
          <RecipeEditor
            key={selectedName}
            initialRecipe={selectedRecipe}
            recipeName={selectedName}
            chrTiles={chrTiles}
            onSaved={refreshRecipes}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/30">
            <div className="text-center">
              <p className="text-lg mb-2">Select a recipe from the sidebar</p>
              <p className="text-sm">{recipes.length} recipes available</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
