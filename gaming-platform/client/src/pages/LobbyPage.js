import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../store/gameStore';

const GAMES = [
  { type: 'all', icon: '🎮', name: 'All' },
  { type: 'uno', icon: '🎴', name: 'UNO' },
  { type: 'chess', icon: '♟️', name: 'Chess' },
  { type: 'ludo', icon: '🎲', name: 'Ludo' },
  { type: 'trivia', icon: '🧠', name: 'Trivia' },
  { type: 'word', icon: '📝', name: 'Word' },
];

export default function LobbyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const api = useApi();
  const { user } = useAuthStore();

  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState(searchParams.get('game') || 'all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', game_type: 'uno', max_players: 4, is_private: false, password: '' });

  const loadRooms = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?game_type=${filter}` : '';
      const data = await api.get(`/rooms${params}`);
      setRooms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRooms(); }, [filter]);

  const createRoom = async () => {
    if (!newRoom.name.trim()) return;
    try {
      setCreating(true);
      const room = await api.post('/rooms', newRoom);
      navigate(`/room/${room.id}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (room) => {
    try {
      if (room.is_private) {
        const password = prompt('Enter room password:');
        if (password === null) return;
        await api.post(`/rooms/${room.id}/join`, { password });
      } else {
        await api.post(`/rooms/${room.id}/join`);
      }
      navigate(`/room/${room.id}`);
    } catch (e) {
      alert(e.message);
    }
  };

  const GAME_ICONS = { uno: '🎴', chess: '♟️', ludo: '🎲', trivia: '🧠', word: '📝' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '48px 16px 16px', background: 'var(--bg-secondary)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800 }}>🎮 Game Lobby</h2>

        {/* Game Filter */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {GAMES.map(g => (
            <button
              key={g.type}
              onClick={() => setFilter(g.type)}
              style={{
                padding: '8px 16px',
                borderRadius: 99,
                border: 'none',
                background: filter === g.type ? 'var(--gradient)' : 'rgba(255,255,255,0.08)',
                color: filter === g.type ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {g.icon} {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms List */}
      <div className="scroll-y flex-1" style={{ padding: '12px 16px' }}>
        {/* Create Room Button */}
        <button
          onClick={() => setShowCreate(true)}
          style={{
            width: '100%',
            padding: '14px',
            background: 'rgba(124,58,237,0.15)',
            border: '2px dashed rgba(124,58,237,0.4)',
            borderRadius: 14,
            color: 'var(--purple-light)',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          ➕ Create New Room
        </button>

        {/* Refresh */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{rooms.length} rooms available</span>
          <button onClick={loadRooms} style={{ background: 'none', border: 'none', color: 'var(--purple-light)', cursor: 'pointer', fontSize: 13 }}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎮</div>
            <p>No rooms found. Create one!</p>
          </div>
        ) : (
          rooms.map(room => (
            <div key={room.id} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '14px',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{ fontSize: 36, flexShrink: 0 }}>
                {GAME_ICONS[room.game_type] || '🎮'}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {room.name}
                  </span>
                  {room.is_private ? <span style={{ fontSize: 12 }}>🔒</span> : null}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Host: {room.host_avatar} {room.host_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: 'rgba(124,58,237,0.2)',
                    color: 'var(--purple-light)',
                  }}>{room.game_type.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {room.current_players}/{room.max_players} players
                  </span>
                </div>
              </div>
              <button
                onClick={() => joinRoom(room)}
                disabled={room.current_players >= room.max_players}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: room.current_players >= room.max_players ? 'rgba(255,255,255,0.05)' : 'var(--gradient)',
                  color: room.current_players >= room.max_players ? 'var(--text-muted)' : 'white',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: room.current_players >= room.max_players ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {room.current_players >= room.max_players ? 'Full' : 'Join'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create Room Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>Create Room</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="input"
                placeholder="Room name"
                value={newRoom.name}
                onChange={e => setNewRoom(r => ({ ...r, name: e.target.value }))}
              />

              <label style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>Game</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {GAMES.filter(g => g.type !== 'all').map(g => (
                  <button
                    key={g.type}
                    onClick={() => setNewRoom(r => ({ ...r, game_type: g.type }))}
                    style={{
                      padding: '12px 8px',
                      borderRadius: 10,
                      border: `2px solid ${newRoom.game_type === g.type ? 'var(--purple)' : 'var(--border)'}`,
                      background: newRoom.game_type === g.type ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{g.icon}</div>
                    {g.name}
                  </button>
                ))}
              </div>

              <label style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>Max Players</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[2, 3, 4, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setNewRoom(r => ({ ...r, max_players: n }))}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8,
                      border: `2px solid ${newRoom.max_players === n ? 'var(--purple)' : 'var(--border)'}`,
                      background: newRoom.max_players === n ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
                      color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 16,
                    }}
                  >{n}</button>
                ))}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newRoom.is_private}
                  onChange={e => setNewRoom(r => ({ ...r, is_private: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>🔒 Private Room</span>
              </label>

              {newRoom.is_private && (
                <input
                  className="input"
                  type="password"
                  placeholder="Room password"
                  value={newRoom.password}
                  onChange={e => setNewRoom(r => ({ ...r, password: e.target.value }))}
                />
              )}

              <button
                onClick={createRoom}
                disabled={creating || !newRoom.name.trim()}
                className="btn btn-primary btn-full"
                style={{ marginTop: 8 }}
              >
                {creating ? '⏳ Creating...' : '🚀 Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
