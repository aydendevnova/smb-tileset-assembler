import { NextResponse } from "next/server"
import fs from "fs"
import { CONFIG } from "@/lib/config"

export async function GET() {
  try {
    if (!fs.existsSync(CONFIG.exportLayoutPath)) {
      return NextResponse.json({ placements: null })
    }
    const raw = fs.readFileSync(CONFIG.exportLayoutPath, "utf-8")
    return NextResponse.json(JSON.parse(raw))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const layout = await request.json()
    fs.writeFileSync(CONFIG.exportLayoutPath, JSON.stringify(layout, null, 2))
    return NextResponse.json({ saved: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
