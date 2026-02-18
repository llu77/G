# 🎮 GameZone - Mobile Gaming Platform

A full-featured mobile gaming platform inspired by Plato, built with React PWA + Node.js + Socket.io.

## Features

### 🎯 Games
- **🎴 UNO** - Classic card game with wild cards, draw 2/4, skip, reverse
- **♟️ Chess** - Full chess implementation with legal move validation
- **🎲 Ludo** - Board race game with dice rolling and piece capturing
- **🧠 Trivia** - Knowledge battle with timed questions across 7 categories
- **📝 Word Battle** - Hangman-style word guessing with multiplayer scoring

### 👥 Social Features
- User registration & profiles with custom avatars
- Friends system (send/accept/reject requests)
- Real-time online status
- Direct messaging (DMs) between friends
- Room invitations
- Push notifications

### 🏆 Competitive Features
- Global & per-game leaderboards
- XP & leveling system
- Coins & gems currency
- Win/loss statistics
- Achievements

### 🎮 Multiplayer
- Real-time gameplay via Socket.io
- Public & private rooms
- Room chat
- Spectator-friendly

## Tech Stack

### Backend
- **Node.js** + Express
- **Socket.io** for real-time communication
- **SQLite** (better-sqlite3) for data storage
- **JWT** authentication
- **bcryptjs** for password hashing

### Frontend
- **React 18** PWA (Progressive Web App)
- **Zustand** for state management
- **React Router v6**
- **Socket.io-client**
- Mobile-first CSS with dark theme

## Setup & Run

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
cd gaming-platform

# Install dependencies
npm run install:all

# Build React client
npm run build:client

# Start server (serves both API and client)
npm start
```

### Development Mode

```bash
# Terminal 1 - Start backend
npm run dev:server

# Terminal 2 - Start React dev server
npm run dev:client
```

### Environment Variables

```env
PORT=3001
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:3000
```

## Game Rules

### UNO
- Deal 7 cards to each player
- Match the top card by color or value
- Special cards: Skip, Reverse, Draw 2, Wild, Wild Draw 4
- First to empty their hand wins!

### Chess
- Standard chess rules
- Pawn promotion to queen
- No castling/en-passant in basic mode

### Ludo
- Roll dice to move pieces
- Need a 6 to bring pieces out of base
- Land on opponent to send them back
- Get all 4 pieces home to win!

### Trivia
- Multiple choice questions
- 15 seconds per question
- Faster correct answers = more points
- Most points wins!

### Word Battle
- Guess the hidden word letter by letter
- Category hints provided
- 6 wrong guesses allowed (hangman style)
- Can also guess the full word

## API Endpoints

### Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile

### Rooms
- `GET /api/rooms` - List public rooms
- `POST /api/rooms` - Create room
- `POST /api/rooms/:id/join` - Join room
- `POST /api/rooms/:id/leave` - Leave room

### Social
- `GET /api/social/friends` - Get friends
- `POST /api/social/friends/request/:userId` - Send request
- `GET /api/social/leaderboard` - Get leaderboard
- `GET /api/social/notifications` - Get notifications

## Socket Events

### Client → Server
- `join_room` - Join a game room
- `start_game` - Start the game (host only)
- `uno_play_card` - Play a UNO card
- `chess_move` - Make a chess move
- `ludo_roll` - Roll dice
- `ludo_move` - Move a piece
- `trivia_answer` - Submit trivia answer
- `word_guess_letter` - Guess a letter
- `send_message` - Send chat message
- `send_dm` - Send direct message

### Server → Client
- `game_started` - Game has started
- `game_state` - Updated game state
- `game_ended` - Game finished with winner
- `new_message` - New chat message
- `friend_online/offline` - Friend status update
- `room_invitation` - Invited to a room
