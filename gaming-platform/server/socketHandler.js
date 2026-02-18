const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'gaming-platform-secret-2024';

// Active games in memory
const activeGames = new Map();
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId

// Game modules
const unoGame = require('./games/uno');
const chessGame = require('./games/chess');
const ludoGame = require('./games/ludo');
const triviaGame = require('./games/trivia');
const wordGame = require('./games/wordBattle');

function setupSocketHandlers(io) {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);

    // Track user socket
    userSockets.set(socket.userId, socket.id);
    socketUsers.set(socket.id, socket.userId);

    // Update user status to online
    db.prepare('UPDATE users SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run('online', socket.userId);

    // Notify friends
    const friends = db.prepare(`
      SELECT u.id FROM users u
      JOIN friendships f ON (f.user_id = u.id OR f.friend_id = u.id)
      WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted' AND u.id != ?
    `).all(socket.userId, socket.userId, socket.userId);

    friends.forEach(friend => {
      const friendSocket = userSockets.get(friend.id);
      if (friendSocket) {
        io.to(friendSocket).emit('friend_online', { userId: socket.userId, username: socket.username });
      }
    });

    // === ROOM EVENTS ===

    socket.on('join_room', async ({ roomId }) => {
      try {
        const room = db.prepare('SELECT * FROM game_rooms WHERE id = ?').get(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        socket.join(roomId);
        socket.currentRoom = roomId;

        const players = db.prepare(`
          SELECT u.id, u.username, u.avatar, u.level
          FROM room_players rp
          JOIN users u ON rp.user_id = u.id
          WHERE rp.room_id = ?
          ORDER BY rp.joined_at ASC
        `).all(roomId);

        // Send room state
        socket.emit('room_joined', { room: { ...room, settings: JSON.parse(room.settings || '{}') }, players });

        // Notify others
        socket.to(roomId).emit('player_joined', {
          user: { id: socket.userId, username: socket.username },
          playerCount: players.length
        });

        // Send existing game state if in progress
        if (activeGames.has(roomId)) {
          const gameData = activeGames.get(roomId);
          socket.emit('game_state', getGameStateForPlayer(gameData, socket.userId));
        }
      } catch (err) {
        console.error('join_room error:', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('leave_room', ({ roomId }) => {
      socket.leave(roomId);
      socket.currentRoom = null;

      const players = db.prepare(`
        SELECT COUNT(*) as count FROM room_players WHERE room_id = ?
      `).get(roomId);

      socket.to(roomId).emit('player_left', {
        userId: socket.userId,
        username: socket.username,
        playerCount: players?.count || 0
      });
    });

    socket.on('start_game', ({ roomId }) => {
      const room = db.prepare('SELECT * FROM game_rooms WHERE id = ?').get(roomId);
      if (!room) return socket.emit('error', { message: 'Room not found' });
      if (room.host_id !== socket.userId) return socket.emit('error', { message: 'Only host can start' });

      const players = db.prepare(`
        SELECT u.id, u.username, u.avatar
        FROM room_players rp
        JOIN users u ON rp.user_id = u.id
        WHERE rp.room_id = ?
        ORDER BY rp.joined_at ASC
      `).all(roomId);

      const settings = JSON.parse(room.settings || '{}');
      let game;

      try {
        switch (room.game_type) {
          case 'uno':
            if (players.length < 2) return socket.emit('error', { message: 'Need at least 2 players' });
            game = { type: 'uno', roomId, state: unoGame.createGame(players), players };
            break;
          case 'chess':
            if (players.length !== 2) return socket.emit('error', { message: 'Chess needs exactly 2 players' });
            game = { type: 'chess', roomId, state: chessGame.createGame(players), players };
            break;
          case 'ludo':
            if (players.length < 2) return socket.emit('error', { message: 'Need at least 2 players' });
            game = { type: 'ludo', roomId, state: ludoGame.createGame(players), players };
            break;
          case 'trivia':
            if (players.length < 1) return socket.emit('error', { message: 'Need at least 1 player' });
            game = { type: 'trivia', roomId, state: triviaGame.createGame(players, settings), players };
            break;
          case 'word':
            if (players.length < 1) return socket.emit('error', { message: 'Need at least 1 player' });
            game = { type: 'word', roomId, state: wordGame.createGame(players, settings), players };
            break;
          default:
            return socket.emit('error', { message: 'Unknown game type' });
        }

        activeGames.set(roomId, game);
        db.prepare('UPDATE game_rooms SET status = ? WHERE id = ?').run('playing', roomId);

        // Send initial game state to all players
        players.forEach(player => {
          const playerSocket = userSockets.get(player.id);
          if (playerSocket) {
            io.to(playerSocket).emit('game_started', {
              gameType: room.game_type,
              state: getGameStateForPlayer(game, player.id)
            });
          }
        });

        // Set up trivia timer
        if (room.game_type === 'trivia') {
          setupTriviaTimer(io, roomId, game);
        }

      } catch (err) {
        console.error('start_game error:', err);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // === GAME EVENTS ===

    // UNO
    socket.on('uno_play_card', ({ roomId, cardId, chosenColor }) => {
      const game = activeGames.get(roomId);
      if (!game || game.type !== 'uno') return;

      const result = unoGame.playCard(game.state, socket.userId, cardId, chosenColor);
      if (result.error) return socket.emit('game_error', { message: result.error });

      game.state = result.game;
      broadcastGameState(io, game, userSockets);

      if (game.state.status === 'finished') {
        handleGameEnd(io, game, userSockets, db);
      }
    });

    socket.on('uno_draw_card', ({ roomId }) => {
      const game = activeGames.get(roomId);
      if (!game || game.type !== 'uno') return;

      const result = unoGame.drawCard(game.state, socket.userId);
      if (result.error) return socket.emit('game_error', { message: result.error });

      game.state = result.game;
      broadcastGameState(io, game, userSockets);
    });

    // Chess
    socket.on('chess_move', ({ roomId, from, to }) => {
      const game = activeGames.get(roomId);
      if (!game || game.type !== 'chess') return;

      const result = chessGame.makeMove(game.state, socket.userId, from, to);
      if (result.error) return socket.emit('game_error', { message: result.error });

      game.state = result.game;
      broadcastGameState(io, game, userSockets);

      if (game.state.status === 'finished') {
        handleGameEnd(io, game, userSockets, db);
      }
    });

    socket.on('chess_get_moves', ({ roomId, row, col }) => {
      const game = activeGames.get(roomId);
      if (!game || game.type !== 'chess') return;

      const color = game.state.playerColors[socket.userId];
      const piece = game.state.board[row][col];
      if (!piece) return socket.emit('chess_moves', { moves: [] });

      const moves = chessGame.getPossibleMoves(game.state.board, row, col, color);
      socket.emit('chess_moves', { moves, row, col });
    });

    // Ludo
    socket.on('ludo_roll', ({ roomId }) => {
      const game = activeGames.get(roomId);
      if (!game || game.type !== 'ludo') return;

      const result = ludoGame.rollDice(game.state, socket.userId);
      if (result.error) return socket.emit('game_error', { message: result.error });

      game.state = result.game;
      broadcastGameState(io, game, userSockets);
      io.to(roomId).emit('ludo_rolled', { dice: result.dice, movablePieces: result.movablePieces });
    });

    socket.on('ludo_move', ({ roomId, pieceId }) => {
      const game = activeGames.get(roomId);
      if (!game || game.type !== 'ludo') return;

      const result = ludoGame.movePiece(game.state, socket.userId, pieceId);
      if (result.error) return socket.emit('game_error', { message: result.error });

      game.state = result.game;
      broadcastGameState(io, game, userSockets);

      if (game.state.status === 'finished') {
        handleGameEnd(io, game, userSockets, db);
      }
    });

    // Trivia
    socket.on('trivia_answer', ({ roomId, questionIndex, answerIndex }) => {
      const game = activeGames.get(roomId);
      if (!game || game.type !== 'trivia') return;

      const result = triviaGame.submitAnswer(game.state, socket.userId, questionIndex, answerIndex);
      if (result.error) return socket.emit('game_error', { message: result.error });

      socket.emit('trivia_answer_result', {
        isCorrect: result.allAnswered ? game.state.answers[socket.userId][game.state.answers[socket.userId].length - 1]?.isCorrect : undefined,
        scores: game.state.scores,
      });

      if (result.allAnswered) {
        io.to(roomId).emit('trivia_round_end', { roundAnswers: result.roundAnswers, scores: game.state.scores });
        setTimeout(() => {
          if (activeGames.has(roomId)) {
            const g = activeGames.get(roomId);
            g.state = triviaGame.nextQuestion(g.state);
            if (g.state.status === 'finished') {
              handleGameEnd(io, g, userSockets, db);
            } else {
              broadcastGameState(io, g, userSockets);
            }
          }
        }, 3000);
      }
    });

    // Word Battle
    socket.on('word_guess_letter', ({ roomId, letter }) => {
      const game = activeGames.get(roomId);
      if (!game || game.type !== 'word') return;

      const result = wordGame.guessLetter(game.state, socket.userId, letter);
      if (result.error) return socket.emit('game_error', { message: result.error });

      game.state = result.game;
      io.to(roomId).emit('word_letter_result', { letter, isCorrect: result.isCorrect, state: wordGame.getGameState(game.state) });

      if (result.isSolved || result.isLost) {
        io.to(roomId).emit('word_round_end', {
          word: game.state.currentWord,
          winner: result.isSolved ? socket.userId : null,
          scores: game.state.scores,
        });

        setTimeout(() => {
          if (activeGames.has(roomId)) {
            const g = activeGames.get(roomId);
            g.state = wordGame.nextRound(g.state);
            if (g.state.status === 'finished') {
              handleGameEnd(io, g, userSockets, db);
            } else {
              broadcastGameState(io, g, userSockets);
            }
          }
        }, 3000);
      }
    });

    socket.on('word_guess_word', ({ roomId, word }) => {
      const game = activeGames.get(roomId);
      if (!game || game.type !== 'word') return;

      const result = wordGame.guessWord(game.state, socket.userId, word);
      if (result.error) return socket.emit('game_error', { message: result.error });

      game.state = result.game;
      io.to(roomId).emit('word_word_guess', { playerId: socket.userId, isCorrect: result.isCorrect });

      if (result.isCorrect || result.isLost) {
        io.to(roomId).emit('word_round_end', {
          word: game.state.currentWord,
          winner: result.isCorrect ? socket.userId : null,
          scores: game.state.scores,
        });

        setTimeout(() => {
          if (activeGames.has(roomId)) {
            const g = activeGames.get(roomId);
            g.state = wordGame.nextRound(g.state);
            if (g.state.status === 'finished') {
              handleGameEnd(io, g, userSockets, db);
            } else {
              broadcastGameState(io, g, userSockets);
            }
          }
        }, 3000);
      }
    });

    // === CHAT EVENTS ===

    socket.on('send_message', ({ roomId, content, type = 'text' }) => {
      if (!content || content.trim().length === 0) return;
      if (content.length > 500) return;

      const msgId = uuidv4();
      const user = db.prepare('SELECT username, avatar FROM users WHERE id = ?').get(socket.userId);

      const msg = {
        id: msgId,
        roomId,
        senderId: socket.userId,
        senderName: user.username,
        senderAvatar: user.avatar,
        content: content.trim(),
        type,
        createdAt: new Date().toISOString(),
      };

      db.prepare(`
        INSERT INTO messages (id, room_id, sender_id, content, type)
        VALUES (?, ?, ?, ?, ?)
      `).run(msgId, roomId, socket.userId, content.trim(), type);

      io.to(roomId).emit('new_message', msg);
    });

    socket.on('send_dm', ({ receiverId, content }) => {
      if (!content || content.trim().length === 0) return;

      const msgId = uuidv4();
      const user = db.prepare('SELECT username, avatar FROM users WHERE id = ?').get(socket.userId);

      const msg = {
        id: msgId,
        senderId: socket.userId,
        senderName: user.username,
        senderAvatar: user.avatar,
        receiverId,
        content: content.trim(),
        type: 'dm',
        createdAt: new Date().toISOString(),
      };

      db.prepare(`
        INSERT INTO messages (id, sender_id, receiver_id, content, type)
        VALUES (?, ?, ?, ?, ?)
      `).run(msgId, socket.userId, receiverId, content.trim(), 'dm');

      const receiverSocket = userSockets.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('new_dm', msg);
      }
      socket.emit('new_dm', msg);
    });

    socket.on('typing', ({ roomId }) => {
      socket.to(roomId).emit('user_typing', { userId: socket.userId, username: socket.username });
    });

    // === INVITATION EVENTS ===

    socket.on('invite_to_room', ({ userId, roomId }) => {
      const room = db.prepare('SELECT name, game_type FROM game_rooms WHERE id = ?').get(roomId);
      if (!room) return;

      const targetSocket = userSockets.get(userId);
      if (targetSocket) {
        io.to(targetSocket).emit('room_invitation', {
          roomId,
          roomName: room.name,
          gameType: room.game_type,
          from: { id: socket.userId, username: socket.username },
        });
      }
    });

    // === DISCONNECT ===

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.username}`);

      userSockets.delete(socket.userId);
      socketUsers.delete(socket.id);

      db.prepare('UPDATE users SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run('offline', socket.userId);

      // Notify friends
      const friends = db.prepare(`
        SELECT u.id FROM users u
        JOIN friendships f ON (f.user_id = u.id OR f.friend_id = u.id)
        WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted' AND u.id != ?
      `).all(socket.userId, socket.userId, socket.userId);

      friends.forEach(friend => {
        const friendSocket = userSockets.get(friend.id);
        if (friendSocket) {
          io.to(friendSocket).emit('friend_offline', { userId: socket.userId });
        }
      });
    });
  });
}

function setupTriviaTimer(io, roomId, game) {
  let questionTimer;

  const scheduleNext = () => {
    questionTimer = setTimeout(() => {
      if (!activeGames.has(roomId)) return;
      const g = activeGames.get(roomId);
      if (g.state.status === 'finished') return;

      io.to(roomId).emit('trivia_time_up', { scores: g.state.scores });
      g.state = triviaGame.nextQuestion(g.state);

      if (g.state.status === 'finished') {
        handleGameEnd(io, g, null, db);
      } else {
        broadcastGameState(io, g, null, false);
        scheduleNext();
      }
    }, (game.state.timePerQuestion + 3) * 1000);
  };

  scheduleNext();
}

function getGameStateForPlayer(game, playerId) {
  switch (game.type) {
    case 'uno':
      return { type: 'uno', ...unoGame.getGameState(game.state, playerId) };
    case 'chess':
      return { type: 'chess', ...chessGame.getGameState(game.state) };
    case 'ludo':
      return { type: 'ludo', ...ludoGame.getGameState(game.state) };
    case 'trivia':
      return { type: 'trivia', ...triviaGame.getGameState(game.state, playerId) };
    case 'word':
      return { type: 'word', ...wordGame.getGameState(game.state) };
    default:
      return {};
  }
}

function broadcastGameState(io, game, userSocketMap, perPlayer = true) {
  if (perPlayer && userSocketMap) {
    game.players.forEach(player => {
      const playerSocket = userSocketMap.get(player.id);
      if (playerSocket) {
        io.to(playerSocket).emit('game_state', getGameStateForPlayer(game, player.id));
      }
    });
  } else {
    io.to(game.roomId).emit('game_state', getGameStateForPlayer(game, null));
  }
}

function handleGameEnd(io, game, userSocketMap, db) {
  const winnerId = game.state.winner;

  // Award XP and coins
  const xpReward = 100;
  const coinsReward = 50;

  game.players.forEach(player => {
    const isWinner = player.id === winnerId;
    const xp = isWinner ? xpReward * 2 : xpReward;
    const coins = isWinner ? coinsReward * 2 : coinsReward;

    db.prepare(`
      UPDATE users SET
        xp = xp + ?,
        coins = coins + ?,
        wins = wins + ?,
        losses = losses + ?,
        total_games = total_games + 1
      WHERE id = ?
    `).run(xp, coins, isWinner ? 1 : 0, isWinner ? 0 : 1, player.id);

    // Level up check
    const user = db.prepare('SELECT level, xp FROM users WHERE id = ?').get(player.id);
    const newLevel = Math.floor(user.xp / 500) + 1;
    if (newLevel > user.level) {
      db.prepare('UPDATE users SET level = ? WHERE id = ?').run(newLevel, player.id);
    }

    // Update leaderboard
    db.prepare(`
      INSERT INTO leaderboard (id, user_id, game_type, score, wins)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id, game_type, season) DO UPDATE SET
        score = score + ?,
        wins = wins + ?,
        updated_at = CURRENT_TIMESTAMP
    `).run(uuidv4(), player.id, game.type, isWinner ? 100 : 10, isWinner ? 1 : 0, isWinner ? 100 : 10, isWinner ? 1 : 0);
  });

  // Save game history
  db.prepare(`
    INSERT INTO game_history (id, game_type, room_id, winner_id, players, xp_earned, coins_earned)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), game.type, game.roomId, winnerId, JSON.stringify(game.players.map(p => p.id)), xpReward * 2, coinsReward * 2);

  io.to(game.roomId).emit('game_ended', {
    winner: winnerId,
    scores: game.state.scores || {},
    rewards: { xp: xpReward, coins: coinsReward },
  });

  // Update room status
  db.prepare('UPDATE game_rooms SET status = ? WHERE id = ?').run('finished', game.roomId);
  activeGames.delete(game.roomId);
}

module.exports = { setupSocketHandlers };
