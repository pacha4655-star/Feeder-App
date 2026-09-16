import { getDb } from '../db';
import { getSupabaseServerClient } from '../supabase/server';

export interface ConversationSummary {
  id: string;
  type: string;
  title: string | null;
  updatedAt: string;
  unreadCount: number;
  lastMessage: {
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
  otherParticipant: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string;
    role: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  body: string;
  mediaUrl?: string | null;
  createdAt: string;
}

export class MessagingService {
  static getConversations(userId: string): ConversationSummary[] {
    const db = getDb();

    // Get all conversations user belongs to
    const memberRows = db
      .prepare(`
        SELECT cm.conversation_id, cm.last_read_at, c.type, c.title, c.updated_at
        FROM conversation_members cm
        JOIN conversations c ON cm.conversation_id = c.id
        WHERE cm.user_id = ?
        ORDER BY c.updated_at DESC
      `)
      .all(userId) as {
      conversation_id: string;
      last_read_at: string | null;
      type: string;
      title: string | null;
      updated_at: string;
    }[];

    const results: ConversationSummary[] = [];

    for (const row of memberRows) {
      // Find the other participant in direct conversation
      const otherUser = db
        .prepare(`
          SELECT u.id, u.full_name, u.username, u.avatar_url, u.role
          FROM conversation_members cm
          JOIN users u ON cm.user_id = u.id
          WHERE cm.conversation_id = ? AND cm.user_id != ?
          LIMIT 1
        `)
        .get(row.conversation_id, userId) as any;

      // Find last message
      const lastMsg = db
        .prepare(`
          SELECT body, created_at, sender_id
          FROM messages
          WHERE conversation_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `)
        .get(row.conversation_id) as any;

      // Unread count
      let unreadCount = 0;
      if (row.last_read_at) {
        unreadCount = (
          db
            .prepare(`
              SELECT COUNT(*) as count
              FROM messages
              WHERE conversation_id = ? AND created_at > ? AND sender_id != ?
            `)
            .get(row.conversation_id, row.last_read_at, userId) as { count: number }
        )?.count || 0;
      } else {
        unreadCount = (
          db
            .prepare(`
              SELECT COUNT(*) as count
              FROM messages
              WHERE conversation_id = ? AND sender_id != ?
            `)
            .get(row.conversation_id, userId) as { count: number }
        )?.count || 0;
      }

      results.push({
        id: row.conversation_id,
        type: row.type,
        title: row.title,
        updatedAt: row.updated_at,
        unreadCount,
        lastMessage: lastMsg
          ? {
              body: lastMsg.body,
              createdAt: lastMsg.created_at,
              senderId: lastMsg.sender_id,
            }
          : null,
        otherParticipant: otherUser
          ? {
              id: otherUser.id,
              fullName: otherUser.full_name,
              username: otherUser.username,
              avatarUrl: otherUser.avatar_url,
              role: otherUser.role,
            }
          : null,
      });
    }

    return results;
  }

  static getOrCreateDirectConversation(user1Id: string, user2Id: string): string {
    const db = getDb();

    // Check if a direct conversation already exists between both users
    const existing = db
      .prepare(`
        SELECT cm1.conversation_id
        FROM conversation_members cm1
        JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
        JOIN conversations c ON cm1.conversation_id = c.id
        WHERE cm1.user_id = ? AND cm2.user_id = ? AND c.type = 'DIRECT'
        LIMIT 1
      `)
      .get(user1Id, user2Id) as { conversation_id: string } | undefined;

    if (existing) {
      return existing.conversation_id;
    }

    // Create new conversation
    const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO conversations (id, type, created_at, updated_at)
        VALUES (?, 'DIRECT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(convId);

      db.prepare(`
        INSERT INTO conversation_members (id, conversation_id, user_id, role)
        VALUES (?, ?, ?, 'MEMBER')
      `).run(`cm_${Date.now()}_1`, convId, user1Id);

      db.prepare(`
        INSERT INTO conversation_members (id, conversation_id, user_id, role)
        VALUES (?, ?, ?, 'MEMBER')
      `).run(`cm_${Date.now()}_2`, convId, user2Id);
    })();

    // Dual-write to Supabase platform_data
    try {
      const supabase = getSupabaseServerClient();
      void supabase.from('platform_data').insert({
        data_type: 'conversation',
        user_id: user1Id,
        target_id: user2Id,
        status: 'active',
        data: {
          conversation_id: convId,
          type: 'DIRECT',
          participants: [user1Id, user2Id],
        },
      });
    } catch {}

    return convId;
  }

  static getMessages(conversationId: string, userId: string): ChatMessage[] {
    const db = getDb();

    // Verify membership
    const isMember = db
      .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
      .get(conversationId, userId);

    if (!isMember) {
      throw new Error('Not authorized to view this conversation');
    }

    // Mark as read
    db.prepare(`
      UPDATE conversation_members
      SET last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?
    `).run(conversationId, userId);

    const rows = db
      .prepare(`
        SELECT m.id, m.conversation_id, m.sender_id, m.body, m.media_url, m.created_at,
               u.full_name as sender_name, u.username as sender_username, u.avatar_url as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
      `)
      .all(conversationId) as any[];

    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      senderId: r.sender_id,
      senderName: r.sender_name,
      senderUsername: r.sender_username,
      senderAvatar: r.sender_avatar,
      body: r.body,
      mediaUrl: r.media_url,
      createdAt: r.created_at,
    }));
  }

  static sendMessage(conversationId: string, senderId: string, body: string, mediaUrl?: string): ChatMessage {
    const db = getDb();

    // Verify membership
    const isMember = db
      .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
      .get(conversationId, senderId);

    if (!isMember) {
      throw new Error('Not authorized to send in this conversation');
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, body, media_url, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(msgId, conversationId, senderId, body.trim(), mediaUrl || null);

      db.prepare(`
        UPDATE conversations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(conversationId);

      // Update sender's last_read_at
      db.prepare(`
        UPDATE conversation_members
        SET last_read_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ? AND user_id = ?
      `).run(conversationId, senderId);
    })();

    const sender = db
      .prepare('SELECT full_name, username, avatar_url FROM users WHERE id = ?')
      .get(senderId) as any;

    // Dual write message to Supabase platform_data
    try {
      const supabase = getSupabaseServerClient();
      void supabase.from('platform_data').insert({
        data_type: 'message',
        user_id: senderId,
        target_id: conversationId,
        status: 'sent',
        data: {
          id: msgId,
          conversation_id: conversationId,
          body: body.trim(),
          media_url: mediaUrl || null,
          created_at: new Date().toISOString(),
        },
      });

      // Notify other members
      const otherMembers = db
        .prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?')
        .all(conversationId, senderId) as { user_id: string }[];

      for (const m of otherMembers) {
        db.prepare(`
          INSERT INTO notifications (id, recipient_id, sender_id, type, title, body, target_url)
          VALUES (?, ?, ?, 'SYSTEM', 'New Message', ?, ?)
        `).run(
          `notif_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          m.user_id,
          senderId,
          `${sender?.full_name || 'User'} sent you a message: ${body.trim().slice(0, 50)}`,
          `/messages`
        );
      }
    } catch {}

    return {
      id: msgId,
      conversationId,
      senderId,
      senderName: sender?.full_name || 'User',
      senderUsername: sender?.username || 'user',
      senderAvatar: sender?.avatar_url || '',
      body: body.trim(),
      mediaUrl: mediaUrl || null,
      createdAt: new Date().toISOString(),
    };
  }

  static deleteMessage(conversationId: string, messageId: string, userId: string, userRole?: string): boolean {
    const db = getDb();

    // Verify membership
    const isMember = db
      .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
      .get(conversationId, userId);

    if (!isMember) {
      throw new Error('Not authorized to access this conversation');
    }

    const msg = db.prepare('SELECT sender_id FROM messages WHERE id = ? AND conversation_id = ?').get(messageId, conversationId) as { sender_id: string } | undefined;
    if (!msg) {
      throw new Error('Message not found');
    }

    const isAuthor = msg.sender_id === userId;
    const isStaff = ['PLATFORM_ADMIN', 'PLATFORM_MODERATOR'].includes(userRole || '');

    if (!isAuthor && !isStaff) {
      throw new Error('Not authorized to delete this message');
    }

    db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);

    // Delete in Supabase platform_data
    try {
      const supabase = getSupabaseServerClient();
      void supabase
        .from('platform_data')
        .delete()
        .eq('data_type', 'message')
        .filter('data->>id', 'eq', messageId);
    } catch {}

    return true;
  }
}
