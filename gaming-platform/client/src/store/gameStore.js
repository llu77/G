import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = '/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (username, password) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        set({ user: data.user, token: data.token, isAuthenticated: true });
        return data;
      },

      register: async (username, email, password) => {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        set({ user: data.user, token: data.token, isAuthenticated: true });
        return data;
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false }),

      updateUser: (updates) => set(state => ({ user: { ...state.user, ...updates } })),

      refreshProfile: async () => {
        const { token } = get();
        if (!token) return;
        const res = await fetch(`${API_BASE}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          set({ user });
        }
      },
    }),
    { name: 'auth-store', partialize: state => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }) }
  )
);

export const useGameStore = create((set, get) => ({
  currentRoom: null,
  gameState: null,
  players: [],
  messages: [],
  notifications: [],
  friends: [],
  friendRequests: [],
  rooms: [],
  leaderboard: [],
  isConnected: false,

  setSocket: (socket) => set({ socket }),
  setConnected: (isConnected) => set({ isConnected }),

  setCurrentRoom: (room) => set({ currentRoom: room }),
  setGameState: (gameState) => set({ gameState }),
  setPlayers: (players) => set({ players }),

  addMessage: (msg) => set(state => ({ messages: [...state.messages.slice(-100), msg] })),
  clearMessages: () => set({ messages: [] }),

  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notif) => set(state => ({ notifications: [notif, ...state.notifications] })),
  markNotificationRead: (id) => set(state => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n)
  })),

  setFriends: (friends) => set({ friends }),
  setFriendRequests: (friendRequests) => set({ friendRequests }),
  setRooms: (rooms) => set({ rooms }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),

  updateFriendStatus: (userId, status) => set(state => ({
    friends: state.friends.map(f => f.id === userId ? { ...f, status } : f)
  })),

  leaveGame: () => set({ currentRoom: null, gameState: null, players: [], messages: [] }),
}));
