import React, { useState } from 'react';
import { useAuthStore } from '../store/gameStore';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.username, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      height: '100dvh',
      background: 'linear-gradient(180deg, #0F0F1A 0%, #1A0A2E 50%, #0F0F1A 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      overflow: 'auto',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          fontSize: 80,
          marginBottom: 8,
          filter: 'drop-shadow(0 0 30px rgba(124,58,237,0.6))',
          animation: 'bounce 2s infinite',
        }}>🎮</div>
        <h1 className="gradient-text" style={{ fontSize: 42, fontWeight: 900, margin: 0, letterSpacing: 2 }}>
          GAMEZONE
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0', fontSize: 14 }}>
          Play • Compete • Win
        </p>
      </div>

      {/* Mode Toggle */}
      <div style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        width: '100%',
        maxWidth: 380,
      }}>
        {['login', 'register'].map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 10,
              border: 'none',
              background: mode === m ? 'var(--gradient)' : 'transparent',
              color: mode === m ? 'white' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {m === 'login' ? '🔑 Login' : '✨ Register'}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input"
            type="text"
            placeholder="👤 Username"
            value={form.username}
            onChange={e => update('username', e.target.value)}
            required
            autoComplete="username"
          />

          {mode === 'register' && (
            <input
              className="input"
              type="email"
              placeholder="📧 Email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              required
            />
          )}

          <input
            className="input"
            type="password"
            placeholder="🔒 Password"
            value={form.password}
            onChange={e => update('password', e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#EF4444',
              fontSize: 14,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : mode === 'login' ? '🚀 Enter Game' : '🎯 Start Adventure'}
          </button>
        </div>
      </form>

      {/* Demo */}
      <button
        onClick={() => {
          setMode('login');
          setForm({ username: 'demo', email: '', password: 'demo123' });
        }}
        style={{
          marginTop: 16,
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 13,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Use demo account
      </button>

      {/* Features */}
      <div style={{
        marginTop: 40,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        width: '100%',
        maxWidth: 380,
      }}>
        {[
          { icon: '🎴', label: 'UNO' },
          { icon: '♟️', label: 'Chess' },
          { icon: '🎲', label: 'Ludo' },
          { icon: '🧠', label: 'Trivia' },
          { icon: '📝', label: 'Word Battle' },
          { icon: '👥', label: 'Multiplayer' },
        ].map(f => (
          <div key={f.label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 8px',
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{f.icon}</div>
            {f.label}
          </div>
        ))}
      </div>
    </div>
  );
}
