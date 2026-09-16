import { getDb } from './index';

export function seedDatabase() {
  const db = getDb();

  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return;
  }

  const run = db.transaction(() => {
    const dummyHash = 'scrypt:salt_123:hash_abc_feeder123';

    // 1. Seed Users matching production animal network and reference image
    const users = [
      {
        id: 'usr_pachamuthu',
        email: 'pachamuthu@feeder.life',
        password_hash: dummyHash,
        username: 'pachamuthu_s',
        full_name: 'Pachamuthu S',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        phone: '+91 98450 12345',
        is_verified: 1,
        role: 'PLATFORM_ADMIN',
        bio: 'Animal Lover',
        area_name: 'Adyar',
        city: 'Chennai',
        lat: 13.0012,
        lon: 80.2565,
        level: 'Animal Lover',
        feeds: 142,
        sos: 18,
        community_contrib: 56,
        badges: JSON.stringify(['Animal Lover', 'Master Feeder', 'Verified Responder']),
      },
      {
        id: 'usr_ananya',
        email: 'ananya@feeder.life',
        password_hash: dummyHash,
        username: 'ananya_feed',
        full_name: 'Ananya',
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        phone: '+91 98450 99887',
        is_verified: 1,
        role: 'USER',
        bio: 'Dedicated stray animal rescuer and daily colony feeder in South Chennai.',
        area_name: 'Adyar',
        city: 'Chennai',
        lat: 13.0033,
        lon: 80.255,
        level: 'Street Dog Feeder',
        feeds: 88,
        sos: 14,
        community_contrib: 32,
        badges: JSON.stringify(['Street Dog Feeder', 'Foster Guardian']),
      },
      {
        id: 'usr_maya_vet',
        email: 'maya.vet@feeder.life',
        password_hash: dummyHash,
        username: 'dr_mayasharma',
        full_name: 'Dr. Maya Sharma (BVSc)',
        avatar_url: 'https://images.unsplash.com/photo-1594824813580-4965ef8c13f6?w=150&auto=format&fit=crop&q=80',
        phone: '+91 98450 67890',
        is_verified: 1,
        role: 'PLATFORM_MODERATOR',
        bio: 'Veterinary surgeon specializing in street canine care and trauma stabilization.',
        area_name: 'Besant Nagar',
        city: 'Chennai',
        lat: 12.9984,
        lon: 80.2668,
        level: 'Veterinary Advisor',
        feeds: 89,
        sos: 45,
        community_contrib: 88,
        badges: JSON.stringify(['Verified Veterinarian', 'Medical Officer']),
      },
      {
        id: 'usr_rajesh_feed',
        email: 'rajesh.feeder@feeder.life',
        password_hash: dummyHash,
        username: 'rajesh_streetfeed',
        full_name: 'Rajesh Kumar',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        phone: '+91 98451 22334',
        is_verified: 1,
        role: 'USER',
        bio: 'Feeding 35 street dogs every night. Anti-tick care champion.',
        area_name: 'Mylapore',
        city: 'Chennai',
        lat: 13.0368,
        lon: 80.2676,
        level: 'Night Feeder Hero',
        feeds: 320,
        sos: 12,
        community_contrib: 34,
        badges: JSON.stringify(['365-Day Feeder', 'Hydration Hero']),
      },
      {
        id: 'usr_anita_cat',
        email: 'anita.cats@feeder.life',
        password_hash: dummyHash,
        username: 'anita_felinecare',
        full_name: 'Anita Deshmukh',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        phone: '+91 98452 33445',
        is_verified: 1,
        role: 'COMMUNITY_ADMIN',
        bio: 'Cat colony manager, TNR coordinator, and kitten foster mom.',
        area_name: 'Thiruvanmiyur',
        city: 'Chennai',
        lat: 12.9863,
        lon: 80.2612,
        level: 'Feline Colony Guardian',
        feeds: 215,
        sos: 29,
        community_contrib: 62,
        badges: JSON.stringify(['TNR Specialist', 'Foster Angel']),
      },
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, username, full_name, avatar_url, phone, is_verified, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `);

    const insertProfile = db.prepare(`
      INSERT INTO user_profiles (user_id, bio, area_name, city, approx_lat, approx_lon, feeder_level, feeding_count, sos_responses_count, community_contributions_count, badges_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of users) {
      insertUser.run(u.id, u.email, u.password_hash, u.username, u.full_name, u.avatar_url, u.phone, u.is_verified, u.role);
      insertProfile.run(u.id, u.bio, u.area_name, u.city, u.lat, u.lon, u.level, u.feeds, u.sos, u.community_contrib, u.badges);
    }

    // 2. Seed Default Session for Pachamuthu S
    db.prepare(`
      INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
      VALUES ('sess_pachamuthu', 'usr_pachamuthu', 'default_pachamuthu_session', datetime('now', '+365 days'))
    `).run();

    // 3. Seed Communities matching reference image
    const communities = [
      {
        id: 'comm_dog_lovers',
        name: 'Dog Lovers',
        slug: 'dog-lovers',
        description: 'A loving community dedicated to canine companions, rescue dogs, and stray wellness.',
        category: 'DOGS',
        location_area: 'Chennai & Regional',
        cover_image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
        avatar_image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=150&auto=format&fit=crop&q=80',
        is_private: 0,
        rules_text: '1. Always prioritize dog welfare.\n2. Coordinate vaccination and feeding spots.',
        created_by: 'usr_pachamuthu',
        member_count: 12400,
        post_count: 850,
      },
      {
        id: 'comm_cat_lovers',
        name: 'Cat Lovers',
        slug: 'cat-lovers',
        description: 'Community for street cat protectors, feline fosters, and Trap-Neuter-Return guardians.',
        category: 'CATS',
        location_area: 'Adyar & South Coast',
        cover_image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop&q=80',
        avatar_image: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=150&auto=format&fit=crop&q=80',
        is_private: 0,
        rules_text: '1. Clean feeding spots thoroughly.\n2. Keep records of ear-tipped neutered cats.',
        created_by: 'usr_anita_cat',
        member_count: 8700,
        post_count: 530,
      },
      {
        id: 'comm_street_feeders',
        name: 'Street Dog Feeders',
        slug: 'street-dog-feeders',
        description: 'Daily street dog caretakers, nutrition route coordinators, and anti-tick champions.',
        category: 'DOGS',
        location_area: 'Adyar Colony & Beyond',
        cover_image: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=800&auto=format&fit=crop&q=80',
        avatar_image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=150&auto=format&fit=crop&q=80',
        is_private: 0,
        rules_text: '1. Feed in designated quiet spots.\n2. Avoid cooked bones or spices.',
        created_by: 'usr_ananya',
        member_count: 15300,
        post_count: 1200,
      },
      {
        id: 'comm_animal_rescue',
        name: 'Animal Rescue',
        slug: 'animal-rescue',
        description: 'Emergency rescue teams, vet dispatchers, and trauma triage first responders.',
        category: 'RESCUE',
        location_area: 'State Emergency Network',
        cover_image: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=800&auto=format&fit=crop&q=80',
        avatar_image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=150&auto=format&fit=crop&q=80',
        is_private: 0,
        rules_text: '1. Verify distress before reporting.\n2. Provide exact landmark and phone contact.',
        created_by: 'usr_maya_vet',
        member_count: 9200,
        post_count: 640,
      },
    ];

    const insertComm = db.prepare(`
      INSERT INTO communities (id, name, slug, description, category, location_area, cover_image, avatar_image, is_private, rules_text, created_by, member_count, post_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMember = db.prepare(`
      INSERT INTO community_members (id, community_id, user_id, role, status)
      VALUES (?, ?, ?, ?, 'APPROVED')
    `);

    for (const c of communities) {
      insertComm.run(c.id, c.name, c.slug, c.description, c.category, c.location_area, c.cover_image, c.avatar_image, c.is_private, c.rules_text, c.created_by, c.member_count, c.post_count);
      // Street Dog Feeders is joined by Pachamuthu S as in reference image ("Joined")
      if (c.id === 'comm_street_feeders') {
        insertMember.run(`mem_${c.id}_pacha`, c.id, 'usr_pachamuthu', 'MEMBER');
      }
      insertMember.run(`mem_${c.id}_ananya`, c.id, 'usr_ananya', 'MEMBER');
    }

    // 4. Seed Stories matching reference rail
    const stories = [
      {
        id: 'story_01',
        author_id: 'usr_pachamuthu',
        media_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=80',
        caption: 'Morning visit to our local shelter pups!',
      },
      {
        id: 'story_02',
        author_id: 'usr_ananya',
        media_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=500&auto=format&fit=crop&q=80',
        caption: 'Street Dog feeding round complete in Adyar!',
      },
      {
        id: 'story_03',
        author_id: 'usr_anita_cat',
        media_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&auto=format&fit=crop&q=80',
        caption: 'Colony cats sunbathing after breakfast.',
      },
      {
        id: 'story_04',
        author_id: 'usr_rajesh_feed',
        media_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&auto=format&fit=crop&q=80',
        caption: 'Brave indie pup recovering well.',
      },
      {
        id: 'story_05',
        author_id: 'usr_maya_vet',
        media_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&auto=format&fit=crop&q=80',
        caption: 'Vet care routine checkups done.',
      },
    ];

    const insertStory = db.prepare(`
      INSERT INTO stories (id, author_id, media_url, media_type, caption, created_at, expires_at)
      VALUES (?, ?, ?, 'IMAGE', ?, datetime('now'), datetime('now', '+30 days'))
    `);

    for (const s of stories) {
      insertStory.run(s.id, s.author_id, s.media_url, s.caption);
    }

    // 5. Seed Posts (featuring Ananya's 4 puppies foster post as primary)
    const posts = [
      {
        id: 'post_ananya_puppies',
        author_id: 'usr_ananya',
        community_id: 'comm_street_feeders',
        content_type: 'PHOTO',
        title: '',
        body: 'There are 4 puppies near my street. Very friendly and playful. Anyone nearby interested in fostering?',
        media_urls: JSON.stringify([
          'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=500&auto=format&fit=crop&q=80',
        ]),
        tags: JSON.stringify(['FosterCare', 'Puppies', 'AdyarChennai', 'AnimalAdoption']),
        location_name: 'Adyar, Chennai',
        approx_lat: 13.0033,
        approx_lon: 80.255,
        visibility: 'PUBLIC',
        reactions: 128,
        comments: 26,
        shares: 12,
        safety_score: 1.0,
      },
      {
        id: 'post_002',
        author_id: 'usr_rajesh_feed',
        community_id: 'comm_street_feeders',
        content_type: 'FEEDING_UPDATE',
        title: 'Morning feeding completed for 18 dogs along 12th Main',
        body: 'Fresh warm rice, boiled eggs, and kibble served. All 18 neighborhood dogs accounted for. Clean cement water tub refilled!',
        media_urls: JSON.stringify(['https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=700&auto=format&fit=crop&q=80']),
        tags: JSON.stringify(['DailyFeeding', 'StreetDogs', 'CommunityCare']),
        location_name: 'Adyar Beach Road (~0.8 km away)',
        approx_lat: 13.001,
        approx_lon: 80.256,
        visibility: 'PUBLIC',
        reactions: 42,
        comments: 6,
        shares: 3,
        safety_score: 1.0,
      },
      {
        id: 'post_003',
        author_id: 'usr_maya_vet',
        community_id: 'comm_animal_rescue',
        content_type: 'HELP_REQUEST',
        title: 'Summer Hydration Advisory: Signs of Heatstroke in Community Animals',
        body: 'Keep clean earthen water bowls in shaded spots. Never pour freezing water on a panting dog—use room-temperature damp towels on paws.',
        media_urls: JSON.stringify(['https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=700&auto=format&fit=crop&q=80']),
        tags: JSON.stringify(['VeterinaryAdvice', 'Hydration', 'FirstAid']),
        location_name: 'Besant Nagar (~1.5 km away)',
        approx_lat: 12.9984,
        approx_lon: 80.2668,
        visibility: 'PUBLIC',
        reactions: 98,
        comments: 14,
        shares: 8,
        safety_score: 1.0,
      },
    ];

    const insertPost = db.prepare(`
      INSERT INTO posts (id, author_id, community_id, content_type, title, body, media_urls_json, tags_json, location_name, approx_lat, approx_lon, visibility, reaction_count, comment_count, share_count, safety_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of posts) {
      insertPost.run(p.id, p.author_id, p.community_id, p.content_type, p.title, p.body, p.media_urls, p.tags, p.location_name, p.approx_lat, p.approx_lon, p.visibility, p.reactions, p.comments, p.shares, p.safety_score);
    }

    // 6. Seed Comments & Reactions for Ananya's post
    const insertComment = db.prepare(`
      INSERT INTO post_comments (id, post_id, author_id, body, like_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertComment.run('cmt_001', 'post_ananya_puppies', 'usr_pachamuthu', 'They look so sweet! I can help foster 2 of them until weekend vaccination.', 8);
    insertComment.run('cmt_002', 'post_ananya_puppies', 'usr_maya_vet', 'I can do their deworming and first health check at our Adyar clinic tomorrow morning.', 12);
    insertComment.run('cmt_003', 'post_ananya_puppies', 'usr_rajesh_feed', 'Sharing with our local Adyar Feeders WhatsApp circle as well!', 5);

    const insertReaction = db.prepare(`
      INSERT INTO post_reactions (id, post_id, user_id, reaction_type)
      VALUES (?, ?, ?, ?)
    `);

    insertReaction.run('react_01', 'post_ananya_puppies', 'usr_pachamuthu', 'CARE');
    insertReaction.run('react_02', 'post_ananya_puppies', 'usr_maya_vet', 'SUPPORT');
    insertReaction.run('react_03', 'post_ananya_puppies', 'usr_rajesh_feed', 'HELPFUL');

    // 7. Seed SOS Emergency Cases
    const insertSos = db.prepare(`
      INSERT INTO sos_cases (id, reporter_id, emergency_type, animal_type, urgency, title, description, approx_location_name, approx_lat, approx_lon, media_urls_json, contact_preference, status, responder_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSos.run(
      'sos_001',
      'usr_ananya',
      'INJURED_ANIMAL',
      'Indie Dog (Tan)',
      'HIGH',
      'Injured puppy limping near Adyar Signal',
      'Small tan pup with mild paw scrape. Friendly and docile.',
      'Near Adyar Signal (~0.5 km away)',
      13.0012,
      80.2565,
      JSON.stringify(['https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80']),
      'IN_APP',
      'HELP_REQUESTED',
      3
    );

    // 8. Seed Feeding Logs
    const insertFeedLog = db.prepare(`
      INSERT INTO feeding_logs (id, user_id, animal_type, animal_count, food_type, quantity_desc, approx_location_name, approx_lat, approx_lon, notes, photo_url, visibility)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertFeedLog.run(
      'feed_001',
      'usr_pachamuthu',
      'Street Dogs',
      12,
      'Boiled Eggs & Rice with Turmeric',
      '5 kg',
      'Adyar Circle (~0.3 km away)',
      13.0012,
      80.2565,
      'All 12 fed peacefully. Clean water bowls filled.',
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80',
      'PUBLIC'
    );
  });

  run();
  console.log('✅ Feeder.life database successfully seeded with authentic welfare network data matching reference.');
}

if (require.main === module) {
  seedDatabase();
}
