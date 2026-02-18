const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Search users
router.get('/search', authenticateToken, (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const users = db.prepare(`
    SELECT id, username, avatar, level, wins, status
    FROM users
    WHERE username LIKE ? AND id != ?
    LIMIT 20
  `).all(`%${q}%`, req.user.userId);

  res.json(users);
});

// Get friends list
router.get('/friends', authenticateToken, (req, res) => {
  const friends = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.level, u.wins, u.status, u.last_seen,
           f.status as friendship_status, f.id as friendship_id
    FROM friendships f
    JOIN users u ON (
      CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END = u.id
    )
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
    ORDER BY u.status DESC, u.username ASC
  `).all(req.user.userId, req.user.userId, req.user.userId);

  res.json(friends);
});

// Get friend requests
router.get('/friend-requests', authenticateToken, (req, res) => {
  const requests = db.prepare(`
    SELECT f.id, f.created_at, u.id as user_id, u.username, u.avatar, u.level
    FROM friendships f
    JOIN users u ON f.user_id = u.id
    WHERE f.friend_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(req.user.userId);

  res.json(requests);
});

// Send friend request
router.post('/friends/request/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.userId) {
    return res.status(400).json({ error: 'Cannot add yourself' });
  }

  const existing = db.prepare(`
    SELECT id FROM friendships
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).get(req.user.userId, userId, userId, req.user.userId);

  if (existing) {
    return res.status(400).json({ error: 'Friend request already exists' });
  }

  const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const friendshipId = uuidv4();
  db.prepare(`
    INSERT INTO friendships (id, user_id, friend_id, status)
    VALUES (?, ?, ?, 'pending')
  `).run(friendshipId, req.user.userId, userId);

  // Notification for target user
  const sender = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.userId);
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), userId, 'friend_request', 'Friend Request', `${sender.username} sent you a friend request!`, JSON.stringify({ friendshipId, userId: req.user.userId }));

  res.json({ message: 'Friend request sent', friendshipId });
});

// Accept/Reject friend request
router.put('/friends/:friendshipId', authenticateToken, (req, res) => {
  const { friendshipId } = req.params;
  const { action } = req.body; // 'accept' or 'reject'

  const friendship = db.prepare('SELECT * FROM friendships WHERE id = ? AND friend_id = ?').get(friendshipId, req.user.userId);

  if (!friendship) return res.status(404).json({ error: 'Friend request not found' });

  if (action === 'accept') {
    db.prepare('UPDATE friendships SET status = ? WHERE id = ?').run('accepted', friendshipId);

    const requester = db.prepare('SELECT username FROM users WHERE id = ?').get(friendship.user_id);
    const accepter = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.userId);

    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), friendship.user_id, 'friend_accepted', 'Friend Request Accepted', `${accepter.username} accepted your friend request!`);

    res.json({ message: 'Friend request accepted' });
  } else {
    db.prepare('DELETE FROM friendships WHERE id = ?').run(friendshipId);
    res.json({ message: 'Friend request rejected' });
  }
});

// Remove friend
router.delete('/friends/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;

  db.prepare(`
    DELETE FROM friendships
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
    AND status = 'accepted'
  `).run(req.user.userId, userId, userId, req.user.userId);

  res.json({ message: 'Friend removed' });
});

// Get notifications
router.get('/notifications', authenticateToken, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.userId);

  res.json(notifications);
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.userId);
  res.json({ message: 'Marked as read' });
});

// Mark all notifications as read
router.put('/notifications/read-all', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.userId);
  res.json({ message: 'All marked as read' });
});

// Get leaderboard
router.get('/leaderboard', authenticateToken, (req, res) => {
  const { game_type = 'overall', limit = 50 } = req.query;

  let users;
  if (game_type === 'overall') {
    users = db.prepare(`
      SELECT u.id, u.username, u.avatar, u.level, u.wins, u.xp, u.coins,
             ROW_NUMBER() OVER (ORDER BY u.xp DESC) as rank
      FROM users u
      ORDER BY u.xp DESC
      LIMIT ?
    `).all(parseInt(limit));
  } else {
    users = db.prepare(`
      SELECT u.id, u.username, u.avatar, u.level, l.wins, l.score,
             ROW_NUMBER() OVER (ORDER BY l.score DESC) as rank
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
      WHERE l.game_type = ?
      ORDER BY l.score DESC
      LIMIT ?
    `).all(game_type, parseInt(limit));
  }

  res.json(users);
});

// Get user achievements
router.get('/achievements/:userId', authenticateToken, (req, res) => {
  const achievements = db.prepare(`
    SELECT * FROM achievements WHERE user_id = ?
    ORDER BY earned_at DESC
  `).all(req.params.userId);

  res.json(achievements);
});

// Get user stats
router.get('/stats/:userId', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.level, u.xp, u.wins, u.losses, u.total_games, u.coins, u.gems, u.status, u.last_seen,
           (SELECT COUNT(*) FROM friendships WHERE (user_id = u.id OR friend_id = u.id) AND status = 'accepted') as friend_count
    FROM users u WHERE u.id = ?
  `).get(req.params.userId);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const gameStats = db.prepare(`
    SELECT game_type, COUNT(*) as total, SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins
    FROM game_history
    WHERE players LIKE ?
    GROUP BY game_type
  `).all(req.params.userId, `%${req.params.userId}%`);

  res.json({ ...user, gameStats });
});

module.exports = router;
