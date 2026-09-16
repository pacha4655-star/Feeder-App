import fs from 'fs';
import path from 'path';

// Parse .env and .env.local synchronously before importing modules
function loadEnv() {
  for (const envFile of ['.env', '.env.local']) {
    const p = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  }
}
loadEnv();

import { getDb } from '../src/lib/db';
import { getSupabaseServerClient } from '../src/lib/supabase/server';

async function purgeTestArtifacts() {
  console.log('--- PURGING ALL AUTOMATED TEST ARTIFACTS & FAKE DATA ---');

  const db = getDb();

  // 1. Delete all posts with title like 'Community Canine Vaccination%' or created by test accounts
  const deletedPosts = db.prepare(`
    DELETE FROM posts 
    WHERE title LIKE '%Vaccination Camp%' 
       OR title LIKE '%Feeding Update: Fed 14%' 
       OR title LIKE '%[URGENT SOS] Kitten with trapped paw%'
       OR author_id LIKE 'usr_1789%'
       OR author_id LIKE 'usr_test_%'
       OR author_id LIKE 'usr_audit_%'
       OR author_id LIKE 'user_test_%'
       OR author_id LIKE 'tester_%'
       OR author_id LIKE 'guardian_%'
  `).run();
  console.log(`Local SQLite: Deleted ${deletedPosts.changes} test posts.`);

  // 2. Delete all test stories
  const deletedStories = db.prepare(`
    DELETE FROM stories 
    WHERE author_id LIKE 'usr_1789%' 
       OR author_id LIKE 'usr_test_%' 
       OR author_id LIKE 'usr_audit_%'
       OR author_id LIKE 'user_test_%'
       OR author_id LIKE 'usr_fkey_%'
       OR id LIKE 'story_test_%'
       OR id LIKE 'story_fkey_%'
       OR id LIKE 'story_idor_%'
  `).run();
  console.log(`Local SQLite: Deleted ${deletedStories.changes} test stories.`);

  // 3. Delete test users (keep only legitimate real user accounts)
  const deletedUsers = db.prepare(`
    DELETE FROM users 
    WHERE email LIKE '%@feeder.life' 
       OR email LIKE '%@feeder.test' 
       OR email LIKE '%@example.com'
       OR username LIKE 'tester_%'
       OR username LIKE 'guardian_%'
       OR username LIKE 'usr_test_%'
       OR username LIKE 'user_test_%'
       OR username LIKE 'usr_audit_%'
       OR username LIKE 'usr_fkey_%'
  `).run();
  console.log(`Local SQLite: Deleted ${deletedUsers.changes} test users.`);

  // 4. Purge from Supabase PostgreSQL
  try {
    const supabase = getSupabaseServerClient();
    
    // Delete test posts in Supabase
    const { error: supaPostErr } = await supabase
      .from('social_posts')
      .delete()
      .or('content.ilike.%Vaccination Camp%,content.ilike.%Feeding Update%,content.ilike.%trapped paw%');
    
    if (supaPostErr) {
      console.warn('Supabase post cleanup notice:', supaPostErr.message);
    } else {
      console.log('Supabase: Deleted test social_posts.');
    }

    // Delete test users in Supabase
    const { error: supaUserErr } = await supabase
      .from('users')
      .delete()
      .or('email.ilike.%@feeder.life,email.ilike.%@feeder.test,email.ilike.%@example.com');

    if (supaUserErr) {
      console.warn('Supabase user cleanup notice:', supaUserErr.message);
    } else {
      console.log('Supabase: Deleted test users.');
    }
  } catch (err: any) {
    console.warn('Supabase purge error:', err.message);
  }

  // 5. Verify counts
  const remainingPosts = db.prepare('SELECT COUNT(*) as c FROM posts').get() as { c: number };
  const remainingStories = db.prepare('SELECT COUNT(*) as c FROM stories').get() as { c: number };
  const remainingUsers = db.prepare('SELECT id, email, full_name FROM users').all();
  
  console.log(`\nRemaining Real Posts: ${remainingPosts.c}`);
  console.log(`Remaining Real Stories: ${remainingStories.c}`);
  console.log(`Remaining Real Users:`, remainingUsers);
}

purgeTestArtifacts().catch(console.error);
