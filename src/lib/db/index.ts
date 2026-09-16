import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'feeder_life.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = new Database(DB_PATH, {
    // verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
  });

  // Enable WAL mode for high concurrency and performance
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  // Register custom Haversine distance function in SQLite: haversine_km(lat1, lon1, lat2, lon2)
  dbInstance.function('haversine_km', (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999999;
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  });

  // Ensure tables exist
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    dbInstance.exec(schemaSql);
  }

  // Safe migration for firebase_uid if table already existed without it
  try {
    const colInfo = dbInstance.pragma('table_info(users)') as any[];
    const hasFirebaseUid = colInfo.some((c) => c.name === 'firebase_uid');
    if (!hasFirebaseUid) {
      dbInstance.exec('ALTER TABLE users ADD COLUMN firebase_uid TEXT;');
      dbInstance.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);');
    }
  } catch {}

  return dbInstance;
}

export default getDb;
