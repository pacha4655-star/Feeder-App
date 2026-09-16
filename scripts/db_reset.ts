import { getDb } from '../src/lib/db';

function resetDatabase() {
  console.log('🔄 Truncating all Feeder.life tables to clean production state (0 fake data)...');
  const db = getDb();

  const tables = [
    'messages',
    'conversation_members',
    'conversations',
    'story_views',
    'stories',
    'user_relationships',
    'audit_logs',
    'reports',
    'notifications',
    'saved_items',
    'post_comments',
    'post_reactions',
    'posts',
    'community_members',
    'communities',
    'feeding_logs',
    'sos_cases',
    'user_sessions',
    'user_profiles',
    'users',
  ];

  db.transaction(() => {
    // Disable foreign keys temporarily during truncate
    db.pragma('foreign_keys = OFF');
    for (const table of tables) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch (e: any) {
        console.warn(`Could not clear table ${table}: ${e.message}`);
      }
    }
    db.pragma('foreign_keys = ON');
  })();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
  const commCount = db.prepare('SELECT COUNT(*) as count FROM communities').get() as { count: number };

  console.log(`\n✅ Clean Production Database Initialized!`);
  console.log(`Users in DB:       ${userCount.count}`);
  console.log(`Posts in DB:       ${postCount.count}`);
  console.log(`Communities in DB: ${commCount.count}`);
  console.log(`✨ Zero mock data. Ready for real signups at http://localhost:3000/signup.\n`);
}

resetDatabase();
