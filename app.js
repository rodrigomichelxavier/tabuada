const TABLES = Array.from({ length: 9 }, (_, index) => index + 2);
const MAX_MULTIPLIER = 10;
const COINS_PER_HIT = 10;
const TABLE_BONUS = 100;
const MINUTES_PER_TEN_COINS = 5;

const state = {
  selectedTable: 2,
  isRandomMode: false,
  currentTable: 2,
  currentMultiplier: 1,
  coins: 0,
  hitsInCurrentTable: new Set(),
  answeredCurrentQuestion: false,
};

const screens = document.querySelectorAll("[data-screen]");
const tableOptions = document.querySelector("#table-options");
const selectedTableLabel = document.querySelector("#selected-table-label");
const memoryTitle = document.querySelector("#memory-title");
const memoryList = document.querySelector("#memory-list");
const coinsElement = document.querySelector("#coins");
const streakElement = document.querySelector("#streak");
const minutesPreview = document.querySelector("#minutes-preview");
const tableIndicator = document.querySelector("#table-indicator");
const questionElement = document.querySelector("#question");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer-input");
const feedback = document.querySelector("#feedback");
const progressBar = document.querySelector("#progress-bar");
const finalCoins = document.querySelector("#final-coins");
const finalMinutes = document.querySelector("#final-minutes");
const confettiLayer = document.querySelector("#confetti-layer");

function showScreen(screenName) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === screenName);
  });

  if (screenName === "play") {
    setTimeout(() => answerInput.focus(), 120);
  }
}

function renderTableOptions() {
  const tableButtons = TABLES.map((table) => `
    <button class="table-option" type="button" data-table="${table}">
      <strong>${table}</strong>
      <span>Tabuada do ${table}</span>
    </button>
  `).join("");

  tableOptions.innerHTML = `${tableButtons}
    <button class="table-option random" type="button" data-table="random">
      <strong>🎲</strong>
      <span>Sortear tabuada</span>
    </button>`;
}

function chooseTable(table) {
  state.isRandomMode = table === "random";

  if (state.isRandomMode) {
    startRound(randomTable());
    return;
  }

  state.selectedTable = Number(table);
  selectedTableLabel.textContent = `Tabuada do ${state.selectedTable}`;
  showScreen("choose-mode");
}

function renderMemoryTable() {
  memoryTitle.textContent = `Tabuada do ${state.selectedTable}`;
  memoryList.innerHTML = Array.from({ length: MAX_MULTIPLIER }, (_, index) => {
    const multiplier = index + 1;
    return `<li><span>${state.selectedTable} × ${multiplier}</span><strong>${state.selectedTable * multiplier}</strong></li>`;
  }).join("");
}

function resetTableProgress(table) {
  state.currentTable = table;
  state.currentMultiplier = randomMultiplier();
  state.hitsInCurrentTable = new Set();
  state.answeredCurrentQuestion = false;
}

function startRound(table = state.selectedTable) {
  resetTableProgress(table);
  setFeedback("Boa sorte, pequeno mestre!", "neutral");
  renderQuestion();
  showScreen("play");
}

function renderQuestion(previousMultiplier = null) {
  state.answeredCurrentQuestion = false;
  const multiplier = pickUnansweredMultiplier(previousMultiplier);
  state.currentMultiplier = multiplier;
  tableIndicator.textContent = state.isRandomMode
    ? `Tabuada sorteada: ${state.currentTable}`
    : `Tabuada do ${state.currentTable}`;
  questionElement.textContent = `${state.currentTable} × ${state.currentMultiplier}`;
  answerInput.value = "";
  updateScoreboard();
}

function pickUnansweredMultiplier(previousMultiplier = null) {
  const unanswered = Array.from({ length: MAX_MULTIPLIER }, (_, index) => index + 1)
    .filter((multiplier) => !state.hitsInCurrentTable.has(multiplier));
  const options = unanswered.filter((multiplier) => multiplier !== previousMultiplier);
  const availableMultipliers = options.length > 0 ? options : unanswered;

  if (availableMultipliers.length === 0) {
    return randomMultiplier();
  }

  return availableMultipliers[Math.floor(Math.random() * availableMultipliers.length)];
}

function checkAnswer(event) {
  event.preventDefault();

  const answeredMultiplier = state.currentMultiplier;
  const givenAnswer = Number(answerInput.value);
  const rightAnswer = state.currentTable * answeredMultiplier;

  if (givenAnswer === rightAnswer) {
    rewardCorrectAnswer();
    return;
  }

  setFeedback(`Quase! ${state.currentTable} × ${answeredMultiplier} = ${rightAnswer}. Tente a próxima!`, "error");
  showNextQuestion(answeredMultiplier);
}

function rewardCorrectAnswer() {
  state.coins += COINS_PER_HIT;
  state.hitsInCurrentTable.add(state.currentMultiplier);
  state.answeredCurrentQuestion = true;

  const tableCompletedNow = state.hitsInCurrentTable.size === MAX_MULTIPLIER;

  if (tableCompletedNow) {
    state.coins += TABLE_BONUS;
    setFeedback(`Perfeito! Tabuada gabaritada: +${TABLE_BONUS} moedas bônus!`, "success");
    burstConfetti(42);
  } else {
    setFeedback(`Mandou bem! +${COINS_PER_HIT} moedas na mochila!`, "success");
    burstConfetti(18);
  }

  showNextQuestion(state.currentMultiplier);
}

function showNextQuestion(previousMultiplier) {
  if (state.hitsInCurrentTable.size === MAX_MULTIPLIER) {
    if (state.isRandomMode) {
      resetTableProgress(randomTable());
    } else {
      state.hitsInCurrentTable = new Set();
    }
  }

  renderQuestion(previousMultiplier);
}

function continuePlaying() {
  showNextQuestion(state.currentMultiplier);
  setFeedback("Nova conta na tela. Você consegue!", "neutral");
}

function updateScoreboard() {
  coinsElement.textContent = state.coins;
  streakElement.textContent = `${state.hitsInCurrentTable.size}/${MAX_MULTIPLIER}`;
  minutesPreview.textContent = `${coinsToMinutes(state.coins)} min`;
  progressBar.style.width = `${(state.hitsInCurrentTable.size / MAX_MULTIPLIER) * 100}%`;
}

function finishGame() {
  const minutes = coinsToMinutes(state.coins);
  finalCoins.textContent = state.coins;
  finalMinutes.textContent = `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  burstConfetti(64);
  showScreen("result");
}

function resetGame() {
  state.selectedTable = 2;
  state.isRandomMode = false;
  state.currentTable = 2;
  state.currentMultiplier = 1;
  state.coins = 0;
  state.hitsInCurrentTable = new Set();
  state.answeredCurrentQuestion = false;
  updateScoreboard();
  showScreen("home");
}

function setFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = "feedback";

  if (type === "success" || type === "error") {
    feedback.classList.add(type);
  }
}

function randomTable() {
  return TABLES[Math.floor(Math.random() * TABLES.length)];
}

function randomMultiplier() {
  return Math.floor(Math.random() * MAX_MULTIPLIER) + 1;
}

function coinsToMinutes(coins) {
  return Math.floor(coins / 10) * MINUTES_PER_TEN_COINS;
}

function burstConfetti(amount) {
  const colors = ["#facc15", "#22c55e", "#38bdf8", "#fb7185", "#a78bfa", "#f97316"];

  for (let index = 0; index < amount; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--drift", `${Math.random() * 180 - 90}px`);
    piece.style.animationDelay = `${Math.random() * 160}ms`;
    confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 1200);
  }
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    const tableButton = event.target.closest("[data-table]");
    const modeButton = event.target.closest("[data-mode]");

    if (tableButton) {
      chooseTable(tableButton.dataset.table);
      return;
    }

    if (modeButton) {
      if (modeButton.dataset.mode === "memorize") {
        renderMemoryTable();
        showScreen("memorize");
      } else {
        startRound(state.selectedTable);
      }
      return;
    }

    if (!actionButton) {
      return;
    }

    const actions = {
      start: () => showScreen("choose-table"),
      "back-home": resetGame,
      "back-tables": () => showScreen("choose-table"),
      "back-mode": () => showScreen("choose-mode"),
      "ready-play": () => startRound(state.selectedTable),
      continue: continuePlaying,
      finish: finishGame,
      "play-again": resetGame,
    };

    actions[actionButton.dataset.action]?.();
  });

  answerForm.addEventListener("submit", checkAnswer);
}

renderTableOptions();
bindEvents();
updateScoreboard();
