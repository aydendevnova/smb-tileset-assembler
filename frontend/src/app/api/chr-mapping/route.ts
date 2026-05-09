import { NextResponse } from "next/server"
import fs from "fs"
import { CONFIG } from "@/lib/config"

export async function POST(request: Request) {
  try {
    const { csv, meta, tiles } = await request.json()
    fs.writeFileSync(CONFIG.chrMappingCsvPath, csv)
    fs.writeFileSync(CONFIG.chrMappingMetaPath, JSON.stringify(meta, null, 2) + "\n")
    fs.writeFileSync(CONFIG.chrMappingTilesPath, JSON.stringify(tiles, null, 2) + "\n")
    return NextResponse.json({ saved: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
