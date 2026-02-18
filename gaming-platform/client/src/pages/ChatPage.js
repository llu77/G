import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { useApi } from '../hooks/useApi';

export default function ChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { emit, on } = useSocket();
  const api = useApi();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [friend, setFriend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    loadChat();

    const cleanup = [
      on('new_dm', (msg) => {
        if (msg.senderId === userId || msg.receiverId === userId) {
          setMessages(prev => [...prev, msg]);
        }
      }),
    ];

    return () => cleanup.forEach(fn => typeof fn === 'function' && fn());
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChat = async () => {
    try {
      const [msgs, stats] = await Promise.all([
        api.get(`/messages/dm/${userId}`),
        api.get(`/social/stats/${userId}`),
      ]);
      setMessages(msgs);
      setFriend(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    emit('send_dm', { receiverId: userId, content: input.trim() });
    setInput('');
  };

  if (!userId) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)', gap: 12 }}>
        <div style={{ fontSize: 64 }}>💬</div>
        <p>Select a friend to chat with</p>
        <button onClick={() => navigate('/friends')} className="btn btn-primary">Go to Friends</button>
      </div>
    );
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '48px 16px 12px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <button onClick={() => navigate('/friends')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ position: 'relative' }}>
          <div className="avatar">{friend?.avatar}</div>
          <div className={`status-dot ${friend?.status === 'online' ? 'status-online' : 'status-offline'}`}
            style={{ position: 'absolute', bottom: 0, right: 0 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{friend?.username}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {friend?.status === 'online' ? 'Online now' : 'Offline'}
          </div>
        </div>
        <button
          onClick={() => navigate('/lobby')}
          style={{ background: 'rgba(124,58,237,0.2)', border: 'none', borderRadius: 10, padding: '8px 12px', color: 'var(--purple-light)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
        >
          🎮 Play
        </button>
      </div>

      {/* Messages */}
      <div className="scroll-y flex-1" style={{ padding: '16px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
            <p>Say hi to {friend?.username}!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.senderId === user?.id;
          const showAvatar = i === 0 || messages[i - 1]?.senderId !== msg.senderId;

          return (
            <div key={msg.id || i} style={{
              display: 'flex',
              flexDirection: isMe ? 'row-reverse' : 'row',
              gap: 8,
              marginBottom: 4,
              alignItems: 'flex-end',
            }}>
              {!isMe && showAvatar ? (
                <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>{friend?.avatar}</div>
              ) : !isMe ? <div style={{ width: 32 }} /> : null}

              <div style={{
                maxWidth: '72%',
                background: isMe ? 'var(--gradient)' : 'var(--bg-card)',
                borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                padding: '10px 14px',
                fontSize: 14,
                lineHeight: 1.4,
              }}>
                {msg.content}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        padding: '12px 16px max(12px, env(safe-area-inset-bottom)) 16px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
      }}>
        <input
          className="input"
          style={{ flex: 1, padding: '12px 16px' }}
          placeholder="Message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: input.trim() ? 'var(--gradient)' : 'rgba(255,255,255,0.08)',
            border: 'none',
            color: 'white',
            fontSize: 20,
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
