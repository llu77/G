// Ludo Game Logic
const COLORS = ['red', 'blue', 'green', 'yellow'];

// Board positions: 0-51 are main track, safe zones defined separately
const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47]; // Safe squares
const HOME_COLUMNS = {
  red: [52, 53, 54, 55, 56],
  blue: [57, 58, 59, 60, 61],
  green: [62, 63, 64, 65, 66],
  yellow: [67, 68, 69, 70, 71],
};
const START_POSITIONS = { red: 0, blue: 13, green: 26, yellow: 39 };
const HOME_ENTRY = { red: 51, blue: 12, green: 25, yellow: 38 };

function createPiece(color, index) {
  return {
    id: `${color}_${index}`,
    color,
    position: -1, // -1 = in base, 52+ = home column
    isHome: false,
    isBase: true,
  };
}

function createGame(players) {
  const pieces = {};
  const playerColors = {};
  const playerIds = players.map(p => p.id);

  players.forEach((p, i) => {
    const color = COLORS[i];
    playerColors[p.id] = color;
    pieces[color] = [0, 1, 2, 3].map(j => createPiece(color, j));
  });

  return {
    pieces,
    players: playerIds,
    playerColors,
    colorPlayers: Object.fromEntries(Object.entries(playerColors).map(([k, v]) => [v, k])),
    currentPlayer: playerIds[0],
    currentColor: playerColors[playerIds[0]],
    dice: null,
    diceRolled: false,
    status: 'playing',
    winner: null,
    turn: 1,
    consecutiveSixes: 0,
  };
}

function rollDice(game, playerId) {
  if (game.currentPlayer !== playerId) return { error: 'Not your turn' };
  if (game.diceRolled) return { error: 'Already rolled' };

  const dice = Math.floor(Math.random() * 6) + 1;
  game.dice = dice;
  game.diceRolled = true;

  const color = game.playerColors[playerId];
  const movablePieces = getMovablePieces(game, color, dice);

  if (dice === 6) {
    game.consecutiveSixes++;
    if (game.consecutiveSixes === 3) {
      // Three sixes in a row - lose turn
      game.consecutiveSixes = 0;
      game.diceRolled = false;
      game.dice = null;
      nextTurn(game);
      return { dice, noMove: true, reason: 'Three sixes', game };
    }
  } else {
    game.consecutiveSixes = 0;
  }

  if (movablePieces.length === 0) {
    // No moves possible, next turn (unless 6)
    if (dice !== 6) {
      nextTurn(game);
    } else {
      game.diceRolled = false; // Can roll again
    }
    return { dice, noMove: true, movablePieces: [], game };
  }

  return { dice, movablePieces, game };
}

function getMovablePieces(game, color, dice) {
  const movable = [];
  for (const piece of game.pieces[color]) {
    if (piece.isHome) continue;
    if (piece.isBase && dice === 6) {
      movable.push(piece.id);
    } else if (!piece.isBase) {
      movable.push(piece.id);
    }
  }
  return movable;
}

function movePiece(game, playerId, pieceId) {
  if (game.currentPlayer !== playerId) return { error: 'Not your turn' };
  if (!game.diceRolled) return { error: 'Must roll dice first' };

  const color = game.playerColors[playerId];
  const piece = game.pieces[color].find(p => p.id === pieceId);

  if (!piece) return { error: 'Piece not found' };
  if (piece.isHome) return { error: 'Piece already home' };

  const dice = game.dice;
  let captured = false;

  if (piece.isBase) {
    if (dice !== 6) return { error: 'Need 6 to start' };
    piece.position = START_POSITIONS[color];
    piece.isBase = false;
  } else {
    // Calculate new position
    const relativePos = getRelativePosition(piece.position, color);
    const newRelativePos = relativePos + dice;

    if (newRelativePos >= 57) return { error: 'Cannot move that far' };

    if (newRelativePos >= 52) {
      // Home column
      piece.position = HOME_COLUMNS[color][newRelativePos - 52];
    } else {
      piece.position = (START_POSITIONS[color] + newRelativePos) % 52;
    }

    if (newRelativePos === 56) {
      piece.isHome = true;
    }
  }

  // Check for capture (if not in safe zone or home column)
  if (!piece.isHome && piece.position < 52 && !SAFE_ZONES.includes(piece.position)) {
    for (const [otherColor, otherPieces] of Object.entries(game.pieces)) {
      if (otherColor === color) continue;
      for (const otherPiece of otherPieces) {
        if (!otherPiece.isBase && !otherPiece.isHome && otherPiece.position === piece.position) {
          // Capture!
          otherPiece.position = -1;
          otherPiece.isBase = true;
          captured = true;
        }
      }
    }
  }

  game.diceRolled = false;
  game.dice = null;

  // Check win condition
  const allHome = game.pieces[color].every(p => p.isHome);
  if (allHome) {
    game.status = 'finished';
    game.winner = playerId;
    return { success: true, captured, game };
  }

  // If captured or rolled 6, play again
  if (!captured && dice !== 6) {
    nextTurn(game);
  }

  return { success: true, captured, game };
}

function getRelativePosition(absolutePos, color) {
  const start = START_POSITIONS[color];
  if (absolutePos >= start) return absolutePos - start;
  return 52 - start + absolutePos;
}

function nextTurn(game) {
  const playerIndex = game.players.indexOf(game.currentPlayer);
  const nextIndex = (playerIndex + 1) % game.players.length;
  game.currentPlayer = game.players[nextIndex];
  game.currentColor = game.playerColors[game.currentPlayer];
  game.turn++;
  game.diceRolled = false;
  game.dice = null;
}

function getGameState(game) {
  return {
    pieces: game.pieces,
    currentPlayer: game.currentPlayer,
    currentColor: game.currentColor,
    playerColors: game.playerColors,
    dice: game.dice,
    diceRolled: game.diceRolled,
    status: game.status,
    winner: game.winner,
    turn: game.turn,
  };
}

module.exports = { createGame, rollDice, movePiece, getGameState };
