import React, { useState, useEffect } from 'react';
import { useGameStore, useAuthStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

const COLORS = {
  red: { bg: '#EF4444', light: 'rgba(239,68,68,0.15)', border: '#DC2626' },
  blue: { bg: '#3B82F6', light: 'rgba(59,130,246,0.15)', border: '#2563EB' },
  green: { bg: '#10B981', light: 'rgba(16,185,129,0.15)', border: '#059669' },
  yellow: { bg: '#F59E0B', light: 'rgba(245,158,11,0.15)', border: '#D97706' },
};

export default function LudoGame({ roomId }) {
  const { gameState, players } = useGameStore();
  const { user } = useAuthStore();
  const { emit, on, off } = useSocket();
  const [diceResult, setDiceResult] = useState(null);
  const [movablePieces, setMovablePieces] = useState([]);
  const [rolling, setRolling] = useState(false);

  const state = gameState;
  if (!state) return <div className="loading"><div className="spinner" /></div>;

  useEffect(() => {
    const cleanup = on('ludo_rolled', ({ dice, movablePieces: mp }) => {
      setDiceResult(dice);
      setMovablePieces(mp || []);
      setRolling(false);
    });
    return () => typeof cleanup === 'function' && cleanup();
  }, [on]);

  const isMyTurn = state.currentPlayer === user?.id;
  const myColor = state.playerColors?.[user?.id];

  const rollDice = () => {
    if (!isMyTurn || state.diceRolled || rolling) return;
    setRolling(true);
    emit('ludo_roll', { roomId });
  };

  const movePiece = (pieceId) => {
    if (!movablePieces.includes(pieceId)) return;
    emit('ludo_move', { roomId, pieceId });
    setMovablePieces([]);
  };

  const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '8px', gap: '8px', overflow: 'hidden' }}>
      {/* Players info */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {players.map(player => {
          const color = state.playerColors?.[player.id];
          const colorInfo = color ? COLORS[color] : null;
          const isCurrentTurn = state.currentPlayer === player.id;
          const pieces = state.pieces?.[color] || [];
          const homeCount = pieces.filter(p => p.isHome).length;

          return (
            <div key={player.id} style={{
              flex: 1,
              padding: '8px',
              borderRadius: 10,
              background: isCurrentTurn ? colorInfo?.light : 'var(--bg-card)',
              border: `2px solid ${isCurrentTurn ? colorInfo?.bg : 'var(--border)'}`,
              textAlign: 'center',
              transition: 'all 0.3s',
            }}>
              <div style={{ fontSize: 16 }}>{player.avatar}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: colorInfo?.bg, marginTop: 2 }}>
                {color?.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                🏠 {homeCount}/4
              </div>
            </div>
          );
        })}
      </div>

      {/* Ludo Board Visual */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 340,
          aspectRatio: '1',
          display: 'grid',
          gridTemplateAreas: `
            "red-base top-track blue-base"
            "left-track center right-track"
            "green-base bottom-track yellow-base"
          `,
          gridTemplateColumns: '2fr 3fr 2fr',
          gridTemplateRows: '2fr 3fr 2fr',
          gap: 2,
          background: '#1A1A2E',
          border: '2px solid rgba(124,58,237,0.3)',
          borderRadius: 12,
          padding: 8,
        }}>
          {/* Red Base (top-left) */}
          <div style={{ gridArea: 'red-base', background: COLORS.red.light, borderRadius: 8, border: `2px solid ${COLORS.red.bg}`, padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {(state.pieces?.red || []).map(piece => (
              <div
                key={piece.id}
                onClick={() => movePiece(piece.id)}
                style={{
                  background: piece.isBase ? COLORS.red.bg : piece.isHome ? '#F59E0B' : 'rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: movablePieces.includes(piece.id) ? 'pointer' : 'default',
                  border: movablePieces.includes(piece.id) ? '2px solid white' : '2px solid transparent',
                  animation: movablePieces.includes(piece.id) ? 'pulse 1s infinite' : 'none',
                  fontSize: 14,
                }}
              >
                {piece.isHome ? '⭐' : '●'}
              </div>
            ))}
          </div>

          {/* Blue Base (top-right) */}
          <div style={{ gridArea: 'blue-base', background: COLORS.blue.light, borderRadius: 8, border: `2px solid ${COLORS.blue.bg}`, padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {(state.pieces?.blue || []).map(piece => (
              <div
                key={piece.id}
                onClick={() => movePiece(piece.id)}
                style={{
                  background: piece.isBase ? COLORS.blue.bg : piece.isHome ? '#F59E0B' : 'rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: movablePieces.includes(piece.id) ? 'pointer' : 'default',
                  border: movablePieces.includes(piece.id) ? '2px solid white' : '2px solid transparent',
                  fontSize: 14,
                }}
              >
                {piece.isHome ? '⭐' : '●'}
              </div>
            ))}
          </div>

          {/* Center */}
          <div style={{ gridArea: 'center', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(59,130,246,0.2), rgba(16,185,129,0.2), rgba(245,158,11,0.2))' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32 }}>🏠</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>HOME</div>
            </div>
          </div>

          {/* Green Base (bottom-left) */}
          <div style={{ gridArea: 'green-base', background: COLORS.green.light, borderRadius: 8, border: `2px solid ${COLORS.green.bg}`, padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {(state.pieces?.green || []).map(piece => (
              <div
                key={piece.id}
                onClick={() => movePiece(piece.id)}
                style={{
                  background: piece.isBase ? COLORS.green.bg : piece.isHome ? '#F59E0B' : 'rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: movablePieces.includes(piece.id) ? 'pointer' : 'default',
                  border: movablePieces.includes(piece.id) ? '2px solid white' : '2px solid transparent',
                  fontSize: 14,
                }}
              >
                {piece.isHome ? '⭐' : '●'}
              </div>
            ))}
          </div>

          {/* Yellow Base (bottom-right) */}
          <div style={{ gridArea: 'yellow-base', background: COLORS.yellow.light, borderRadius: 8, border: `2px solid ${COLORS.yellow.bg}`, padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {(state.pieces?.yellow || []).map(piece => (
              <div
                key={piece.id}
                onClick={() => movePiece(piece.id)}
                style={{
                  background: piece.isBase ? COLORS.yellow.bg : piece.isHome ? '#F59E0B' : 'rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: movablePieces.includes(piece.id) ? 'pointer' : 'default',
                  border: movablePieces.includes(piece.id) ? '2px solid white' : '2px solid transparent',
                  fontSize: 14,
                }}
              >
                {piece.isHome ? '⭐' : '●'}
              </div>
            ))}
          </div>

          {/* Track placeholders */}
          {['top-track', 'bottom-track', 'left-track', 'right-track'].map(area => (
            <div key={area} style={{ gridArea: area, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }} />
          ))}
        </div>
      </div>

      {/* Dice & Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'var(--bg-card)',
        borderRadius: 14,
        flexShrink: 0,
      }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {isMyTurn ? '🎯 Your Turn' : `⏳ ${players.find(p => p.id === state.currentPlayer)?.username}'s turn`}
        </div>

        <button
          onClick={rollDice}
          disabled={!isMyTurn || state.diceRolled || rolling}
          style={{
            fontSize: 48,
            background: 'none',
            border: 'none',
            cursor: isMyTurn && !state.diceRolled ? 'pointer' : 'default',
            opacity: isMyTurn && !state.diceRolled ? 1 : 0.5,
            animation: rolling ? 'spin 0.3s linear infinite' : 'none',
            transition: 'transform 0.1s',
          }}
        >
          {DICE_FACES[diceResult || (rolling ? 1 : 1)]}
        </button>

        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--purple-light)', minWidth: 30, textAlign: 'center' }}>
          {diceResult || '-'}
        </div>
      </div>
    </div>
  );
}
