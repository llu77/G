// UNO Game Logic
const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
const WILD_CARDS = ['wild', 'wild_draw4'];

function createDeck() {
  const deck = [];

  // Number and action cards for each color
  for (const color of COLORS) {
    for (const value of VALUES) {
      deck.push({ color, value, id: `${color}_${value}_1` });
      if (value !== '0') {
        deck.push({ color, value, id: `${color}_${value}_2` });
      }
    }
  }

  // Wild cards (4 of each)
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'wild', id: `wild_${i}` });
    deck.push({ color: 'wild', value: 'wild_draw4', id: `wild_draw4_${i}` });
  }

  return shuffle(deck);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createGame(players) {
  const deck = createDeck();
  const hands = {};
  const playerIds = players.map(p => p.id);

  // Deal 7 cards to each player
  let cardIndex = 0;
  for (const player of players) {
    hands[player.id] = deck.slice(cardIndex, cardIndex + 7);
    cardIndex += 7;
  }

  // Find first non-wild card for discard pile
  let topCard;
  let remainingDeck = deck.slice(cardIndex);

  for (let i = 0; i < remainingDeck.length; i++) {
    if (!WILD_CARDS.includes(remainingDeck[i].value)) {
      topCard = remainingDeck.splice(i, 1)[0];
      break;
    }
  }

  return {
    deck: remainingDeck,
    discardPile: [topCard],
    hands,
    currentPlayer: playerIds[0],
    direction: 1, // 1 = clockwise, -1 = counter-clockwise
    players: playerIds,
    drawCount: 0,
    currentColor: topCard.color,
    status: 'playing',
    lastAction: null,
    winner: null,
  };
}

function canPlayCard(card, topCard, currentColor, drawCount) {
  if (drawCount > 0) {
    // Must play draw card or draw
    return card.value === 'draw2' || card.value === 'wild_draw4';
  }

  if (WILD_CARDS.includes(card.value)) return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

function playCard(game, playerId, cardId, chosenColor) {
  if (game.currentPlayer !== playerId) {
    return { error: 'Not your turn' };
  }

  const hand = game.hands[playerId];
  const cardIndex = hand.findIndex(c => c.id === cardId);

  if (cardIndex === -1) {
    return { error: 'Card not in hand' };
  }

  const card = hand[cardIndex];
  const topCard = game.discardPile[game.discardPile.length - 1];

  if (!canPlayCard(card, topCard, game.currentColor, game.drawCount)) {
    return { error: 'Cannot play this card' };
  }

  // Remove card from hand
  hand.splice(cardIndex, 1);
  game.discardPile.push(card);
  game.currentColor = card.color === 'wild' ? (chosenColor || 'red') : card.color;

  // Apply card effects
  const playerIndex = game.players.indexOf(playerId);
  let nextPlayerIndex;

  switch (card.value) {
    case 'skip':
      nextPlayerIndex = (playerIndex + 2 * game.direction + game.players.length) % game.players.length;
      game.drawCount = 0;
      break;
    case 'reverse':
      game.direction *= -1;
      nextPlayerIndex = (playerIndex + game.direction + game.players.length) % game.players.length;
      game.drawCount = 0;
      break;
    case 'draw2':
      game.drawCount += 2;
      nextPlayerIndex = (playerIndex + game.direction + game.players.length) % game.players.length;
      break;
    case 'wild_draw4':
      game.drawCount += 4;
      nextPlayerIndex = (playerIndex + game.direction + game.players.length) % game.players.length;
      break;
    default:
      game.drawCount = 0;
      nextPlayerIndex = (playerIndex + game.direction + game.players.length) % game.players.length;
  }

  game.currentPlayer = game.players[nextPlayerIndex];
  game.lastAction = { type: 'play', playerId, card };

  // Check win condition
  if (hand.length === 0) {
    game.status = 'finished';
    game.winner = playerId;
  }

  return { success: true, game };
}

function drawCard(game, playerId) {
  if (game.currentPlayer !== playerId) {
    return { error: 'Not your turn' };
  }

  const drawCount = game.drawCount > 0 ? game.drawCount : 1;

  // Refill deck if needed
  if (game.deck.length < drawCount) {
    const topCard = game.discardPile.pop();
    game.deck = [...game.deck, ...shuffle(game.discardPile)];
    game.discardPile = [topCard];
  }

  const drawnCards = game.deck.splice(0, drawCount);
  game.hands[playerId] = [...game.hands[playerId], ...drawnCards];
  game.drawCount = 0;
  game.lastAction = { type: 'draw', playerId, count: drawCount };

  // Move to next player
  const playerIndex = game.players.indexOf(playerId);
  const nextPlayerIndex = (playerIndex + game.direction + game.players.length) % game.players.length;
  game.currentPlayer = game.players[nextPlayerIndex];

  return { success: true, game, drawnCards };
}

function getGameState(game, playerId) {
  const state = {
    topCard: game.discardPile[game.discardPile.length - 1],
    currentColor: game.currentColor,
    currentPlayer: game.currentPlayer,
    direction: game.direction,
    drawCount: game.drawCount,
    status: game.status,
    winner: game.winner,
    lastAction: game.lastAction,
    playerHands: {},
    deckCount: game.deck.length,
  };

  // Each player sees their own hand, others see card count
  for (const pid of game.players) {
    if (pid === playerId) {
      state.playerHands[pid] = game.hands[pid];
    } else {
      state.playerHands[pid] = game.hands[pid].length;
    }
  }

  return state;
}

module.exports = { createGame, playCard, drawCard, getGameState };
