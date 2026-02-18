import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/gameStore';
import { useApi } from '../hooks/useApi';

const GAMES = [
  { type: 'overall', icon: '🌟', name: 'Overall' },
  { type: 'uno', icon: '🎴', name: 'UNO' },
  { type: 'chess', icon: '♟️', name: 'Chess' },
  { type: 'ludo', icon: '🎲', name: 'Ludo' },
  { type: 'trivia', icon: '🧠', name: 'Trivia' },
  { type: 'word', icon: '📝', name: 'Word' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const api = useApi();
  const [gameFilter, setGameFilter] = useState('overall');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [gameFilter]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const result = await api.get(`/social/leaderboard?game_type=${gameFilter}&limit=50`);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const myRank = data.findIndex(u => u.id === user?.id) + 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '48px 16px 16px',
        background: 'linear-gradient(135deg, #1A0A2E, #0F0F1A)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(245,158,11,0.1)' }} />
        <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800 }}>🏆 Leaderboard</h2>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {GAMES.map(g => (
            <button
              key={g.type}
              onClick={() => setGameFilter(g.type)}
              style={{
                padding: '7px 14px',
                borderRadius: 99,
                border: 'none',
                background: gameFilter === g.type ? 'var(--gradient-gold)' : 'rgba(255,255,255,0.08)',
                color: gameFilter === g.type ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 5,
                flexShrink: 0,
              }}
            >
              {g.icon} {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      {!loading && data.length >= 3 && (
        <div style={{
          padding: '20px 16px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, height: 100 }}>
            {/* 2nd place */}
            <PodiumItem user={data[1]} rank={2} height={70} />
            {/* 1st place */}
            <PodiumItem user={data[0]} rank={1} height={100} />
            {/* 3rd place */}
            <PodiumItem user={data[2]} rank={3} height={50} />
          </div>
        </div>
      )}

      {/* My rank */}
      {myRank > 0 && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(124,58,237,0.1)',
          borderBottom: '1px solid rgba(124,58,237,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, color: 'var(--purple-light)', fontWeight: 700 }}>
            Your rank: #{myRank}
          </span>
        </div>
      )}

      {/* List */}
      <div className="scroll-y flex-1" style={{ padding: '8px 16px' }}>
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          data.map((u, index) => {
            const rank = index + 1;
            const isMe = u.id === user?.id;

            return (
              <div key={u.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                background: isMe ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
                border: `1px solid ${isMe ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
                borderRadius: 12,
                marginBottom: 6,
              }}>
                <div style={{
                  width: 32, textAlign: 'center',
                  fontSize: rank <= 3 ? 22 : 14,
                  fontWeight: 800,
                  color: rank <= 3 ? undefined : 'var(--text-muted)',
                }}>
                  {rank <= 3 ? MEDALS[rank - 1] : rank}
                </div>

                <div style={{ position: 'relative' }}>
                  <div className="avatar">{u.avatar}</div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {u.username}
                    {isMe && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--purple-light)' }}>(You)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Level {u.level}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: rank <= 3 ? '#F59E0B' : 'var(--text-primary)' }}>
                    {gameFilter === 'overall' ? u.xp : u.score || u.xp}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {gameFilter === 'overall' ? 'XP' : 'Points'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PodiumItem({ user, rank, height }) {
  const colors = { 1: '#F59E0B', 2: '#94A3B8', 3: '#B45309' };
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontSize: 28 }}>{user.avatar}</div>
      <div style={{ fontSize: 11, color: colors[rank], fontWeight: 700, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
        {user.username}
      </div>
      <div style={{
        width: rank === 1 ? 64 : 52,
        height,
        background: `linear-gradient(to top, ${colors[rank]}40, ${colors[rank]}20)`,
        border: `2px solid ${colors[rank]}60`,
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}>
        <div style={{ fontSize: rank === 1 ? 22 : 18 }}>{medals[rank]}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: colors[rank] }}>#{rank}</div>
      </div>
    </div>
  );
}
