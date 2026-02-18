import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore, useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { useApi } from '../hooks/useApi';

import UNOGame from '../games/UNOGame';
import ChessGame from '../games/ChessGame';
import LudoGame from '../games/LudoGame';
import TriviaGame from '../games/TriviaGame';
import WordGame from '../games/WordGame';

export default function GameRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentRoom, gameState, players, messages, addMessage, setCurrentRoom, setPlayers, setGameState } = useGameStore();
  const { emit, on, off } = useSocket();
  const api = useApi();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [gameResult, setGameResult] = useState(null);
  const [unreadChat, setUnreadChat] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadRoom();
    return () => {
      emit('leave_room', { roomId });
    };
  }, [roomId]);

  useEffect(() => {
    emit('join_room', { roomId });

    const cleanup = [
      on('room_joined', ({ room: r, players: p }) => {
        setRoom(r);
        setPlayers(p);
        setLoading(false);
      }),
      on('player_joined', ({ user: u }) => {
        setPlayers(prev => prev.some(p => p.id === u.id) ? prev : [...prev, u]);
      }),
      on('player_left', ({ userId }) => {
        setPlayers(prev => prev.filter(p => p.id !== userId));
      }),
      on('game_started', ({ gameType, state }) => {
        setGameState({ ...state, started: true });
        setRoom(r => r ? { ...r, status: 'playing' } : r);
      }),
      on('game_state', (state) => {
        setGameState(state);
      }),
      on('game_ended', ({ winner, scores, rewards }) => {
        setGameResult({ winner, scores, rewards });
        setGameState(prev => ({ ...prev, status: 'finished', winner }));
      }),
      on('new_message', (msg) => {
        addMessage(msg);
        if (!chatOpen) setUnreadChat(n => n + 1);
      }),
    ];

    return () => cleanup.forEach(fn => typeof fn === 'function' && fn());
  }, [roomId, chatOpen]);

  useEffect(() => {
    if (chatOpen) {
      setUnreadChat(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatOpen, messages.length]);

  const loadRoom = async () => {
    try {
      const data = await api.get(`/rooms/${roomId}`);
      setRoom(data);
      setLoading(false);
    } catch (e) {
      navigate('/lobby');
    }
  };

  const startGame = () => emit('start_game', { roomId });

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    emit('send_message', { roomId, content: chatMsg.trim() });
    setChatMsg('');
  };

  const leaveRoom = async () => {
    try {
      await api.post(`/rooms/${roomId}/leave`);
    } catch (e) {}
    navigate('/lobby');
  };

  if (loading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const isHost = room?.host_id === user?.id;
  const isPlaying = room?.status === 'playing' && gameState?.started;
  const GAME_ICONS = { uno: '🎴', chess: '♟️', ludo: '🎲', trivia: '🧠', word: '📝' };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
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
        <button onClick={leaveRoom} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>{GAME_ICONS[room?.game_type]}</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{room?.name}</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {players.length}/{room?.max_players} players
            {room?.status === 'playing' ? ' • Playing' : ' • Waiting'}
          </div>
        </div>
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: 'relative',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 10,
            padding: '8px 12px',
            color: 'white',
            cursor: 'pointer',
            fontSize: 20,
          }}
        >
          💬
          {unreadChat > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#EF4444', color: 'white', borderRadius: '50%',
              width: 16, height: 16, fontSize: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700,
            }}>{unreadChat}</span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isPlaying ? (
          // Game view
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {room?.game_type === 'uno' && <UNOGame roomId={roomId} />}
            {room?.game_type === 'chess' && <ChessGame roomId={roomId} />}
            {room?.game_type === 'ludo' && <LudoGame roomId={roomId} />}
            {room?.game_type === 'trivia' && <TriviaGame roomId={roomId} />}
            {room?.game_type === 'word' && <WordGame roomId={roomId} />}
          </div>
        ) : (
          // Waiting room
          <div className="scroll-y flex-1" style={{ padding: '20px 16px' }}>
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 16,
              padding: '20px',
              textAlign: 'center',
              marginBottom: 16,
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 64, marginBottom: 8, filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.5))' }}>
                {GAME_ICONS[room?.game_type]}
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>{room?.name}</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
                Waiting for players...
              </p>
            </div>

            {/* Players */}
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>
              👥 Players ({players.length}/{room?.max_players})
            </h3>
            {players.map((player, i) => (
              <div key={player.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                background: 'var(--bg-card)',
                borderRadius: 12,
                marginBottom: 8,
                border: player.id === user?.id ? '1px solid rgba(124,58,237,0.4)' : '1px solid var(--border)',
              }}>
                <div style={{ position: 'relative' }}>
                  <div className="avatar">{player.avatar}</div>
                  {player.id === room?.host_id && (
                    <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 14 }}>👑</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{player.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Level {player.level}</div>
                </div>
                {player.id === user?.id && (
                  <span className="badge badge-purple">You</span>
                )}
              </div>
            ))}

            {/* Waiting slots */}
            {Array(Math.max(0, (room?.max_players || 4) - players.length)).fill(null).map((_, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                marginBottom: 8,
                border: '2px dashed rgba(255,255,255,0.1)',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>?</div>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Waiting for player...</span>
              </div>
            ))}

            {/* Start button for host */}
            {isHost && (
              <button
                onClick={startGame}
                disabled={players.length < 2 && room?.game_type !== 'snake' && room?.game_type !== 'tetris'}
                className="btn btn-primary btn-full btn-lg"
                style={{ marginTop: 20 }}
              >
                🚀 Start Game
              </button>
            )}
          </div>
        )}
      </div>

      {/* Game Result Modal */}
      {gameResult && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 80, marginBottom: 16 }}>
              {gameResult.winner === user?.id ? '🏆' : '😔'}
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 28 }}>
              {gameResult.winner === user?.id ? 'You Won!' : 'Game Over!'}
            </h2>
            {gameResult.winner !== user?.id && (
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                {players.find(p => p.id === gameResult.winner)?.username || 'Opponent'} wins!
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--yellow)' }}>+{gameResult.rewards?.xp || 100} XP</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Experience</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--yellow)' }}>+{gameResult.rewards?.coins || 50} 💰</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Coins</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setGameResult(null); loadRoom(); }} className="btn btn-secondary" style={{ flex: 1 }}>
                Play Again
              </button>
              <button onClick={() => navigate('/lobby')} className="btn btn-primary" style={{ flex: 1 }}>
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Drawer */}
      {chatOpen && (
        <div className="modal-overlay" onClick={() => setChatOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>💬 Chat</h3>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            {/* Messages */}
            <div className="scroll-y flex-1" style={{ marginBottom: 12 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  {msg.system ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '4px 0' }}>
                      {msg.content}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: msg.senderId === user?.id ? 'row-reverse' : 'row' }}>
                      <div className="avatar avatar-sm">{msg.senderAvatar}</div>
                      <div style={{ maxWidth: '75%' }}>
                        {msg.senderId !== user?.id && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{msg.senderName}</div>
                        )}
                        <div style={{
                          background: msg.senderId === user?.id ? 'var(--gradient)' : 'var(--bg-card)',
                          borderRadius: msg.senderId === user?.id ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                          padding: '8px 12px',
                          fontSize: 14,
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Type a message..."
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                style={{ flex: 1 }}
              />
              <button onClick={sendChat} className="btn btn-primary" style={{ padding: '12px 16px' }}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
