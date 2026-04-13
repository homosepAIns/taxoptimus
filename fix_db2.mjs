import postgres from 'postgres';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    const q = fs.readFileSync('supabase/sync_tax_profiles_schema.sql', 'utf8');
    await sql.unsafe(q);
    await sql.unsafe("NOTIFY pgrst, 'reload schema';");
    console.log("Migration successful, schema reloaded!");
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
run();
