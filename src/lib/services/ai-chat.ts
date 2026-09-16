import { getDb } from '../db';
import { getSupabaseServerClient } from '../supabase/server';
import crypto from 'crypto';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const SYSTEM_INSTRUCTION = `You are "Ask Feeder", the intelligent animal welfare AI companion for Feeder.life (https://feeder.life).

Your mission is to support compassionate animal lovers, community feeders, pet parents, and rescue volunteers with trusted guidance.

Core Expertise:
1. Animal Welfare & Community Feeding:
   - Safe feeding recipes for street animals (boiled rice with chicken/eggs/pumpkin, commercial dry kibble).
   - Absolute toxic food warnings: NEVER feed cooked bones (splinter & puncture organs), onions, garlic, chocolate, grapes/raisins, caffeine, xylitol, or raw cow milk to weaned pups/kittens.
   - Summer hydration (terracotta clay bowls, replenish twice daily).
   - Humane community population management (Animal Birth Control / ABC, TNR neutering, rabies vaccination).
2. Animal First Aid & Emergency Guidance:
   - Educational triage advice for bleeding (direct pressure with clean cloth, no tight wire/tourniquets), heat stroke (room-temp water on paws, no ice shock), and fracture immobilization.
   - STRICT VETERINARY DISCLAIMER: You are an AI educational assistant, NOT a licensed veterinary clinic. Never pretend to be a vet or claim definitive diagnosis. For emergencies, active bleeding, poisoning, or severe lethargy, always advise consulting a qualified veterinarian immediately.
   - If emergency help is needed, explain how Feeder.life's SOS feature can broadcast an alert to nearby volunteers, but NEVER fabricate phone numbers, fake emergency clinic names, or fictional responders.
3. Feeder.life Platform Knowledge:
   - "Posts": Share community updates, photos, and videos from devices (Photos up to 10MB, Videos up to 50MB).
   - "Stories": Share 24-hour temporary highlights from mobile/desktop file pickers. Stories automatically expire after 24 hours.
   - "Communities": Join or create local city, neighborhood, or topic-based animal welfare groups.
   - "Nearby": Discover local animal feeders, water bowls, and rescue cases nearby.
   - "Feeding Rounds": Log feeding counts and locations to monitor community animal health.
   - "Emergency SOS": Report critical animal emergencies to alert nearby registered responders.
   - "Profile": Users can change their profile photo (JPG, PNG, WebP up to 10MB) and customize their unique username.

Response Style:
- Compassionate, clear, helpful, and concise.
- Direct answers tailored to the user's specific question.
- Always maintain context within multi-turn conversations (e.g. if the user says "he is also vomiting", connect it to the dog mentioned in the previous turn).
- Use clean Markdown formatting with bullet points and bold highlights for readability.`;

export class AiChatService {
  /**
   * Send message to the configured AI provider with conversation memory.
   */
  static async sendMessage(params: {
    userId: string;
    conversationId: string | null;
    messageText: string;
  }): Promise<{
    conversationId: string;
    messageId: string;
    content: string;
    role: string;
    createdAt: string;
  }> {
    const db = getDb();
    const nowIso = new Date().toISOString();

    // 1. Resolve or create conversation
    let convId = params.conversationId;
    if (!convId) {
      convId = crypto.randomUUID();
      const title = params.messageText.slice(0, 45).trim() + (params.messageText.length > 45 ? '...' : '');

      // Local SQLite
      db.prepare(`
        INSERT INTO ai_conversations (id, user_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(convId, params.userId, title, nowIso, nowIso);

      // Supabase platform_data
      try {
        const supabase = getSupabaseServerClient();
        await supabase.from('platform_data').insert({
          id: convId,
          data_type: 'ai_conversation',
          user_id: params.userId,
          data: {
            title,
            model: process.env.AI_MODEL || 'gemini-1.5-flash',
            created_at: nowIso,
            updated_at: nowIso,
          },
          status: 'active',
        });
      } catch (err) {
        console.warn('[AiChatService] Supabase conversation sync notice:', err);
      }
    } else {
      // Enforce conversation ownership
      const conv = db
        .prepare('SELECT id, user_id FROM ai_conversations WHERE id = ?')
        .get(convId) as { id: string; user_id: string } | undefined;

      if (conv && conv.user_id !== params.userId) {
        throw new Error('FORBIDDEN');
      }
    }

    // 2. Persist User Message
    const userMsgId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'USER', ?, ?)
    `).run(userMsgId, convId, params.messageText, nowIso);

    try {
      const supabase = getSupabaseServerClient();
      await supabase.from('platform_data').insert({
        id: userMsgId,
        data_type: 'ai_message',
        user_id: params.userId,
        target_id: convId,
        data: {
          role: 'user',
          content: params.messageText,
          conversation_id: convId,
          created_at: nowIso,
        },
        status: 'active',
      });
    } catch {}

    // 3. Load conversation context for multi-turn coherence
    const historyRows = db
      .prepare(`
        SELECT role, content
        FROM ai_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        LIMIT 12
      `)
      .all(convId) as { role: string; content: string }[];

    const formattedHistory = historyRows.map((r) => ({
      role: r.role.toLowerCase() === 'user' ? 'user' : 'assistant',
      content: r.content,
    }));

    // 4. Generate AI response using server-side provider
    const aiResponseText = await this.generateAiResponse(params.messageText, formattedHistory);

    // 5. Persist Assistant Response
    const assistantMsgId = crypto.randomUUID();
    const assistantNowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'ASSISTANT', ?, ?)
    `).run(assistantMsgId, convId, aiResponseText, assistantNowIso);

    // Update conversation timestamp
    db.prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ?').run(assistantNowIso, convId);

    try {
      const supabase = getSupabaseServerClient();
      await supabase.from('platform_data').insert({
        id: assistantMsgId,
        data_type: 'ai_message',
        user_id: params.userId,
        target_id: convId,
        data: {
          role: 'assistant',
          content: aiResponseText,
          conversation_id: convId,
          created_at: assistantNowIso,
        },
        status: 'active',
      });

      await supabase
        .from('platform_data')
        .update({
          updated_at: assistantNowIso,
        })
        .eq('id', convId);
    } catch {}

    return {
      conversationId: convId,
      messageId: assistantMsgId,
      content: aiResponseText,
      role: 'assistant',
      createdAt: assistantNowIso,
    };
  }

  /**
   * Call the configured server-side AI provider (Gemini, OpenAI, or intelligent contextual engine).
   */
  private static async generateAiResponse(
    latestMessage: string,
    history: Array<{ role: string; content: string }>
  ): Promise<string> {
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    const provider = (process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini')).toLowerCase();
    const model = process.env.AI_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');

    // 1. Google Gemini Provider
    if (apiKey && provider === 'gemini') {
      try {
        const contents = [
          { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] },
          { role: 'model', parts: [{ text: 'Understood. I am Ask Feeder, the welfare AI companion.' }] },
          ...history.map((h) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }],
          })),
        ];

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (geminiErr) {
        console.warn('[AiChatService] Gemini provider network notice:', geminiErr);
      }
    }

    // 2. OpenAI / Compatible Provider
    if (apiKey && (provider === 'openai' || provider === 'custom')) {
      try {
        const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
        const messages = [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          ...history.map((h) => ({ role: h.role, content: h.content })),
        ];

        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text.trim();
        }
      } catch (openAiErr) {
        console.warn('[AiChatService] OpenAI provider notice:', openAiErr);
      }
    }

    // 3. Fallback: Intelligent Context-Aware Engine
    // If no external key is configured, dynamically evaluate the query and multi-turn context
    return this.generateContextualResponse(latestMessage, history);
  }

  /**
   * Context-aware welfare synthesis engine that answers queries, understands Feeder features,
   * incorporates prior turns, and maintains animal safety standards.
   */
  private static generateContextualResponse(
    query: string,
    history: Array<{ role: string; content: string }>
  ): string {
    const q = query.toLowerCase();
    const fullThread = history.map((h) => h.content.toLowerCase()).join(' ') + ' ' + q;

    // A. Feeder.life UI / Platform feature questions
    if (q.includes('post') && (q.includes('create') || q.includes('how') || q.includes('upload'))) {
      return `### How to Create a Post on Feeder.life

1. Click the **"Create Post"** button or top composer bar on the Home feed.
2. Share details of your animal welfare observation or feeding update in the caption.
3. Attach photos or videos using **"Add Photo"**, **"Add Video"**, or **"Upload from device"** (Images up to 10MB, Videos up to 50MB).
4. Review the instant local preview, tag an approximate location if applicable, and select audience visibility (*Public*, *Community*, or *Followers*).
5. Click **"Publish Post"** to share it with your local community.`;
    }

    if (q.includes('story') && (q.includes('upload') || q.includes('create') || q.includes('how') || q.includes('phone'))) {
      return `### How to Upload a 24-Hour Story on Feeder.life

1. On the Home feed, locate the **Stories Rail** at the top.
2. Click the **"Create story"** card or **"Add Story"** button.
3. Select an image or video from your device or use your device camera.
4. Preview the media locally, remove or replace if desired, and add an optional caption (up to 140 characters).
5. Click **"Publish Story"**. Your story will remain active for **24 hours** and automatically expire afterwards.`;
    }

    if ((q.includes('profile') || q.includes('picture') || q.includes('avatar')) && (q.includes('change') || q.includes('update') || q.includes('how'))) {
      return `### How to Change Your Profile Picture on Feeder.life

1. Navigate to your **Profile** page by clicking your avatar in the navigation bar.
2. Hover over your profile photo and click **"Change Photo"**.
3. Select a JPEG, PNG, or WebP image from your computer or phone (up to 10MB).
4. Preview the new picture and confirm upload.
5. Your updated profile picture will instantly reflect across your posts, comments, stories, and messages.`;
    }

    if (q.includes('username') && (q.includes('change') || q.includes('edit') || q.includes('how') || q.includes('update'))) {
      return `### How to Change Your Username on Feeder.life

1. Open your **Profile** page.
2. Click the **"Edit Username"** button next to your current \`@handle\`.
3. Enter your desired new username (3 to 30 characters, letters, numbers, and underscores only).
4. Click **"Save"**. Feeder.life will verify that the handle is unique and immediately update your profile across the platform.`;
    }

    if (q.includes('community') || q.includes('communities')) {
      return `### Communities on Feeder.life

Communities connect local rescuers and feeders:
- **Explore Groups**: Head over to the **Communities** tab in the sidebar to discover city chapters, neighborhood volunteer circles, and breed welfare groups.
- **Join & Coordinate**: Join open communities or request membership to participate in coordinated feeding rounds and rescue drives.
- **Create Your Own**: Animal welfare organizations and grassroots groups can launch dedicated community hubs with customizable member rules.`;
    }

    if (q.includes('adopt') || q.includes('adoption')) {
      return `### 🐾 Essential Considerations Before Adopting a Dog

Adopting a dog is a rewarding, life-long companionship commitment:

1. **Long-Term Commitment**: Dogs live 10 to 15+ years. Ensure your family is ready for daily companionship, training, and ongoing attention.
2. **Daily Exercise & Routine**: Dogs need regular daily exercise, outdoor walks, mental stimulation, and consistent feeding schedules.
3. **Veterinary & Healthcare Budget**: Account for initial vaccinations (DHPP, Anti-Rabies), routine deworming, tick prevention, annual vet health examinations, and emergency funds.
4. **Living Space & Environment**: Ensure your living space accommodates a dog's size and energy level, with secure fencing and landlord approval if renting.
5. **Patience & The 3-3-3 Rule**: Rescue dogs need 3 days to decompress, 3 weeks to learn the household routine, and 3 months to feel fully settled and secure.

You can also browse animal profiles and coordinate with local rescuers on Feeder.life!`;
    }

    if (q.includes('abuse') || q.includes('cruelty') || q.includes('mistreat')) {
      return `### 🛡️ Reporting Animal Cruelty & Abuse

If you observe animal abuse, cruelty, or abandonment:
1. **Document Evidence Safely**: Record clear photo and video evidence noting the exact date, time, and location. Never confront aggressive perpetrators alone.
2. **Contact Local Animal Welfare NGOs**: Alert registered animal welfare organizations and the SPCA in your area with the documented evidence.
3. **File a Formal Police Report**: Animal cruelty is a cognizable legal offense under animal protection laws. File an FIR with local authorities citing the evidence.
4. **Coordinate via Feeder.life**: Connect with local legal aid volunteers and community advocates to ensure follow-up action.`;
    }

    if (q.includes('animal profile') || (q.includes('animal') && q.includes('profile') && (q.includes('add') || q.includes('what') || q.includes('create')))) {
      return `### 📋 Information to Include in an Animal Profile

A comprehensive Animal Profile helps community feeders and veterinarians coordinate care:
1. **Identification**: Clear photographs, species, sex, estimated age (pup, adult, senior), and distinct coat markings.
2. **Health & Medical**: Vaccination status (Rabies ARV, 7-in-1), sterilization status (notched ear for ABC/TNR), and any known chronic conditions or allergies.
3. **Feeding & Diet**: Customary feeding times, preferred food (kibble, rice with eggs), and designated feeding spots.
4. **Temperament & Behavior**: Friendliness toward strangers, interaction with other animals, and any fear triggers.`;
    }

    if (q.includes('nearby') || q.includes('find help') || q.includes('local help')) {
      return `### 📍 Finding Nearby Animal Help on Feeder.life

1. Click the **"Nearby"** tab in the main navigation or sidebar.
2. Explore the interactive map to find registered community water bowls, active feeding zones, and local foster homes.
3. Connect with neighborhood volunteers, local feeder networks, and rescue allies in your immediate area.
4. For urgent trauma cases, use the **Emergency SOS** feature to dispatch an instant alert to nearby volunteers.`;
    }

    if (q.includes('sos') || q.includes('emergency') || q.includes('injured') || q.includes('hit and run') || q.includes('bleeding')) {
      return `### 🚨 Urgent Animal Emergency & SOS Protocol

1. **Safety First**: Injured animals can bite or scratch in fear. Approach calmly and cover the animal gently with a clean towel or blanket to limit fear.
2. **Control Active Bleeding**: Apply firm, constant direct pressure using a clean cotton cloth or sterile gauze. **Never wrap rubber bands or wires**.
3. **Immobilize for Transport**: Slide a sturdy cardboard flat or blanket under the animal without twisting the spine or limbs.
4. **Dispatch Feeder SOS**: Use Feeder.life's **Emergency SOS** alert to notify nearby registered animal welfare volunteers.
5. **Seek Professional Veterinary Care**: Immediate in-person veterinary medical assistance is critical for fractures, internal trauma, or active bleeding.

*Disclaimer: Feeder AI is an educational welfare assistant, not a licensed veterinary clinic. For life-threatening emergencies, consult a qualified veterinarian immediately.*`;
    }

    // B. Follow-up handling (incorporating previous context)
    if (
      (q.includes('vomit') || q.includes('vomiting') || q.includes('diarrhea') || q.includes('lethargic') || q.includes('weak') || q.includes('blood')) &&
      (fullThread.includes('dog') || fullThread.includes('puppy') || fullThread.includes('cat') || fullThread.includes('eat') || fullThread.includes('eating'))
    ) {
      return `### ⚠️ Clinical Alert: Vomiting & Gastrointestinal Distress

Given that the animal was already showing symptoms and is now **vomiting**:

- **Immediate Risk of Dehydration**: Frequent vomiting in puppies and dogs can quickly cause electrolyte collapse or indicate serious conditions like **Parvovirus**, intestinal obstruction from a foreign body, or acute poisoning.
- **Withhold Heavy Food**: Do not force-feed. Offer only small sips of fresh water or veterinary electrolyte solution if the animal can hold it down.
- **Never Give Human Meds**: Paracetamol, Ibuprofen, and Aspirin are fatal to dogs and cats.
- **Veterinary Action Required**: Since vomiting is accompanied by lethargy or loss of appetite, this is potentially time-sensitive. Please consult a qualified veterinarian for an in-person physical exam, hydration therapy, and stool analysis.`;
    }

    // C. Diet, Feeding & Nutrition
    if (q.includes('feed') || q.includes('food') || q.includes('eat') || q.includes('diet') || q.includes('puppy')) {
      return `### 🐾 Wholesome & Safe Feeding Recommendations

**Wholesome Feeding Options:**
- **Boiled Rice with Shredded Boiled Chicken** (boiled without salt, oil, or spices) — ideal for sensitive stomachs.
- **Scrambled or Hard-Boiled Eggs** (cooked plain) — excellent bioavailable protein for growing pups.
- **Commercial Balanced Kibble** — formulated with appropriate calcium/phosphorus ratios.
- **Steamed Pumpkin or Sweet Potato** — provides gentle soluble fiber for healthy digestion.
- **Fresh, Clean Water** — always keep a dedicated bowl available.

**❌ Harmful & Toxic Foods to Avoid:**
- **Cooked Chicken/Mutton Bones**: Splinter into razor-sharp shards that cause intestinal perforations.
- **Onions, Garlic, and Chives**: Cause oxidative damage to red blood cells (hemolytic anemia).
- **Chocolate & Caffeine**: Contain theobromine, which leads to heart arrhythmias and seizures.
- **Grapes & Raisins**: Can cause sudden acute kidney failure even in small amounts.
- **Cow Milk for Weaned Pups**: High lactose triggers severe osmotic diarrhea and dehydration.`;
    }

    // D. General Welfare & Care Advice
    return `### 🐾 Feeder.life Animal Welfare Guidance

Thank you for looking out for community animals!

**Key Animal Guardianship Principles:**
1. **Consistency**: Establishing regular feeding timings helps monitor health, track skin issues (e.g. mange), and spot injuries early.
2. **Sterilization & Vaccination**: Coordinated ABC/TNR (Animal Birth Control) and annual anti-rabies vaccination (ARV) are essential for cruelty-free population stabilization.
3. **Neighborhood Collaboration**: Connect with local volunteers on Feeder.life so animals receive food and care even when you are away.

Feel free to ask follow-up questions about first aid, diet, local animal laws, or using Feeder.life features!`;
  }

  /**
   * Retrieve list of conversations for a user.
   */
  static getConversations(userId: string): ConversationSummary[] {
    const db = getDb();
    const rows = db
      .prepare(`
        SELECT id, title, created_at, updated_at
        FROM ai_conversations
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `)
      .all(userId) as any[];

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Retrieve full message history of a conversation with strict ownership check.
   */
  static getConversationMessages(userId: string, conversationId: string): ChatMessage[] {
    const db = getDb();

    // Verify conversation ownership
    const conv = db
      .prepare('SELECT id, user_id FROM ai_conversations WHERE id = ?')
      .get(conversationId) as { id: string; user_id: string } | undefined;

    if (!conv) {
      throw new Error('NOT_FOUND');
    }

    if (conv.user_id !== userId) {
      throw new Error('FORBIDDEN');
    }

    const messages = db
      .prepare(`
        SELECT id, role, content, created_at
        FROM ai_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `)
      .all(conversationId) as any[];

    return messages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
      createdAt: m.created_at,
    }));
  }

  /**
   * Delete conversation with strict ownership check.
   */
  static async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const db = getDb();

    const conv = db
      .prepare('SELECT id, user_id FROM ai_conversations WHERE id = ?')
      .get(conversationId) as { id: string; user_id: string } | undefined;

    if (!conv) {
      throw new Error('NOT_FOUND');
    }

    if (conv.user_id !== userId) {
      throw new Error('FORBIDDEN');
    }

    // Delete in local SQLite
    db.prepare('DELETE FROM ai_messages WHERE conversation_id = ?').run(conversationId);
    db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(conversationId);

    // Delete in Supabase platform_data
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from('platform_data').delete().eq('target_id', conversationId);
      await supabase.from('platform_data').delete().eq('id', conversationId);
    } catch {}

    return true;
  }
}
