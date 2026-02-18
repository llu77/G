import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useGameStore } from '../store/gameStore';

let socketInstance = null;

export function useSocket() {
  const { token, isAuthenticated } = useAuthStore();
  const {
    setConnected, addMessage, setGameState, setPlayers,
    addNotification, updateFriendStatus, setCurrentRoom,
  } = useGameStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance = socket;
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room_joined', ({ room, players }) => {
      setCurrentRoom(room);
      setPlayers(players);
    });

    socket.on('player_joined', ({ user, playerCount }) => {
      setPlayers(prev => {
        const exists = prev.some(p => p.id === user.id);
        return exists ? prev : [...prev, user];
      });
      addMessage({ system: true, content: `${user.username} joined the room`, type: 'system' });
    });

    socket.on('player_left', ({ userId, username }) => {
      setPlayers(prev => prev.filter(p => p.id !== userId));
      addMessage({ system: true, content: `${username} left the room`, type: 'system' });
    });

    socket.on('new_message', (msg) => addMessage(msg));
    socket.on('new_dm', (msg) => addMessage(msg));

    socket.on('game_started', ({ gameType, state }) => {
      setGameState({ ...state, started: true });
    });

    socket.on('game_state', (state) => setGameState(state));

    socket.on('game_ended', ({ winner, scores, rewards }) => {
      setGameState(prev => ({ ...prev, status: 'finished', winner, scores, rewards, ended: true }));
    });

    socket.on('game_error', ({ message }) => {
      console.error('Game error:', message);
    });

    socket.on('friend_online', ({ userId, username }) => updateFriendStatus(userId, 'online'));
    socket.on('friend_offline', ({ userId }) => updateFriendStatus(userId, 'offline'));

    socket.on('room_invitation', ({ roomId, roomName, gameType, from }) => {
      addNotification({
        id: Date.now(),
        type: 'room_invite',
        title: 'Game Invitation',
        message: `${from.username} invited you to play ${gameType}!`,
        data: { roomId, from },
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    });

    socket.on('user_typing', ({ userId, username }) => {
      // Handled per component
    });

    return () => {
      // Don't disconnect on component unmount, keep socket alive
    };
  }, [isAuthenticated, token]);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef.current, emit, on, off };
}

export function getSocket() {
  return socketInstance;
}
