import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { CONFIG } from "@/lib/config"
import type { Recipe } from "@/lib/types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params
    const filename = name.endsWith(".recipe.json") ? name : `${name}.recipe.json`
    const filePath = path.join(CONFIG.recipesDir, filename)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    const recipe: Recipe = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return NextResponse.json(recipe)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params
    const filename = name.endsWith(".recipe.json") ? name : `${name}.recipe.json`
    const filePath = path.join(CONFIG.recipesDir, filename)

    const recipe: Recipe = await request.json()
    fs.writeFileSync(filePath, JSON.stringify(recipe, null, 2))
    return NextResponse.json({ saved: filename })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
