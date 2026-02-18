import React, { useState, useEffect } from 'react';
import { useGameStore, useAuthStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

const COLOR_MAP = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  wild: '#8B5CF6',
};

const COLOR_BG = {
  red: 'rgba(239,68,68,0.15)',
  blue: 'rgba(59,130,246,0.15)',
  green: 'rgba(16,185,129,0.15)',
  yellow: 'rgba(245,158,11,0.15)',
  wild: 'rgba(139,92,246,0.15)',
};

function UNOCard({ card, onClick, selected, playable, small }) {
  const size = small ? { width: 36, height: 52, fontSize: 11 } : { width: 56, height: 80, fontSize: 13 };
  const color = COLOR_MAP[card.color] || '#8B5CF6';
  const bgColor = COLOR_BG[card.color] || 'rgba(139,92,246,0.15)';

  const valueLabel = {
    skip: '⊘', reverse: '↺', draw2: '+2', wild: '★', wild_draw4: '+4',
  }[card.value] || card.value;

  return (
    <div
      onClick={onClick}
      style={{
        ...size,
        borderRadius: 8,
        background: bgColor,
        border: `2px solid ${selected ? 'white' : playable ? color : 'rgba(255,255,255,0.15)'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: playable ? 'pointer' : 'default',
        transform: selected ? 'translateY(-12px) scale(1.05)' : 'none',
        transition: 'all 0.2s',
        opacity: playable ? 1 : 0.4,
        position: 'relative',
        flexShrink: 0,
        boxShadow: selected ? `0 8px 20px ${color}60` : 'none',
      }}
    >
      <span style={{ color, fontWeight: 900, fontSize: size.fontSize * 1.3 }}>{valueLabel}</span>
      <div style={{
        position: 'absolute', bottom: 2, right: 3,
        width: 10, height: 10, borderRadius: '50%',
        background: card.color === 'wild' ? 'linear-gradient(135deg, #EF4444, #3B82F6, #10B981, #F59E0B)' : color,
      }} />
    </div>
  );
}

function ColorPicker({ onSelect }) {
  const colors = ['red', 'blue', 'green', 'yellow'];
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: 20 }}>Choose Color</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {colors.map(color => (
            <button
              key={color}
              onClick={() => onSelect(color)}
              style={{
                padding: '24px',
                borderRadius: 14,
                border: 'none',
                background: COLOR_MAP[color],
                cursor: 'pointer',
                fontSize: 24,
                fontWeight: 800,
                color: 'white',
                textTransform: 'capitalize',
                boxShadow: `0 4px 20px ${COLOR_MAP[color]}60`,
                transition: 'transform 0.2s',
              }}
            >
              {color === 'red' ? '🔴' : color === 'blue' ? '🔵' : color === 'green' ? '🟢' : '🟡'}
              <div style={{ fontSize: 13, marginTop: 4 }}>{color}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UNOGame({ roomId }) {
  const { gameState, players } = useGameStore();
  const { user } = useAuthStore();
  const { emit, on, off } = useSocket();
  const [selectedCard, setSelectedCard] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const state = gameState;
  if (!state) return <div className="loading"><div className="spinner" /></div>;

  const myHand = Array.isArray(state.playerHands?.[user?.id]) ? state.playerHands[user?.id] : [];
  const isMyTurn = state.currentPlayer === user?.id;
  const topCard = state.topCard;
  const currentColor = state.currentColor;

  const canPlay = (card) => {
    if (!isMyTurn) return false;
    if (state.drawCount > 0) return card.value === 'draw2' || card.value === 'wild_draw4';
    if (card.color === 'wild') return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard?.value) return true;
    return false;
  };

  const handleCardClick = (card) => {
    if (!canPlay(card)) return;
    if (selectedCard?.id === card.id) {
      // Double-tap to play
      if (card.color === 'wild' || card.value === 'wild_draw4') {
        setShowColorPicker(true);
      } else {
        emit('uno_play_card', { roomId, cardId: card.id });
        setSelectedCard(null);
      }
    } else {
      setSelectedCard(card);
    }
  };

  const handleColorSelect = (color) => {
    if (selectedCard) {
      emit('uno_play_card', { roomId, cardId: selectedCard.id, chosenColor: color });
      setSelectedCard(null);
      setShowColorPicker(false);
    }
  };

  const handleDraw = () => {
    if (!isMyTurn) return;
    emit('uno_draw_card', { roomId });
    setSelectedCard(null);
  };

  const opponentHands = players.filter(p => p.id !== user?.id).map(p => ({
    player: p,
    cardCount: typeof state.playerHands?.[p.id] === 'number' ? state.playerHands[p.id] : state.playerHands?.[p.id]?.length || 0,
    isCurrentPlayer: state.currentPlayer === p.id,
  }));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '8px', gap: '8px', overflow: 'hidden' }}>
      {/* Opponents */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexShrink: 0 }}>
        {opponentHands.map(({ player, cardCount, isCurrentPlayer }) => (
          <div key={player.id} style={{
            background: isCurrentPlayer ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
            border: `1px solid ${isCurrentPlayer ? 'var(--purple)' : 'var(--border)'}`,
            borderRadius: 12,
            padding: '8px 12px',
            textAlign: 'center',
            minWidth: 70,
            transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: 18 }}>{player.avatar}</div>
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{player.username.slice(0, 8)}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: isCurrentPlayer ? 'var(--purple-light)' : 'var(--text-secondary)' }}>
              🎴 {cardCount}
            </div>
            {cardCount === 1 && <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 800 }}>UNO!</div>}
          </div>
        ))}
      </div>

      {/* Center - Top card & game info */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}>
        {/* Current color indicator */}
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: COLOR_MAP[currentColor] || '#8B5CF6',
          boxShadow: `0 0 20px ${COLOR_MAP[currentColor] || '#8B5CF6'}`,
        }} />

        {/* Draw pile & discard */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {/* Draw pile */}
          <div
            onClick={handleDraw}
            style={{
              width: 56, height: 80, borderRadius: 8,
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isMyTurn ? 'pointer' : 'default',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: isMyTurn ? '0 4px 20px rgba(124,58,237,0.5)' : 'none',
              transition: 'all 0.2s',
              fontSize: 24,
            }}
          >
            🎴
          </div>

          {/* Top card */}
          {topCard && (
            <UNOCard card={topCard} playable={false} />
          )}
        </div>

        {/* Status */}
        <div style={{
          padding: '8px 16px',
          background: isMyTurn ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
          borderRadius: 99,
          fontSize: 13,
          fontWeight: 600,
          color: isMyTurn ? 'var(--purple-light)' : 'var(--text-secondary)',
          border: `1px solid ${isMyTurn ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
        }}>
          {isMyTurn ? '🎯 Your Turn!' : `⏳ ${players.find(p => p.id === state.currentPlayer)?.username || '...'}'s turn`}
          {state.drawCount > 0 && ` • Draw ${state.drawCount}!`}
        </div>

        {/* Direction */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {state.direction === 1 ? '⟳ Clockwise' : '⟲ Counter-clockwise'}
        </div>
      </div>

      {/* My hand */}
      <div style={{ flexShrink: 0 }}>
        {myHand.length === 1 && (
          <div style={{ textAlign: 'center', color: '#EF4444', fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
            UNO! 🔥
          </div>
        )}
        <div style={{
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          padding: '12px 8px',
          justifyContent: myHand.length <= 5 ? 'center' : 'flex-start',
        }}>
          {myHand.map((card, i) => (
            <UNOCard
              key={card.id}
              card={card}
              onClick={() => handleCardClick(card)}
              selected={selectedCard?.id === card.id}
              playable={canPlay(card)}
            />
          ))}
        </div>
        {selectedCard && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>
            Tap again to play
          </div>
        )}
      </div>

      {showColorPicker && <ColorPicker onSelect={handleColorSelect} />}
    </div>
  );
}
