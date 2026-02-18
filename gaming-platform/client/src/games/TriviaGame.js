import React, { useState, useEffect, useRef } from 'react';
import { useGameStore, useAuthStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

export default function TriviaGame({ roomId }) {
  const { gameState, players } = useGameStore();
  const { user } = useAuthStore();
  const { emit, on } = useSocket();

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  const state = gameState;

  useEffect(() => {
    const cleanup = [
      on('trivia_round_end', ({ roundAnswers, scores }) => {
        setRoundResult({ roundAnswers, scores });
        setSelectedAnswer(null);
        setTimeout(() => setRoundResult(null), 3000);
      }),
      on('trivia_time_up', ({ scores }) => {
        setSelectedAnswer(null);
        setRoundResult(null);
      }),
    ];

    return () => cleanup.forEach(fn => typeof fn === 'function' && fn());
  }, [on]);

  // Timer
  useEffect(() => {
    if (!state?.questionStartTime || !state?.timePerQuestion) return;

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - state.questionStartTime) / 1000;
      const remaining = Math.max(0, state.timePerQuestion - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) clearInterval(timerRef.current);
    }, 200);

    return () => clearInterval(timerRef.current);
  }, [state?.questionStartTime, state?.timePerQuestion]);

  if (!state?.currentQuestion) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const submitAnswer = (index) => {
    if (state.hasAnswered || selectedAnswer !== null) return;
    setSelectedAnswer(index);
    emit('trivia_answer', { roomId, questionIndex: state.currentQuestionIndex, answerIndex: index });
  };

  const timerPercent = timeLeft !== null ? (timeLeft / state.timePerQuestion) * 100 : 100;
  const timerColor = timerPercent > 50 ? '#10B981' : timerPercent > 25 ? '#F59E0B' : '#EF4444';

  const sortedPlayers = [...players].sort((a, b) => (state.scores?.[b.id] || 0) - (state.scores?.[a.id] || 0));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: '12px', overflow: 'hidden' }}>
      {/* Scores */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {sortedPlayers.map((player, rank) => (
          <div key={player.id} style={{
            flex: 1,
            padding: '8px',
            background: player.id === user?.id ? 'rgba(124,58,237,0.15)' : 'var(--bg-card)',
            borderRadius: 10,
            textAlign: 'center',
            border: player.id === user?.id ? '1px solid rgba(124,58,237,0.4)' : '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 16 }}>{player.avatar}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              {player.username.slice(0, 8)}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: rank === 0 ? '#F59E0B' : 'var(--text-primary)' }}>
              {state.scores?.[player.id] || 0}
            </div>
            {state.answeredCount > 0 && state.hasAnswered && player.id !== user?.id && (
              <div style={{ fontSize: 12 }}>
                {state.roundAnswers?.[player.id] !== undefined ? '✅' : '⏳'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress & Timer */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Question {state.currentQuestionIndex + 1}/{state.totalQuestions}</span>
          <span style={{ color: timerColor, fontWeight: 700 }}>⏱ {timeLeft}s</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{
            width: `${((state.currentQuestionIndex) / state.totalQuestions) * 100}%`,
          }} />
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${timerPercent}%`,
            background: timerColor,
            borderRadius: 2,
            transition: 'width 0.2s, background 0.2s',
          }} />
        </div>
      </div>

      {/* Question */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 14,
        padding: '16px',
        border: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            padding: '3px 10px',
            background: 'rgba(124,58,237,0.2)',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--purple-light)',
          }}>
            {state.currentQuestion.category}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {state.currentQuestion.difficulty}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>
          {state.currentQuestion.question}
        </p>
      </div>

      {/* Answers */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        {state.currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isAnswered = state.hasAnswered;

          let bg = 'var(--bg-card)';
          let border = 'var(--border)';
          let color = 'var(--text-primary)';

          if (isSelected) {
            bg = 'rgba(124,58,237,0.2)';
            border = 'var(--purple)';
            color = 'var(--purple-light)';
          }

          if (roundResult) {
            // Show correct answer
            // We don't know the correct answer from the state (server keeps it)
            // Just show who answered what
          }

          return (
            <button
              key={index}
              onClick={() => submitAnswer(index)}
              disabled={isAnswered}
              style={{
                padding: '14px 16px',
                background: bg,
                border: `2px solid ${border}`,
                borderRadius: 12,
                color,
                fontSize: 14,
                fontWeight: 600,
                cursor: isAnswered ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: isSelected ? 'var(--purple)' : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                color: isSelected ? 'white' : 'var(--text-muted)',
              }}>
                {['A', 'B', 'C', 'D'][index]}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {/* Waiting indicator */}
      {state.hasAnswered && !roundResult && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, flexShrink: 0 }}>
          ⏳ Waiting for others... ({state.answeredCount}/{players.length})
        </div>
      )}

      {/* Round result overlay */}
      {roundResult && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          zIndex: 10,
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 16,
            padding: '24px',
            textAlign: 'center',
            margin: '0 20px',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
            <h3 style={{ margin: '0 0 16px' }}>Round Results</h3>
            {Object.entries(roundResult.scores).map(([pid, score]) => {
              const player = players.find(p => p.id === pid);
              return (
                <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>{player?.avatar} {player?.username}</span>
                  <span style={{ fontWeight: 700, color: 'var(--yellow)' }}>{score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
