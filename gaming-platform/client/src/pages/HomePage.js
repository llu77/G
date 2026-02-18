import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useGameStore } from '../store/gameStore';
import { useApi } from '../hooks/useApi';

const GAME_CARDS = [
  { type: 'uno', icon: '🎴', name: 'UNO', desc: 'Classic card game', color: '#EF4444', players: '2-4', tag: 'HOT' },
  { type: 'chess', icon: '♟️', name: 'Chess', desc: 'Strategic battle', color: '#3B82F6', players: '2', tag: 'CLASSIC' },
  { type: 'ludo', icon: '🎲', name: 'Ludo', desc: 'Board race', color: '#10B981', players: '2-4', tag: 'FUN' },
  { type: 'trivia', icon: '🧠', name: 'Trivia', desc: 'Knowledge battle', color: '#F59E0B', players: '2-6', tag: 'NEW' },
  { type: 'word', icon: '📝', name: 'Word Battle', desc: 'Guess the word', color: '#8B5CF6', players: '2-4', tag: 'POPULAR' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notifications, friends, setNotifications, setFriends, setFriendRequests } = useGameStore();
  const api = useApi();
  const [activeRooms, setActiveRooms] = useState([]);

  const xpProgress = user ? ((user.xp % 500) / 500) * 100 : 0;
  const nextLevel = user ? user.level + 1 : 2;

  useEffect(() => {
    // Load data
    Promise.all([
      api.get('/social/notifications'),
      api.get('/social/friends'),
      api.get('/social/friend-requests'),
      api.get('/rooms'),
    ]).then(([notifs, friendsList, requests, rooms]) => {
      setNotifications(notifs);
      setFriends(friendsList);
      setFriendRequests(requests);
      setActiveRooms(rooms.slice(0, 3));
    }).catch(console.error);
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;
  const onlineFriends = friends.filter(f => f.status === 'online');

  return (
    <div className="scroll-y h-full" style={{ padding: '0 0 16px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1A0A2E, #0F0F1A)',
        padding: '48px 20px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(124,58,237,0.15)' }} />
        <div style={{ position: 'absolute', top: 20, right: 20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(236,72,153,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
          <div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Welcome back,</p>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
              {user?.avatar} {user?.username}
            </h2>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => navigate('/profile')} style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(124,58,237,0.3)', border: '2px solid rgba(124,58,237,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, cursor: 'pointer',
            }}>
              {user?.avatar}
            </button>
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#EF4444', color: 'white',
                borderRadius: '50%', width: 18, height: 18,
                fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, border: '2px solid var(--bg-primary)',
              }}>{unread}</span>
            )}
          </div>
        </div>

        {/* Level Progress */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: '12px 16px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Level {user?.level}</span>
            <span style={{ color: 'var(--purple-light)' }}>{user?.xp} / {user?.level * 500} XP</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '16px 16px 0' }}>
        {[
          { icon: '🏆', value: user?.wins || 0, label: 'Wins' },
          { icon: '🎮', value: user?.total_games || 0, label: 'Games' },
          { icon: '💰', value: user?.coins || 0, label: 'Coins' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg-card)',
            borderRadius: 12,
            padding: '12px 8px',
            textAlign: 'center',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 22 }}>{stat.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Online Friends */}
      {onlineFriends.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              🟢 Online Friends
            </h3>
            <button onClick={() => navigate('/friends')} style={{ background: 'none', border: 'none', color: 'var(--purple-light)', fontSize: 13, cursor: 'pointer' }}>
              See all
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {onlineFriends.map(friend => (
              <div key={friend.id} style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ position: 'relative', marginBottom: 4 }}>
                  <div className="avatar" style={{ width: 48, height: 48, fontSize: 24 }}>{friend.avatar}</div>
                  <div className="status-dot status-online" style={{ position: 'absolute', bottom: 2, right: 2 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {friend.username}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Games Grid */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🎮 Games</h3>
          <button onClick={() => navigate('/lobby')} style={{ background: 'none', border: 'none', color: 'var(--purple-light)', fontSize: 13, cursor: 'pointer' }}>
            Find rooms
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {GAME_CARDS.map(game => (
            <button
              key={game.type}
              onClick={() => navigate(`/lobby?game=${game.type}`)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s',
              }}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                position: 'absolute', top: 0, right: 0,
                background: game.color, color: 'white',
                fontSize: 9, fontWeight: 800,
                padding: '4px 8px',
                borderRadius: '0 0 0 10px',
                letterSpacing: 1,
              }}>{game.tag}</div>

              <div style={{ fontSize: 36, marginBottom: 8, filter: `drop-shadow(0 0 10px ${game.color}60)` }}>
                {game.icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{game.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>{game.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12 }}>👥</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{game.players} players</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Rooms */}
      {activeRooms.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🔥 Active Rooms</h3>
            <button onClick={() => navigate('/lobby')} style={{ background: 'none', border: 'none', color: 'var(--purple-light)', fontSize: 13, cursor: 'pointer' }}>
              Browse all
            </button>
          </div>
          {activeRooms.map(room => (
            <div key={room.id} onClick={() => navigate(`/room/${room.id}`)} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28 }}>
                  {GAME_CARDS.find(g => g.type === room.game_type)?.icon || '🎮'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{room.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>by {room.host_name}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--purple-light)', fontWeight: 600 }}>
                  {room.current_players}/{room.max_players} 👥
                </div>
                <div style={{ fontSize: 11, color: 'var(--green)' }}>OPEN</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
