import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { CONFIG } from "@/lib/config"
import type { Recipe, RecipeSummary } from "@/lib/types"

export async function GET() {
  try {
    const files = fs.readdirSync(CONFIG.recipesDir)
      .filter(f => f.endsWith(".recipe.json"))
      .sort()

    const summaries = files.map(filename => {
      const raw = fs.readFileSync(path.join(CONFIG.recipesDir, filename), "utf-8")
      const recipe: Recipe = JSON.parse(raw)
      return {
        filename,
        name: filename.replace(".recipe.json", ""),
        sheet_width: recipe.sheet_width,
        sheet_height: recipe.sheet_height,
        tileCount: recipe.mappings.length,
        palette_id: recipe.palette_id,
        other_palette_ids: recipe.other_palette_ids,
        no_animation: recipe.no_animation,
        mappings: recipe.mappings,
      }
    })

    return NextResponse.json(summaries)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { filename, recipe } = await request.json()
    if (!filename || !recipe) {
      return NextResponse.json({ error: "filename and recipe required" }, { status: 400 })
    }

    const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, "_")
    const fullName = safeName.endsWith(".recipe.json") ? safeName : `${safeName}.recipe.json`
    const outPath = path.join(CONFIG.recipesDir, fullName)

    fs.writeFileSync(outPath, JSON.stringify(recipe, null, 2))
    return NextResponse.json({ saved: fullName })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
