import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore, useAuthStore } from '../store/gameStore';

const tabs = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/lobby', icon: '🎮', label: 'Play' },
  { path: '/friends', icon: '👥', label: 'Friends' },
  { path: '/leaderboard', icon: '🏆', label: 'Rank' },
  { path: '/profile', icon: '👤', label: 'Profile' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useGameStore(s => s.notifications);
  const friendRequests = useGameStore(s => s.friendRequests);

  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const pendingRequests = friendRequests.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>

      {/* Bottom tab bar */}
      <nav className="tab-bar">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          const badge = tab.path === '/friends' ? pendingRequests : 0;

          return (
            <button
              key={tab.path}
              className={`tab-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              <div style={{ position: 'relative' }}>
                <span>{tab.icon}</span>
                {badge > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    background: '#EF4444', color: 'white',
                    borderRadius: '50%', width: 16, height: 16,
                    fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700,
                  }}>{badge}</span>
                )}
              </div>
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
