import React, { useState, useEffect } from 'react';
import { useGameStore, useAuthStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

const PIECE_UNICODE = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const PIECE_COLOR = { K: '#F1F5F9', Q: '#F1F5F9', R: '#F1F5F9', B: '#F1F5F9', N: '#F1F5F9', P: '#F1F5F9' };

export default function ChessGame({ roomId }) {
  const { gameState, players } = useGameStore();
  const { user } = useAuthStore();
  const { emit, on, off } = useSocket();

  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);

  const state = gameState;
  if (!state?.board) return <div className="loading"><div className="spinner" /></div>;

  const myColor = state.playerColors?.[user?.id];
  const isMyTurn = state.currentPlayer === user?.id;
  const isFlipped = myColor === 'black';

  useEffect(() => {
    const cleanup = on('chess_moves', ({ moves, row, col }) => {
      setPossibleMoves(moves || []);
    });
    return () => typeof cleanup === 'function' && cleanup();
  }, [on]);

  const handleSquareClick = (row, col) => {
    if (!isMyTurn) return;

    const piece = state.board[row][col];
    const isMyPiece = piece && (
      (myColor === 'white' && piece === piece.toUpperCase()) ||
      (myColor === 'black' && piece === piece.toLowerCase())
    );

    if (selectedSquare) {
      const [selRow, selCol] = selectedSquare;

      // Check if clicking a possible move
      const isPossibleMove = possibleMoves.some(([r, c]) => r === row && c === col);

      if (isPossibleMove) {
        emit('chess_move', {
          roomId,
          from: { row: selRow, col: selCol },
          to: { row, col },
        });
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      if (isMyPiece) {
        setSelectedSquare([row, col]);
        emit('chess_get_moves', { roomId, row, col });
        return;
      }

      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    if (isMyPiece) {
      setSelectedSquare([row, col]);
      emit('chess_get_moves', { roomId, row, col });
    }
  };

  const renderBoard = () => {
    const rows = isFlipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
    const cols = isFlipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];

    return (
      <div style={{
        display: 'grid',
        gridTemplateRows: 'repeat(8, 1fr)',
        aspectRatio: '1',
        width: '100%',
        maxWidth: 380,
        border: '2px solid rgba(124,58,237,0.5)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {rows.map(row => (
          <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)' }}>
            {cols.map(col => {
              const isLight = (row + col) % 2 === 0;
              const isSelected = selectedSquare?.[0] === row && selectedSquare?.[1] === col;
              const isPossible = possibleMoves.some(([r, c]) => r === row && c === col);
              const piece = state.board[row][col];
              const isWhitePiece = piece && piece === piece.toUpperCase();

              let bg = isLight ? '#F0D9B5' : '#B58863';
              if (isSelected) bg = '#F6F669';
              if (isPossible) bg = isLight ? '#CDD16E' : '#AAA23A';

              return (
                <div
                  key={col}
                  onClick={() => handleSquareClick(row, col)}
                  style={{
                    aspectRatio: '1',
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isMyTurn ? 'pointer' : 'default',
                    position: 'relative',
                  }}
                >
                  {isPossible && !piece && (
                    <div style={{
                      width: '30%', height: '30%', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.3)',
                    }} />
                  )}
                  {piece && (
                    <span style={{
                      fontSize: 'clamp(16px, 5vw, 28px)',
                      lineHeight: 1,
                      color: isWhitePiece ? '#FFF' : '#000',
                      textShadow: isWhitePiece ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 3px rgba(255,255,255,0.3)',
                      userSelect: 'none',
                    }}>
                      {PIECE_UNICODE[piece]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const opponent = players.find(p => p.id !== user?.id);
  const captured = state.capturedPieces || { white: [], black: [] };
  const myCaptured = myColor === 'white' ? captured.white : captured.black;
  const oppCaptured = myColor === 'white' ? captured.black : captured.white;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '8px', gap: '8px', overflow: 'hidden' }}>
      {/* Opponent info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: state.currentPlayer !== user?.id ? 'rgba(124,58,237,0.15)' : 'var(--bg-card)',
        borderRadius: 10,
        border: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div className="avatar avatar-sm">{opponent?.avatar}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{opponent?.username || 'Opponent'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {myColor === 'white' ? '⬛ Black' : '⬜ White'}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {oppCaptured.map(p => PIECE_UNICODE[p]).join('')}
        </div>
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderBoard()}
      </div>

      {/* My info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: isMyTurn ? 'rgba(124,58,237,0.15)' : 'var(--bg-card)',
        borderRadius: 10,
        border: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div className="avatar avatar-sm">{user?.avatar}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.username} (You)</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {myColor === 'white' ? '⬜ White' : '⬛ Black'}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {myCaptured.map(p => PIECE_UNICODE[p]).join('')}
        </div>
        {isMyTurn && (
          <span style={{ fontSize: 12, color: 'var(--purple-light)', fontWeight: 700 }}>Your turn</span>
        )}
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
        Moves: {state.moveCount || 0}
      </div>
    </div>
  );
}
