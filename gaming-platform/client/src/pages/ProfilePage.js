import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/gameStore';
import { useApi } from '../hooks/useApi';

const AVATARS = ['🦊', '🐯', '🦁', '🐺', '🦅', '🐉', '🦋', '🌟', '⚡', '🔥', '🌊', '🎭', '🎪', '🚀', '💎', '🏆'];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();
  const api = useApi();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const changeAvatar = async (avatar) => {
    try {
      await api.put('/auth/profile', { avatar });
      updateUser({ avatar });
      setShowAvatarPicker(false);
    } catch (e) {
      console.error(e);
    }
  };

  const winRate = user?.total_games > 0
    ? Math.round((user.wins / user.total_games) * 100)
    : 0;

  const xpProgress = ((user?.xp || 0) % 500) / 500 * 100;

  return (
    <div className="scroll-y h-full" style={{ padding: '0 0 20px' }}>
      {/* Header bg */}
      <div style={{
        background: 'linear-gradient(135deg, #1A0A2E 0%, #0F0F1A 100%)',
        padding: '48px 20px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(124,58,237,0.1)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(236,72,153,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative' }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowAvatarPicker(true)}
              style={{
                width: 80, height: 80,
                borderRadius: '50%',
                background: 'var(--gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 40,
                cursor: 'pointer',
                border: '3px solid rgba(255,255,255,0.2)',
                boxShadow: '0 0 30px rgba(124,58,237,0.4)',
              }}
            >
              {user?.avatar}
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--bg-elevated)',
              border: '2px solid var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, cursor: 'pointer',
            }} onClick={() => setShowAvatarPicker(true)}>
              ✏️
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{user?.username}</h2>
            <div className="badge badge-purple" style={{ marginBottom: 8 }}>
              Level {user?.level} Champion
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div className="status-dot status-online" />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Online</span>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>Level {user?.level}</span>
            <span>{user?.xp || 0} / {(user?.level || 1) * 500} XP → Level {(user?.level || 1) + 1}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Currency */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '16px 16px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.1))',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 14,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 32 }}>💰</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B' }}>{user?.coins || 0}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Coins</div>
          </div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(124,58,237,0.1))',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 14,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 32 }}>💎</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#3B82F6' }}>{user?.gems || 0}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gems</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '16px 16px 0' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>📊 Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Wins', value: user?.wins || 0, icon: '🏆', color: '#F59E0B' },
            { label: 'Games', value: user?.total_games || 0, icon: '🎮', color: '#3B82F6' },
            { label: 'Win Rate', value: `${winRate}%`, icon: '📈', color: '#10B981' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--bg-card)',
              borderRadius: 12,
              padding: '14px 10px',
              textAlign: 'center',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 24 }}>{stat.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div style={{ padding: '16px 16px 0' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>🏅 Achievements</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { icon: '🎮', title: 'First Game', unlocked: (user?.total_games || 0) >= 1 },
            { icon: '🏆', title: 'First Win', unlocked: (user?.wins || 0) >= 1 },
            { icon: '⚡', title: '10 Games', unlocked: (user?.total_games || 0) >= 10 },
            { icon: '🔥', title: 'Win Streak', unlocked: false },
            { icon: '👑', title: 'Top 10', unlocked: false },
            { icon: '💎', title: 'Diamond', unlocked: (user?.level || 1) >= 10 },
          ].map((ach, i) => (
            <div key={i} style={{
              background: ach.unlocked ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${ach.unlocked ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
              borderRadius: 12,
              padding: '14px 8px',
              textAlign: 'center',
              opacity: ach.unlocked ? 1 : 0.5,
            }}>
              <div style={{ fontSize: 28, filter: ach.unlocked ? 'none' : 'grayscale(1)' }}>{ach.icon}</div>
              <div style={{ fontSize: 11, marginTop: 4, color: ach.unlocked ? 'var(--yellow)' : 'var(--text-muted)', fontWeight: 600 }}>
                {ach.title}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '20px 16px 0' }}>
        <button
          onClick={logout}
          className="btn btn-danger btn-full"
          style={{ marginTop: 8 }}
        >
          🚪 Sign Out
        </button>
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="modal-overlay" onClick={() => setShowAvatarPicker(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Choose Avatar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {AVATARS.map(avatar => (
                <button
                  key={avatar}
                  onClick={() => changeAvatar(avatar)}
                  style={{
                    fontSize: 36,
                    padding: '12px',
                    borderRadius: 12,
                    border: user?.avatar === avatar ? '2px solid var(--purple)' : '2px solid var(--border)',
                    background: user?.avatar === avatar ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
