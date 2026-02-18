// Chess Game Logic - Basic Implementation
const PIECES = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

function createInitialBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];

  // White pieces (row 7 and 6)
  for (let i = 0; i < 8; i++) {
    board[7][i] = backRank[i]; // White back rank
    board[6][i] = 'P'; // White pawns
    board[0][i] = backRank[i].toLowerCase(); // Black back rank
    board[1][i] = 'p'; // Black pawns
  }

  return board;
}

function createGame(players) {
  return {
    board: createInitialBoard(),
    currentPlayer: players[0].id,
    players: { white: players[0].id, black: players[1].id },
    playerColors: { [players[0].id]: 'white', [players[1].id]: 'black' },
    status: 'playing',
    winner: null,
    moves: [],
    capturedPieces: { white: [], black: [] },
    enPassant: null,
    castling: { whiteKingSide: true, whiteQueenSide: true, blackKingSide: true, blackQueenSide: true },
    check: null,
  };
}

function isWhitePiece(piece) { return piece && piece === piece.toUpperCase(); }
function isBlackPiece(piece) { return piece && piece === piece.toLowerCase(); }
function isCurrentPlayerPiece(piece, color) {
  return color === 'white' ? isWhitePiece(piece) : isBlackPiece(piece);
}
function isOpponentPiece(piece, color) {
  return color === 'white' ? isBlackPiece(piece) : isWhitePiece(piece);
}

function isInBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function getPossibleMoves(board, row, col, color) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const pieceLower = piece.toLowerCase();

  const addMove = (r, c) => {
    if (isInBounds(r, c) && !isCurrentPlayerPiece(board[r][c], color)) {
      moves.push([r, c]);
      return !board[r][c]; // continue if empty
    }
    return false;
  };

  if (pieceLower === 'p') {
    const dir = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;

    if (isInBounds(row + dir, col) && !board[row + dir][col]) {
      moves.push([row + dir, col]);
      if (row === startRow && !board[row + 2 * dir][col]) {
        moves.push([row + 2 * dir, col]);
      }
    }

    for (const dc of [-1, 1]) {
      if (isInBounds(row + dir, col + dc) && isOpponentPiece(board[row + dir][col + dc], color)) {
        moves.push([row + dir, col + dc]);
      }
    }
  }

  if (pieceLower === 'r' || pieceLower === 'q') {
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      let r = row + dr, c = col + dc;
      while (isInBounds(r, c)) {
        if (!addMove(r, c)) break;
        r += dr; c += dc;
      }
    }
  }

  if (pieceLower === 'b' || pieceLower === 'q') {
    for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      let r = row + dr, c = col + dc;
      while (isInBounds(r, c)) {
        if (!addMove(r, c)) break;
        r += dr; c += dc;
      }
    }
  }

  if (pieceLower === 'n') {
    for (const [dr, dc] of [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]) {
      addMove(row + dr, col + dc);
    }
  }

  if (pieceLower === 'k') {
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      addMove(row + dr, col + dc);
    }
  }

  return moves;
}

function makeMove(game, playerId, from, to) {
  const { row: fromRow, col: fromCol } = from;
  const { row: toRow, col: toCol } = to;

  if (game.currentPlayer !== playerId) return { error: 'Not your turn' };
  if (game.status !== 'playing') return { error: 'Game over' };

  const color = game.playerColors[playerId];
  const piece = game.board[fromRow][fromCol];

  if (!piece) return { error: 'No piece at position' };
  if (!isCurrentPlayerPiece(piece, color)) return { error: 'Not your piece' };

  const possibleMoves = getPossibleMoves(game.board, fromRow, fromCol, color);
  const isValidMove = possibleMoves.some(([r, c]) => r === toRow && c === toCol);

  if (!isValidMove) return { error: 'Invalid move' };

  // Execute move
  const newBoard = game.board.map(row => [...row]);
  const capturedPiece = newBoard[toRow][toCol];

  if (capturedPiece) {
    game.capturedPieces[color].push(capturedPiece);

    // Check if king captured (game over)
    if (capturedPiece.toLowerCase() === 'k') {
      game.status = 'finished';
      game.winner = playerId;
    }
  }

  // Pawn promotion
  let movedPiece = piece;
  if (piece === 'P' && toRow === 0) movedPiece = 'Q';
  if (piece === 'p' && toRow === 7) movedPiece = 'q';

  newBoard[toRow][toCol] = movedPiece;
  newBoard[fromRow][fromCol] = null;
  game.board = newBoard;

  game.moves.push({ from, to, piece, captured: capturedPiece });

  // Switch players
  const playerIds = Object.values(game.players);
  game.currentPlayer = playerIds.find(id => id !== playerId);

  return { success: true, game };
}

function getGameState(game) {
  return {
    board: game.board,
    currentPlayer: game.currentPlayer,
    players: game.players,
    playerColors: game.playerColors,
    status: game.status,
    winner: game.winner,
    moves: game.moves,
    capturedPieces: game.capturedPieces,
    moveCount: game.moves.length,
  };
}

module.exports = { createGame, makeMove, getGameState, getPossibleMoves };
