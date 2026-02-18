import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useGameStore } from '../store/gameStore';
import { useApi } from '../hooks/useApi';

export default function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { friends, friendRequests, setFriends, setFriendRequests } = useGameStore();
  const api = useApi();

  const [tab, setTab] = useState('friends');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fs, reqs] = await Promise.all([
        api.get('/social/friends'),
        api.get('/social/friend-requests'),
      ]);
      setFriends(fs);
      setFriendRequests(reqs);
    } catch (e) {}
  };

  const searchUsers = async (q) => {
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const results = await api.get(`/social/search?q=${encodeURIComponent(q)}`);
      setSearchResults(results);
    } catch (e) {}
  };

  useEffect(() => {
    const t = setTimeout(() => searchUsers(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const sendRequest = async (userId) => {
    try {
      await api.post(`/social/friends/request/${userId}`);
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      alert('Friend request sent!');
    } catch (e) {
      alert(e.message);
    }
  };

  const respondToRequest = async (friendshipId, action) => {
    try {
      await api.put(`/social/${friendshipId}`, { action });
      loadData();
    } catch (e) {}
  };

  const removeFriend = async (friendId) => {
    if (!confirm('Remove this friend?')) return;
    try {
      await api.delete(`/social/friends/${friendId}`);
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (e) {}
  };

  const onlineFriends = friends.filter(f => f.status === 'online');
  const offlineFriends = friends.filter(f => f.status !== 'online');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '48px 16px 12px', background: 'var(--bg-secondary)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800 }}>👥 Friends</h2>

        {/* Search */}
        <input
          className="input"
          placeholder="🔍 Find players..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Search Results */}
      {search.length >= 2 && (
        <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', maxHeight: '40%', overflowY: 'auto' }}>
          {searchResults.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0', margin: 0 }}>No users found</p>
          ) : (
            searchResults.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="avatar">{u.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Level {u.level} • {u.wins} wins</div>
                </div>
                <button
                  onClick={() => sendRequest(u.id)}
                  className="btn btn-primary btn-sm"
                >
                  Add+
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { id: 'friends', label: `Friends (${friends.length})` },
          { id: 'requests', label: `Requests ${friendRequests.length > 0 ? `(${friendRequests.length})` : ''}` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '12px', border: 'none',
              background: 'none',
              color: tab === t.id ? 'var(--purple-light)' : 'var(--text-muted)',
              fontWeight: tab === t.id ? 700 : 400,
              borderBottom: tab === t.id ? '2px solid var(--purple)' : '2px solid transparent',
              cursor: 'pointer', fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="scroll-y flex-1" style={{ padding: '12px 16px' }}>
        {tab === 'friends' && (
          <>
            {/* Online */}
            {onlineFriends.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                  🟢 Online — {onlineFriends.length}
                </div>
                {onlineFriends.map(friend => (
                  <FriendItem key={friend.id} friend={friend} onRemove={() => removeFriend(friend.id)} navigate={navigate} userId={user?.id} />
                ))}
              </>
            )}

            {/* Offline */}
            {offlineFriends.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
                  ⚫ Offline — {offlineFriends.length}
                </div>
                {offlineFriends.map(friend => (
                  <FriendItem key={friend.id} friend={friend} onRemove={() => removeFriend(friend.id)} navigate={navigate} userId={user?.id} />
                ))}
              </>
            )}

            {friends.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
                <p style={{ margin: 0 }}>No friends yet. Search for players to add!</p>
              </div>
            )}
          </>
        )}

        {tab === 'requests' && (
          <>
            {friendRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
                <p style={{ margin: 0 }}>No friend requests</p>
              </div>
            ) : (
              friendRequests.map(req => (
                <div key={req.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px',
                  background: 'var(--bg-card)',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid var(--border)',
                }}>
                  <div className="avatar">{req.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{req.username}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Level {req.level}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => respondToRequest(req.id, 'accept')}
                      style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#10B981', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >✓</button>
                    <button
                      onClick={() => respondToRequest(req.id, 'reject')}
                      style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.2)', color: '#EF4444', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >✕</button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FriendItem({ friend, onRemove, navigate }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px',
      background: 'var(--bg-card)',
      borderRadius: 12,
      marginBottom: 8,
      border: '1px solid var(--border)',
      position: 'relative',
    }}>
      <div style={{ position: 'relative' }}>
        <div className="avatar">{friend.avatar}</div>
        <div className={`status-dot ${friend.status === 'online' ? 'status-online' : 'status-offline'}`}
          style={{ position: 'absolute', bottom: 0, right: 0 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{friend.username}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Level {friend.level} • {friend.wins} wins
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => navigate(`/chat/${friend.id}`)}
          style={{ padding: '8px', borderRadius: 8, border: 'none', background: 'rgba(124,58,237,0.2)', color: 'var(--purple-light)', cursor: 'pointer', fontSize: 18 }}
        >💬</button>
        <button
          onClick={() => { if (confirm('Remove friend?')) onRemove(); }}
          style={{ padding: '8px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#EF4444', cursor: 'pointer', fontSize: 18 }}
        >×</button>
      </div>
    </div>
  );
}
