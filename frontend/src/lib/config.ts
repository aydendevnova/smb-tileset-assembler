import path from "path"

const PROJECT_ROOT = path.resolve(process.cwd(), "..")

export const CONFIG = {
  romPath: path.join(PROJECT_ROOT, "smb.nes"),
  recipesDir: path.join(PROJECT_ROOT, "recipes"),
  recipeGlob: "*.recipe.json",
  exportLayoutPath: path.join(PROJECT_ROOT, "export-layout.json"),
  chrMappingCsvPath: path.join(PROJECT_ROOT, "chr-mapping.csv"),
  chrMappingMetaPath: path.join(PROJECT_ROOT, "chr-mapping.json"),
} as const
