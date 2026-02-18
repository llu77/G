// Trivia Game Logic
const QUESTIONS = [
  // Science
  { id: 1, category: 'Science', question: 'What is the chemical symbol for Gold?', options: ['Au', 'Ag', 'Go', 'Gd'], correct: 0, difficulty: 'easy' },
  { id: 2, category: 'Science', question: 'How many planets are in our solar system?', options: ['7', '8', '9', '10'], correct: 1, difficulty: 'easy' },
  { id: 3, category: 'Science', question: 'What is the speed of light?', options: ['300,000 km/s', '150,000 km/s', '450,000 km/s', '200,000 km/s'], correct: 0, difficulty: 'medium' },
  { id: 4, category: 'Science', question: 'What is the atomic number of Carbon?', options: ['6', '12', '8', '14'], correct: 0, difficulty: 'medium' },
  { id: 5, category: 'Science', question: 'What is DNA?', options: ['Deoxyribonucleic acid', 'Dinitrogen acid', 'Dioxynucleic acid', 'Dimensional nuclear agent'], correct: 0, difficulty: 'easy' },

  // Geography
  { id: 6, category: 'Geography', question: 'What is the capital of Japan?', options: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'], correct: 2, difficulty: 'easy' },
  { id: 7, category: 'Geography', question: 'Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Mississippi', 'Yangtze'], correct: 1, difficulty: 'medium' },
  { id: 8, category: 'Geography', question: 'What is the largest country by area?', options: ['Canada', 'USA', 'China', 'Russia'], correct: 3, difficulty: 'easy' },
  { id: 9, category: 'Geography', question: 'How many continents are there?', options: ['5', '6', '7', '8'], correct: 2, difficulty: 'easy' },
  { id: 10, category: 'Geography', question: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], correct: 1, difficulty: 'medium' },

  // History
  { id: 11, category: 'History', question: 'In what year did World War II end?', options: ['1943', '1944', '1945', '1946'], correct: 2, difficulty: 'easy' },
  { id: 12, category: 'History', question: 'Who was the first US President?', options: ['Thomas Jefferson', 'Benjamin Franklin', 'George Washington', 'John Adams'], correct: 2, difficulty: 'easy' },
  { id: 13, category: 'History', question: 'When did the Berlin Wall fall?', options: ['1987', '1988', '1989', '1990'], correct: 2, difficulty: 'medium' },

  // Math
  { id: 14, category: 'Math', question: 'What is the square root of 144?', options: ['11', '12', '13', '14'], correct: 1, difficulty: 'easy' },
  { id: 15, category: 'Math', question: 'What is π (pi) approximately equal to?', options: ['3.14', '3.16', '3.12', '3.18'], correct: 0, difficulty: 'easy' },
  { id: 16, category: 'Math', question: 'What is 15% of 200?', options: ['25', '30', '35', '40'], correct: 1, difficulty: 'easy' },
  { id: 17, category: 'Math', question: 'What is the Fibonacci sequence?', options: ['1,2,4,8...', '1,1,2,3,5...', '0,1,3,6...', '2,4,6,8...'], correct: 1, difficulty: 'medium' },

  // Sports
  { id: 18, category: 'Sports', question: 'How many players are in a soccer team?', options: ['9', '10', '11', '12'], correct: 2, difficulty: 'easy' },
  { id: 19, category: 'Sports', question: 'How many rings are on the Olympic flag?', options: ['4', '5', '6', '7'], correct: 1, difficulty: 'easy' },
  { id: 20, category: 'Sports', question: 'Which sport uses a shuttlecock?', options: ['Tennis', 'Squash', 'Badminton', 'Pickleball'], correct: 2, difficulty: 'easy' },

  // Technology
  { id: 21, category: 'Technology', question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Markup Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], correct: 0, difficulty: 'easy' },
  { id: 22, category: 'Technology', question: 'Who founded Apple Inc.?', options: ['Bill Gates', 'Elon Musk', 'Steve Jobs', 'Mark Zuckerberg'], correct: 2, difficulty: 'easy' },
  { id: 23, category: 'Technology', question: 'What is the binary representation of 10?', options: ['1010', '1100', '0110', '1001'], correct: 0, difficulty: 'medium' },
  { id: 24, category: 'Technology', question: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Processing Unit', 'Central Program Unit', 'Core Processing Unit'], correct: 0, difficulty: 'easy' },

  // Pop Culture
  { id: 25, category: 'Pop Culture', question: 'What is the best-selling video game of all time?', options: ['Grand Theft Auto V', 'Minecraft', 'Tetris', 'Mario Kart'], correct: 1, difficulty: 'medium' },
  { id: 26, category: 'Pop Culture', question: 'Who sings "Shape of You"?', options: ['Justin Bieber', 'Ed Sheeran', 'Bruno Mars', 'The Weeknd'], correct: 1, difficulty: 'easy' },
];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createGame(players, settings = {}) {
  const questionsCount = settings.questionsCount || 10;
  const timePerQuestion = settings.timePerQuestion || 15;

  const selectedQuestions = shuffle(QUESTIONS).slice(0, questionsCount).map(q => ({
    ...q,
    options: shuffle(q.options.map((o, i) => ({ text: o, originalIndex: i }))),
  }));

  const scores = {};
  const answers = {};
  players.forEach(p => {
    scores[p.id] = 0;
    answers[p.id] = [];
  });

  return {
    questions: selectedQuestions,
    currentQuestion: 0,
    scores,
    answers,
    players: players.map(p => p.id),
    status: 'playing',
    winner: null,
    timePerQuestion,
    questionStartTime: Date.now(),
    roundAnswers: {},
    totalQuestions: questionsCount,
  };
}

function submitAnswer(game, playerId, questionIndex, answerIndex) {
  if (game.currentPlayer !== undefined && game.status !== 'playing') {
    return { error: 'Game not active' };
  }

  if (questionIndex !== game.currentQuestion) {
    return { error: 'Wrong question' };
  }

  if (game.roundAnswers[playerId] !== undefined) {
    return { error: 'Already answered' };
  }

  const question = game.questions[questionIndex];
  const selectedOption = question.options[answerIndex];
  const isCorrect = selectedOption.originalIndex === question.correct;
  const timeElapsed = (Date.now() - game.questionStartTime) / 1000;
  const timeBonus = Math.max(0, Math.floor((game.timePerQuestion - timeElapsed) * 10));

  const points = isCorrect ? (100 + timeBonus) : 0;

  game.roundAnswers[playerId] = { answerIndex, isCorrect, points, timeElapsed };
  game.scores[playerId] += points;
  game.answers[playerId].push({ questionIndex, isCorrect, points });

  // Check if all players answered
  const allAnswered = game.players.every(pid => game.roundAnswers[pid] !== undefined);

  if (allAnswered) {
    return { success: true, allAnswered: true, roundAnswers: game.roundAnswers, game };
  }

  return { success: true, allAnswered: false };
}

function nextQuestion(game) {
  game.roundAnswers = {};
  game.currentQuestion++;
  game.questionStartTime = Date.now();

  if (game.currentQuestion >= game.totalQuestions) {
    game.status = 'finished';

    // Determine winner
    let maxScore = -1;
    let winner = null;
    for (const [playerId, score] of Object.entries(game.scores)) {
      if (score > maxScore) {
        maxScore = score;
        winner = playerId;
      }
    }
    game.winner = winner;
  }

  return game;
}

function getGameState(game, playerId) {
  const currentQ = game.questions[game.currentQuestion];
  return {
    currentQuestion: currentQ ? {
      index: game.currentQuestion,
      category: currentQ.category,
      question: currentQ.question,
      options: currentQ.options.map(o => o.text),
      difficulty: currentQ.difficulty,
    } : null,
    scores: game.scores,
    players: game.players,
    status: game.status,
    winner: game.winner,
    totalQuestions: game.totalQuestions,
    currentQuestionIndex: game.currentQuestion,
    hasAnswered: game.roundAnswers[playerId] !== undefined,
    answeredCount: Object.keys(game.roundAnswers).length,
    timePerQuestion: game.timePerQuestion,
    questionStartTime: game.questionStartTime,
  };
}

module.exports = { createGame, submitAnswer, nextQuestion, getGameState };
