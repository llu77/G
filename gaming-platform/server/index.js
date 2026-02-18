const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { router: authRouter } = require('./auth');
const socialRouter = require('./routes/social');
const roomsRouter = require('./routes/rooms');
const { setupSocketHandlers } = require('./socketHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static files
app.use('/client', express.static(path.join(__dirname, '../client/build')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/social', socialRouter);
app.use('/api/rooms', roomsRouter);

// Messages API
const db = require('./database');
const { authenticateToken } = require('./auth');

app.get('/api/messages/:roomId', authenticateToken, (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.room_id = ?
    ORDER BY m.created_at ASC
    LIMIT 100
  `).all(req.params.roomId);

  res.json(messages);
});

app.get('/api/messages/dm/:userId', authenticateToken, (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.type = 'dm' AND (
      (m.sender_id = ? AND m.receiver_id = ?) OR
      (m.sender_id = ? AND m.receiver_id = ?)
    )
    ORDER BY m.created_at ASC
    LIMIT 100
  `).all(req.user.userId, req.params.userId, req.params.userId, req.user.userId);

  res.json(messages);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Setup Socket.io
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════╗
  ║     🎮 GameZone Server v1.0       ║
  ║   Running on port ${PORT}            ║
  ╚═══════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
