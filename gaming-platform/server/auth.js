const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gaming-platform-secret-2024';

const AVATARS = ['🦊', '🐯', '🦁', '🐺', '🦅', '🐉', '🦋', '🌟', '⚡', '🔥', '🌊', '🎭', '🎪', '🚀', '💎', '🏆'];

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

    db.prepare(`
      INSERT INTO users (id, username, email, password, avatar)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, username, email, hashedPassword, randomAvatar);

    // Welcome notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, 'welcome', 'Welcome to GameZone!', 'Start playing games and make new friends!');

    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });
    const user = db.prepare('SELECT id, username, email, avatar, level, xp, coins, gems, wins, losses, total_games FROM users WHERE id = ?').get(userId);

    res.json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last seen & status
    db.prepare('UPDATE users SET last_seen = CURRENT_TIMESTAMP, status = ? WHERE id = ?').run('online', user.id);

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get profile
router.get('/profile', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, avatar, level, xp, coins, gems, wins, losses, total_games, created_at, status FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Update profile
router.put('/profile', authenticateToken, (req, res) => {
  const { avatar } = req.body;
  if (avatar) {
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.user.userId);
  }
  const user = db.prepare('SELECT id, username, avatar, level, xp, coins, gems, wins, losses, total_games FROM users WHERE id = ?').get(req.user.userId);
  res.json(user);
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

module.exports = { router, authenticateToken };
