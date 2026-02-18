// Word Battle Game Logic
const WORD_CATEGORIES = {
  animals: ['elephant', 'giraffe', 'dolphin', 'penguin', 'kangaroo', 'cheetah', 'gorilla', 'zebra', 'crocodile', 'flamingo', 'jaguar', 'octopus', 'platypus', 'rhinoceros', 'wolverine'],
  fruits: ['strawberry', 'pineapple', 'watermelon', 'blueberry', 'raspberry', 'pomegranate', 'persimmon', 'tangerine', 'passion', 'avocado', 'lychee', 'mango', 'papaya', 'guava'],
  countries: ['australia', 'argentina', 'switzerland', 'netherlands', 'mozambique', 'madagascar', 'bangladesh', 'philippines', 'indonesia', 'zimbabwe', 'ethiopia', 'kazakhstan'],
  sports: ['basketball', 'volleyball', 'badminton', 'swimming', 'gymnastics', 'wrestling', 'athletics', 'cycling', 'triathlon', 'skateboarding', 'snowboarding', 'archery'],
  technology: ['smartphone', 'computer', 'internet', 'software', 'hardware', 'algorithm', 'database', 'networking', 'cybersecurity', 'artificial', 'blockchain', 'quantum'],
};

function getRandomWord() {
  const categories = Object.keys(WORD_CATEGORIES);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const words = WORD_CATEGORIES[category];
  const word = words[Math.floor(Math.random() * words.length)];
  return { word, category };
}

function createMaskedWord(word, guessedLetters) {
  return word.split('').map(letter =>
    guessedLetters.includes(letter) ? letter : '_'
  ).join(' ');
}

function createGame(players, settings = {}) {
  const maxRounds = settings.rounds || 5;
  const timePerWord = settings.timePerWord || 60;

  const scores = {};
  players.forEach(p => { scores[p.id] = 0; });

  const firstWord = getRandomWord();

  return {
    players: players.map(p => p.id),
    scores,
    round: 1,
    maxRounds,
    timePerWord,
    currentWord: firstWord.word,
    currentCategory: firstWord.category,
    guessedLetters: [],
    wrongGuesses: 0,
    maxWrongGuesses: 6,
    wordSolvedBy: null,
    roundWinner: null,
    status: 'playing',
    winner: null,
    roundStartTime: Date.now(),
    wordHistory: [],
  };
}

function guessLetter(game, playerId, letter) {
  if (game.status !== 'playing') return { error: 'Game not active' };
  if (!game.players.includes(playerId)) return { error: 'Not a player' };
  if (game.guessedLetters.includes(letter)) return { error: 'Already guessed' };

  letter = letter.toLowerCase();
  game.guessedLetters.push(letter);

  const isCorrect = game.currentWord.includes(letter);
  if (!isCorrect) {
    game.wrongGuesses++;
  }

  const maskedWord = createMaskedWord(game.currentWord, game.guessedLetters);
  const isSolved = !maskedWord.includes('_');
  const isLost = game.wrongGuesses >= game.maxWrongGuesses;

  if (isSolved) {
    const timeBonus = Math.max(0, Math.floor(game.timePerWord - (Date.now() - game.roundStartTime) / 1000));
    const points = (game.currentWord.length * 10) + timeBonus;
    game.scores[playerId] += points;
    game.wordSolvedBy = playerId;
    game.roundWinner = playerId;
    return { success: true, isCorrect, isSolved, playerId, points, game };
  }

  if (isLost) {
    return { success: true, isCorrect: false, isLost: true, game };
  }

  return { success: true, isCorrect, maskedWord, game };
}

function guessWord(game, playerId, word) {
  if (game.status !== 'playing') return { error: 'Game not active' };

  const isCorrect = word.toLowerCase() === game.currentWord.toLowerCase();

  if (isCorrect) {
    const timeBonus = Math.max(0, Math.floor(game.timePerWord - (Date.now() - game.roundStartTime) / 1000));
    const points = (game.currentWord.length * 15) + timeBonus + 50;
    game.scores[playerId] += points;
    game.wordSolvedBy = playerId;
    game.roundWinner = playerId;
    return { success: true, isCorrect: true, points, game };
  }

  // Wrong word guess penalty
  game.wrongGuesses += 2;
  if (game.wrongGuesses >= game.maxWrongGuesses) {
    return { success: true, isCorrect: false, isLost: true, game };
  }

  return { success: true, isCorrect: false, game };
}

function nextRound(game) {
  game.wordHistory.push({
    word: game.currentWord,
    category: game.currentCategory,
    winner: game.roundWinner,
  });

  game.round++;
  game.roundWinner = null;
  game.wordSolvedBy = null;
  game.wrongGuesses = 0;
  game.guessedLetters = [];
  game.roundStartTime = Date.now();

  if (game.round > game.maxRounds) {
    game.status = 'finished';
    let maxScore = -1;
    for (const [pid, score] of Object.entries(game.scores)) {
      if (score > maxScore) {
        maxScore = score;
        game.winner = pid;
      }
    }
    return game;
  }

  const nextWord = getRandomWord();
  game.currentWord = nextWord.word;
  game.currentCategory = nextWord.category;

  return game;
}

function getGameState(game, showWord = false) {
  return {
    round: game.round,
    maxRounds: game.maxRounds,
    category: game.currentCategory,
    maskedWord: showWord ? game.currentWord : createMaskedWord(game.currentWord, game.guessedLetters),
    word: showWord ? game.currentWord : null,
    guessedLetters: game.guessedLetters,
    wrongGuesses: game.wrongGuesses,
    maxWrongGuesses: game.maxWrongGuesses,
    scores: game.scores,
    players: game.players,
    roundWinner: game.roundWinner,
    status: game.status,
    winner: game.winner,
    timePerWord: game.timePerWord,
    roundStartTime: game.roundStartTime,
    wordLength: game.currentWord.length,
  };
}

module.exports = { createGame, guessLetter, guessWord, nextRound, getGameState };
