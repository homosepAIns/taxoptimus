/**
 * Migrates Supabase database using the SQL REST API.
 * Uses NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env.
 */
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function runMigrations() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Migration skipped.')
    console.log('Ensure they are set in your environment (e.g., .env.local).')
    return
  }

  // Supabase SQL execution endpoint
  const sqlUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`

  const supabaseDir = path.join(process.cwd(), 'supabase')
  const files = fs.readdirSync(supabaseDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log('🚀 Starting migrations via Supabase REST API...')

  for (const file of files) {
    console.log(`📜 Executing ${file}...`)
    const sql = fs.readFileSync(path.join(supabaseDir, file), 'utf-8')

    try {
      // NOTE: Most Supabase projects don't have 'exec_sql' exposed by default for security.
      // If this fails, you should run the SQL manually in the Dashboard or use DATABASE_URL.
      const response = await fetch(sqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ sql_query: sql })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ Failed to execute ${file}:`, error)
      } else {
        console.log(`✅ ${file} applied.`)
      }
    } catch (err) {
      console.error(`❌ Error sending request for ${file}:`, err)
    }
  }

  console.log('🏁 Migration process finished.')
}

if (require.main === module) {
  runMigrations()
}
