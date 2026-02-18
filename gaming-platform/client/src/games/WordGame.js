import React, { useState, useEffect } from 'react';
import { useGameStore, useAuthStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const HANGMAN_STAGES = [
  // 0 wrong
  `  +---+
  |   |
      |
      |
      |
      |
=========`,
  // 1
  `  +---+
  |   |
  O   |
      |
      |
      |
=========`,
  // 2
  `  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
  // 3
  `  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
  // 4
  `  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
  // 5
  `  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
  // 6 - dead
  `  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`,
];

export default function WordGame({ roomId }) {
  const { gameState, players } = useGameStore();
  const { user } = useAuthStore();
  const { emit, on } = useSocket();

  const [roundResult, setRoundResult] = useState(null);
  const [wordInput, setWordInput] = useState('');
  const [showWordInput, setShowWordInput] = useState(false);

  const state = gameState;

  useEffect(() => {
    const cleanup = [
      on('word_letter_result', ({ letter, isCorrect, state: newState }) => {
        // State updated via game_state event
      }),
      on('word_round_end', ({ word, winner, scores }) => {
        setRoundResult({ word, winner, scores });
        setTimeout(() => {
          setRoundResult(null);
          setWordInput('');
        }, 3000);
      }),
    ];
    return () => cleanup.forEach(fn => typeof fn === 'function' && fn());
  }, [on]);

  if (!state) return <div className="loading"><div className="spinner" /></div>;

  const guessLetter = (letter) => {
    if (state.guessedLetters?.includes(letter.toLowerCase())) return;
    emit('word_guess_letter', { roomId, letter: letter.toLowerCase() });
  };

  const guessWord = () => {
    if (!wordInput.trim()) return;
    emit('word_guess_word', { roomId, word: wordInput.trim() });
    setWordInput('');
    setShowWordInput(false);
  };

  const maskedWord = state.maskedWord || '';
  const letters = maskedWord.split(' ');
  const wrongGuesses = state.wrongGuesses || 0;
  const maxWrong = state.maxWrongGuesses || 6;
  const guessedLetters = state.guessedLetters || [];

  const healthPercent = ((maxWrong - wrongGuesses) / maxWrong) * 100;
  const healthColor = healthPercent > 60 ? '#10B981' : healthPercent > 30 ? '#F59E0B' : '#EF4444';

  const sortedPlayers = [...players].sort((a, b) => (state.scores?.[b.id] || 0) - (state.scores?.[a.id] || 0));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: '10px', overflow: 'hidden' }}>
      {/* Round & scores */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ background: 'rgba(124,58,237,0.2)', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--purple-light)' }}>
          Round {state.round}/{state.maxRounds}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {sortedPlayers.map((p, i) => (
            <div key={p.id} style={{ textAlign: 'center', padding: '4px 8px', background: p.id === user?.id ? 'rgba(124,58,237,0.15)' : 'var(--bg-card)', borderRadius: 8 }}>
              <div style={{ fontSize: 12 }}>{p.avatar}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? '#F59E0B' : 'white' }}>{state.scores?.[p.id] || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Category: </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple-light)' }}>{state.category?.toUpperCase()}</span>
      </div>

      {/* Hangman visual */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 12,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
      }}>
        <pre style={{
          fontFamily: 'monospace',
          fontSize: 10,
          color: wrongGuesses >= maxWrong ? '#EF4444' : 'var(--text-secondary)',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {HANGMAN_STAGES[Math.min(wrongGuesses, 6)]}
        </pre>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Lives</div>
          <div className="progress-bar">
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${healthPercent}%`,
              background: healthColor,
              transition: 'width 0.3s, background 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: healthColor, marginTop: 4 }}>
            {maxWrong - wrongGuesses}/{maxWrong} remaining
          </div>
        </div>
      </div>

      {/* Word display */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 6,
        flexWrap: 'wrap',
        padding: '8px 0',
        flexShrink: 0,
      }}>
        {letters.map((letter, i) => (
          letter === '_' ? (
            <div key={i} style={{
              width: 28, height: 36,
              borderBottom: '3px solid var(--purple-light)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: 2,
            }} />
          ) : letter === ' ' ? (
            <div key={i} style={{ width: 16 }} />
          ) : (
            <div key={i} style={{
              width: 28, height: 36,
              borderBottom: '3px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: 2,
              fontSize: 22, fontWeight: 800,
              color: '#10B981',
            }}>
              {letter}
            </div>
          )
        ))}
        <div style={{ width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {state.wordLength} letters
        </div>
      </div>

      {/* Guess word button */}
      <div style={{ flexShrink: 0 }}>
        {showWordInput ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1, padding: '10px 12px', fontSize: 14 }}
              placeholder="Type the word..."
              value={wordInput}
              onChange={e => setWordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && guessWord()}
              autoFocus
            />
            <button onClick={guessWord} className="btn btn-success" style={{ padding: '10px 14px', fontSize: 13 }}>Guess!</button>
            <button onClick={() => setShowWordInput(false)} className="btn btn-ghost" style={{ fontSize: 20 }}>×</button>
          </div>
        ) : (
          <button
            onClick={() => setShowWordInput(true)}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10,
              color: '#10B981',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            💡 Guess the whole word
          </button>
        )}
      </div>

      {/* Keyboard */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          justifyContent: 'center',
          padding: '4px 0',
        }}>
          {ALPHABET.map(letter => {
            const isGuessed = guessedLetters.includes(letter.toLowerCase());
            const isCorrect = isGuessed && maskedWord.includes(letter.toLowerCase());
            const isWrong = isGuessed && !maskedWord.includes(letter.toLowerCase());

            return (
              <button
                key={letter}
                onClick={() => guessLetter(letter)}
                disabled={isGuessed}
                style={{
                  width: 34,
                  height: 40,
                  borderRadius: 8,
                  border: 'none',
                  background: isCorrect ? '#10B981' : isWrong ? 'rgba(239,68,68,0.3)' : 'var(--bg-card)',
                  color: isGuessed ? (isCorrect ? 'white' : 'rgba(255,255,255,0.3)') : 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isGuessed ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: !isGuessed ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Round result */}
      {roundResult && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>
          <div style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-secondary)', borderRadius: 20, margin: '0 20px' }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>
              {roundResult.winner === user?.id ? '🎉' : roundResult.winner ? '😔' : '💀'}
            </div>
            <h3 style={{ margin: '0 0 8px' }}>
              {roundResult.winner === user?.id ? 'You got it!' : roundResult.winner ? `${players.find(p => p.id === roundResult.winner)?.username} wins the round!` : 'Nobody got it!'}
            </h3>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981', marginTop: 8 }}>
              The word was: <span style={{ color: '#F59E0B' }}>{roundResult.word}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
