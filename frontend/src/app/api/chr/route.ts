import { NextResponse } from "next/server"
import { loadChrTiles } from "@/lib/chr"
import { CONFIG } from "@/lib/config"

export async function GET() {
  try {
    const tiles = loadChrTiles(CONFIG.romPath)
    return NextResponse.json({ tiles, count: tiles.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
