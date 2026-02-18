const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

const GAME_CONFIGS = {
  uno: { name: 'UNO', maxPlayers: 4, minPlayers: 2, icon: '🎴' },
  chess: { name: 'Chess', maxPlayers: 2, minPlayers: 2, icon: '♟️' },
  ludo: { name: 'Ludo', maxPlayers: 4, minPlayers: 2, icon: '🎲' },
  trivia: { name: 'Trivia', maxPlayers: 6, minPlayers: 2, icon: '🧠' },
  word: { name: 'Word Battle', maxPlayers: 4, minPlayers: 2, icon: '📝' },
  snake: { name: 'Snake Game', maxPlayers: 1, minPlayers: 1, icon: '🐍' },
  tetris: { name: 'Tetris Battle', maxPlayers: 2, minPlayers: 1, icon: '🧩' },
};

// Get all public rooms
router.get('/', authenticateToken, (req, res) => {
  const { game_type } = req.query;

  let query = `
    SELECT r.*, u.username as host_name, u.avatar as host_avatar
    FROM game_rooms r
    JOIN users u ON r.host_id = u.id
    WHERE r.status = 'waiting' AND r.is_private = 0
  `;
  const params = [];

  if (game_type) {
    query += ' AND r.game_type = ?';
    params.push(game_type);
  }

  query += ' ORDER BY r.created_at DESC LIMIT 50';

  const rooms = db.prepare(query).all(...params);
  res.json(rooms.map(r => ({ ...r, settings: JSON.parse(r.settings || '{}') })));
});

// Create a room
router.post('/', authenticateToken, (req, res) => {
  const { name, game_type, max_players, is_private, password, settings } = req.body;

  if (!name || !game_type) {
    return res.status(400).json({ error: 'Name and game type are required' });
  }

  const gameConfig = GAME_CONFIGS[game_type];
  if (!gameConfig) {
    return res.status(400).json({ error: 'Invalid game type' });
  }

  const maxP = Math.min(max_players || gameConfig.maxPlayers, gameConfig.maxPlayers);
  const roomId = uuidv4();

  db.prepare(`
    INSERT INTO game_rooms (id, name, game_type, host_id, max_players, is_private, password, settings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(roomId, name, game_type, req.user.userId, maxP, is_private ? 1 : 0, password || null, JSON.stringify(settings || {}));

  // Add host to room players
  db.prepare(`
    INSERT INTO room_players (id, room_id, user_id)
    VALUES (?, ?, ?)
  `).run(uuidv4(), roomId, req.user.userId);

  const room = db.prepare('SELECT * FROM game_rooms WHERE id = ?').get(roomId);
  res.json({ ...room, settings: JSON.parse(room.settings) });
});

// Get room details
router.get('/:roomId', authenticateToken, (req, res) => {
  const room = db.prepare(`
    SELECT r.*, u.username as host_name, u.avatar as host_avatar
    FROM game_rooms r
    JOIN users u ON r.host_id = u.id
    WHERE r.id = ?
  `).get(req.params.roomId);

  if (!room) return res.status(404).json({ error: 'Room not found' });

  const players = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.level, rp.joined_at
    FROM room_players rp
    JOIN users u ON rp.user_id = u.id
    WHERE rp.room_id = ?
    ORDER BY rp.joined_at ASC
  `).all(req.params.roomId);

  res.json({ ...room, settings: JSON.parse(room.settings || '{}'), players });
});

// Join a room
router.post('/:roomId/join', authenticateToken, (req, res) => {
  const room = db.prepare('SELECT * FROM game_rooms WHERE id = ?').get(req.params.roomId);

  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status !== 'waiting') return res.status(400).json({ error: 'Game already started' });
  if (room.current_players >= room.max_players) return res.status(400).json({ error: 'Room is full' });

  if (room.is_private && room.password) {
    const { password } = req.body;
    if (password !== room.password) return res.status(403).json({ error: 'Wrong password' });
  }

  const existing = db.prepare('SELECT id FROM room_players WHERE room_id = ? AND user_id = ?').get(req.params.roomId, req.user.userId);
  if (!existing) {
    db.prepare('INSERT INTO room_players (id, room_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), req.params.roomId, req.user.userId);
    db.prepare('UPDATE game_rooms SET current_players = current_players + 1 WHERE id = ?').run(req.params.roomId);
  }

  res.json({ message: 'Joined room', roomId: req.params.roomId });
});

// Leave a room
router.post('/:roomId/leave', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM room_players WHERE room_id = ? AND user_id = ?').run(req.params.roomId, req.user.userId);
  db.prepare('UPDATE game_rooms SET current_players = MAX(0, current_players - 1) WHERE id = ?').run(req.params.roomId);

  const room = db.prepare('SELECT * FROM game_rooms WHERE id = ?').get(req.params.roomId);
  if (room && room.current_players === 0) {
    db.prepare('DELETE FROM game_rooms WHERE id = ?').run(req.params.roomId);
  } else if (room && room.host_id === req.user.userId) {
    const nextPlayer = db.prepare('SELECT user_id FROM room_players WHERE room_id = ? LIMIT 1').get(req.params.roomId);
    if (nextPlayer) {
      db.prepare('UPDATE game_rooms SET host_id = ? WHERE id = ?').run(nextPlayer.user_id, req.params.roomId);
    }
  }

  res.json({ message: 'Left room' });
});

// Get game configs
router.get('/config/games', (req, res) => {
  res.json(GAME_CONFIGS);
});

module.exports = router;
