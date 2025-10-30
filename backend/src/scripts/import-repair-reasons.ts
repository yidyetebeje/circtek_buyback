import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { repair_reasons } from '../db/circtek.schema'

function parseTenantId(argv: string[]): number {
  return 2
}

async function readReasons(filePath: string): Promise<string[]> {
  const raw = await readFile(filePath, 'utf8')
  const lines = raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  // Dedupe by case-insensitive value while preserving original casing of first occurrence
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const line of lines) {
    const key = line.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(line)
    }
  }
  return deduped
}

async function getExistingReasonNames(tenantId: number): Promise<Set<string>> {
  const rows = await db
    .select({ name: repair_reasons.name })
    .from(repair_reasons)
    .where(eq(repair_reasons.tenant_id, tenantId))
  const set = new Set<string>()
  for (const row of rows) {
    set.add((row.name || '').toLowerCase())
  }
  return set
}

async function insertMissing(names: string[], tenantId: number): Promise<{ inserted: number; skipped: number }> {
  if (names.length === 0) return { inserted: 0, skipped: 0 }
  const existing = await getExistingReasonNames(tenantId)
  const toInsert = names
    .filter((n) => !existing.has(n.toLowerCase()))
    .map((n) => ({
      name: n,
      description: null,
      fixed_price: null,
      status: true,
      tenant_id: tenantId,
    }))

  if (toInsert.length === 0) return { inserted: 0, skipped: names.length }

  await db.insert(repair_reasons).values(toInsert)
  return { inserted: toInsert.length, skipped: names.length - toInsert.length }
}

async function main() {
  const tenantId = parseTenantId(process.argv.slice(2))
  const filePath = path.resolve(__dirname, '../../reason.txt')
  const names = await readReasons(filePath)
  const { inserted, skipped } = await insertMissing(names, tenantId)
 
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


