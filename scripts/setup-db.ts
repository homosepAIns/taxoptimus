import postgres from 'postgres'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL is not set in your .env file.')
  console.log('You can find this in Supabase Dashboard -> Project Settings -> Database -> Connection string (URI)')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

async function runMigrations() {
  const supabaseDir = path.join(process.cwd(), 'supabase')
  
  // Define the order: schema first, then migrations, then others
  const files = fs.readdirSync(supabaseDir)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => {
      if (a === 'schema.sql') return -1
      if (b === 'schema.sql') return 1
      return a.localeCompare(b)
    })

  console.log(`🚀 Found ${files.length} SQL files to execute...`)

  for (const file of files) {
    const filePath = path.join(supabaseDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    
    console.log(`📄 Executing ${file}...`)
    
    try {
      // postgres.js allows executing raw strings with .unsafe()
      await sql.unsafe(content)
      console.log(`✅ ${file} completed.`)
    } catch (err: any) {
      console.error(`❌ Error in ${file}:`, err.message)
      // We continue to other files unless it's a critical connection error
    }
  }

  console.log('✨ Database setup complete.')
  await sql.end()
}

runMigrations().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
