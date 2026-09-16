'use client';

import React, { useState } from 'react';
import { ShieldCheck, Flag, Users, Layers, Activity, Check, X, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/date';
import type { UserSession } from '@/lib/auth/session';

interface AdminClientProps {
  user: UserSession;
  initialReports: any[];
  initialUsers: any[];
  initialCommunities: any[];
  initialAuditLogs: any[];
}

export default function AdminClient({
  user,
  initialReports,
  initialUsers,
  initialCommunities,
  initialAuditLogs,
}: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'communities' | 'audit'>('reports');
  const [reports, setReports] = useState(initialReports);

  const handleResolveReport = (reportId: string, action: 'ACTIONED' | 'REJECTED') => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: action } : r))
    );
  };

  return (
    <div>
      {/* Admin Header */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.05) 0%, rgba(5, 150, 105, 0.08) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={28} color="var(--brand-primary)" />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Feeder.life Platform Admin & Moderation</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Maintain community standards, resolve safety reports, audit emergency dispatches, and oversee users.
            </p>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="feed-tabs-bar" style={{ marginTop: '16px', marginBottom: 0 }}>
          <button
            className={`feed-filter-chip ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Safety Reports ({reports.length})
          </button>
          <button
            className={`feed-filter-chip ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users ({initialUsers.length})
          </button>
          <button
            className={`feed-filter-chip ${activeTab === 'communities' ? 'active' : ''}`}
            onClick={() => setActiveTab('communities')}
          >
            Communities ({initialCommunities.length})
          </button>
          <button
            className={`feed-filter-chip ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Logs ({initialAuditLogs.length})
          </button>
        </div>
      </div>

      {/* 1. Reports Tab */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <Check size={40} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: 700 }}>Inbox Zero: No pending moderation reports</div>
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: r.reason === 'ANIMAL_CRUELTY' ? '#fee2e2' : 'var(--bg-secondary)',
                      color: r.reason === 'ANIMAL_CRUELTY' ? '#b91c1c' : 'var(--text-main)',
                    }}
                  >
                    REASON: {r.reason}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: r.status === 'PENDING' ? '#ea580c' : '#10b981',
                    }}
                  >
                    {r.status}
                  </span>
                </div>

                <div style={{ fontSize: '13.5px', marginBottom: '8px' }}>
                  Target: <strong>{r.target_type}</strong> (ID: {r.target_id}) &bull; Reported by:{' '}
                  <strong>{r.reporter_name}</strong>
                </div>

                {r.details && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px', marginBottom: '10px' }}>
                    &ldquo;{r.details}&rdquo;
                  </div>
                )}

                {r.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleResolveReport(r.id, 'ACTIONED')}
                      className="btn-danger"
                      style={{ padding: '5px 14px', fontSize: '12px' }}
                    >
                      Action / Remove Target
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'REJECTED')}
                      className="btn-secondary"
                      style={{ padding: '5px 14px', fontSize: '12px' }}
                    >
                      Dismiss Report
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. Users Tab */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>User</th>
                <th style={{ padding: '10px 8px' }}>Role</th>
                <th style={{ padding: '10px 8px' }}>Feeder Level</th>
                <th style={{ padding: '10px 8px' }}>Feeds</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {initialUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <strong>{u.full_name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{u.username} &bull; {u.email}</div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span className="badge-role">{u.role}</span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>{u.feeder_level || 'Member'}</td>
                  <td style={{ padding: '10px 8px' }}>{u.feeding_count || 0}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{u.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Communities Tab */}
      {activeTab === 'communities' && (
        <div className="card" style={{ padding: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>Community</th>
                <th style={{ padding: '10px 8px' }}>Category</th>
                <th style={{ padding: '10px 8px' }}>Location</th>
                <th style={{ padding: '10px 8px' }}>Members</th>
              </tr>
            </thead>
            <tbody>
              {initialCommunities.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <strong>{c.name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/{c.slug}</div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>{c.category}</td>
                  <td style={{ padding: '10px 8px' }}>{c.location_area}</td>
                  <td style={{ padding: '10px 8px' }}>{c.member_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {initialAuditLogs.map((log) => (
            <div key={log.id} className="card" style={{ padding: '12px 16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{log.action}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatDateTime(log.created_at)}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                Target: {log.entity_type} ({log.entity_id}) &bull; User: {log.user_name || 'System'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
