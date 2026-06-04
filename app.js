const TABLES = Array.from({ length: 9 }, (_, index) => index + 2);
const MAX_MULTIPLIER = 10;
const COINS_PER_HIT = 1;
const SPEED_BONUS_COINS = 1;
const SPEED_BONUS_LIMIT_MS = 5000;
const TABLE_BONUS = 10;

const state = {
  selectedTable: 2,
  isRandomMode: false,
  currentTable: 2,
  currentMultiplier: 1,
  coins: 0,
  hitsInCurrentTable: new Set(),
  answeredCurrentQuestion: false,
  questionStartedAt: Date.now(),
  timerInterval: null,
};

const prize = { name: '', coins: 0 };

// Web Audio chiptune background music
const music = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;
  let loopId = null;
  let running = false;

  const BPM = 145;
  const BEAT = 60 / BPM;

  const MELODY = [
    [523, 0.5], [659, 0.5], [784, 0.5], [880, 0.5],
    [1047, 1],  [880, 0.5], [784, 0.5],
    [659, 0.5], [523, 0.5], [0, 0.5],   [587, 0.5],
    [784, 0.5], [880, 0.5], [784, 1],   [0, 0.5],
    [880, 0.5], [1047, 0.5],[880, 0.5], [784, 0.5],
    [659, 1],   [523, 0.5], [0, 0.5],
    [523, 0.5], [659, 0.5], [784, 0.5], [880, 0.5],
    [1047, 1.5],[784, 0.5],
  ];

  const LOOP_DURATION = MELODY.reduce((s, [, b]) => s + b * BEAT, 0);

  function init() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 0.1;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function playNote(freq, startTime, duration) {
    if (!freq || !ctx) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.22, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.82);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  function schedule(startTime) {
    let t = startTime;
    MELODY.forEach(([freq, beats]) => {
      playNote(freq, t, beats * BEAT * 0.88);
      t += beats * BEAT;
    });
    loopId = setTimeout(() => schedule(startTime + LOOP_DURATION), (LOOP_DURATION - 0.15) * 1000);
  }

  return {
    start() {
      init();
      if (running) return;
      running = true;
      clearTimeout(loopId);
      schedule(ctx.currentTime + 0.05);
    },
    toggleMute() {
      muted = !muted;
      if (masterGain) masterGain.gain.value = muted ? 0 : 0.1;
      return muted;
    },
    isMuted: () => muted,
  };
})();

const screens = document.querySelectorAll("[data-screen]");
const appShell = document.querySelector("#app");
const tableOptions = document.querySelector("#table-options");
const selectedTableLabel = document.querySelector("#selected-table-label");
const memoryTitle = document.querySelector("#memory-title");
const memoryList = document.querySelector("#memory-list");
const coinsElement = document.querySelector("#coins");
const streakElement = document.querySelector("#streak");
const minutesPreview = document.querySelector("#minutes-preview");
const timerElement = document.querySelector("#timer");
const tableIndicator = document.querySelector("#table-indicator");
const questionElement = document.querySelector("#question");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer-input");
const feedback = document.querySelector("#feedback");
const progressBar = document.querySelector("#progress-bar");
const finalCoins = document.querySelector("#final-coins");
const confettiLayer = document.querySelector("#confetti-layer");
const errorBurst = document.querySelector("#error-burst");
const speedBonus = document.querySelector("#speed-bonus");
const prizeNameInput = document.querySelector("#prize-name-input");
const prizeCoinsInput = document.querySelector("#prize-coins-input");
const prizeCalc = document.querySelector("#prize-calc");
const prizeDisplayName = document.querySelector("#prize-display-name");
const calcNormal = document.querySelector("#calc-normal");
const calcSpeed = document.querySelector("#calc-speed");
const calcTables = document.querySelector("#calc-tables");
const startAdventureBtn = document.querySelector("#start-adventure-btn");
const prizeResultEl = document.querySelector("#prize-result");
const resultPrizeName = document.querySelector("#result-prize-name");
const resultProgressBar = document.querySelector("#result-progress-bar");
const resultCoinsEarned = document.querySelector("#result-coins-earned");
const resultCoinsNeeded = document.querySelector("#result-coins-needed");
const resultPrizeMsg = document.querySelector("#result-prize-msg");
const musicToggleBtn = document.querySelector("#music-toggle");

function showScreen(screenName) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === screenName);
  });

  if (screenName !== "play") {
    stopQuestionTimer();
  }

  if (screenName === "play") {
    focusAnswerInput(160);
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
  setFeedback("Valendo! Responda rápido para ganhar bônus de velocidade.", "neutral");
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
  startQuestionTimer();
  focusAnswerInput();
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
  const answeredTable = state.currentTable;
  const elapsedMs = Date.now() - state.questionStartedAt;
  const givenAnswer = Number(answerInput.value);
  const rightAnswer = answeredTable * answeredMultiplier;

  if (givenAnswer === rightAnswer) {
    rewardCorrectAnswer(elapsedMs);
    return;
  }

  setFeedback(`Errou! ${answeredTable} × ${answeredMultiplier} = ${rightAnswer}. Bora para a próxima!`, "error");
  showErrorEvent();
  showNextQuestion(answeredMultiplier);
}

function rewardCorrectAnswer(elapsedMs) {
  const completedTable = state.currentTable;
  let earnedCoins = COINS_PER_HIT;

  state.coins += COINS_PER_HIT;
  state.hitsInCurrentTable.add(state.currentMultiplier);
  state.answeredCurrentQuestion = true;

  if (elapsedMs < SPEED_BONUS_LIMIT_MS) {
    state.coins += SPEED_BONUS_COINS;
    earnedCoins += SPEED_BONUS_COINS;
    showSpeedBonus();
  }

  const tableCompletedNow = state.hitsInCurrentTable.size === MAX_MULTIPLIER;

  if (tableCompletedNow) {
    state.coins += TABLE_BONUS;
    earnedCoins += TABLE_BONUS;
    setFeedback(`Você completou a tabuada do ${completedTable}! +${TABLE_BONUS} moedas de gabarito!`, "success");
    burstConfetti(48);
  } else {
    setFeedback(`Acertou! +${earnedCoins} ${earnedCoins === 1 ? "moeda" : "moedas"}.`, "success");
    burstConfetti(16);
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

function chooseAnotherTable() {
  stopQuestionTimer();
  state.isRandomMode = false;
  showScreen("choose-table");
  setFeedback("Escolha outra tabuada para continuar acumulando moedas!", "neutral");
}

function updatePrizeCalc() {
  const name = prizeNameInput.value.trim();
  const coins = parseInt(prizeCoinsInput.value, 10);

  if (!name || !coins || coins < 1) {
    prizeCalc.hidden = true;
    startAdventureBtn.hidden = true;
    return;
  }

  prizeDisplayName.textContent = `"${name}"`;
  calcNormal.textContent = coins;
  calcSpeed.textContent = Math.ceil(coins / 2);
  calcTables.textContent = Math.ceil(coins / 20);

  prizeCalc.hidden = false;
  startAdventureBtn.hidden = false;
}

function startAdventure() {
  const name = prizeNameInput.value.trim();
  const coins = parseInt(prizeCoinsInput.value, 10);
  if (!name || !coins || coins < 1) return;

  prize.name = name;
  prize.coins = coins;
  music.start();
  showScreen("choose-table");
}

function updateScoreboard() {
  coinsElement.textContent = state.coins;
  streakElement.textContent = `${state.hitsInCurrentTable.size}/${MAX_MULTIPLIER}`;
  const pct = prize.coins > 0 ? Math.min(100, Math.round((state.coins / prize.coins) * 100)) : 0;
  minutesPreview.textContent = `${pct}%`;
  progressBar.style.width = `${(state.hitsInCurrentTable.size / MAX_MULTIPLIER) * 100}%`;
}

function finishGame() {
  stopQuestionTimer();
  const earned = state.coins;
  finalCoins.textContent = earned;

  if (prize.name) {
    const needed = prize.coins;
    const pct = Math.min(100, (earned / needed) * 100);
    resultPrizeName.innerHTML = `🎁 ${prize.name} (${needed} <i class="coin-icon" aria-hidden="true"></i>)`;
    resultProgressBar.style.width = `${pct}%`;
    resultCoinsEarned.textContent = earned;
    resultCoinsNeeded.textContent = needed;

    if (earned >= needed) {
      resultPrizeMsg.textContent = '🎉 Missão cumprida! Você conquistou o prêmio!';
    } else {
      const diff = needed - earned;
      resultPrizeMsg.textContent = `Faltam ${diff} moedas para conquistar o prêmio!`;
    }
    prizeResultEl.hidden = false;
  } else {
    prizeResultEl.hidden = true;
  }

  burstConfetti(64);
  showScreen("result");
}

function playAgain() {
  stopQuestionTimer();
  state.coins = 0;
  state.hitsInCurrentTable = new Set();
  state.answeredCurrentQuestion = false;
  updateScoreboard();
  showScreen("choose-table");
}

function resetGame() {
  stopQuestionTimer();
  state.selectedTable = 2;
  state.isRandomMode = false;
  state.currentTable = 2;
  state.currentMultiplier = 1;
  state.coins = 0;
  state.hitsInCurrentTable = new Set();
  state.answeredCurrentQuestion = false;
  prize.name = '';
  prize.coins = 0;
  prizeNameInput.value = '';
  prizeCoinsInput.value = '';
  prizeCalc.hidden = true;
  startAdventureBtn.hidden = true;
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

function focusAnswerInput(delay = 0) {
  const focus = () => {
    if (!document.querySelector('[data-screen="play"]').classList.contains("active")) {
      return;
    }

    answerInput.focus({ preventScroll: true });
    answerInput.select();
    document.body.classList.add("keyboard-mode");
    requestAnimationFrame(() => {
      appShell.scrollIntoView({ block: "start", behavior: "auto" });
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  if (delay > 0) {
    setTimeout(focus, delay);
  } else {
    focus();
  }
}

function startQuestionTimer() {
  stopQuestionTimer();
  state.questionStartedAt = Date.now();
  updateTimer();
  state.timerInterval = setInterval(updateTimer, 1000);
}

function stopQuestionTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimer() {
  const seconds = Math.floor((Date.now() - state.questionStartedAt) / 1000);
  timerElement.textContent = `${seconds}s`;
}

function showErrorEvent() {
  errorBurst.classList.remove("show");
  appShell.classList.remove("screen-shake");
  void errorBurst.offsetWidth;
  errorBurst.classList.add("show");
  appShell.classList.add("screen-shake");
  setTimeout(() => {
    errorBurst.classList.remove("show");
    appShell.classList.remove("screen-shake");
  }, 900);
}

function showSpeedBonus() {
  speedBonus.classList.remove("show");
  void speedBonus.offsetWidth;
  speedBonus.classList.add("show");
  setTimeout(() => speedBonus.classList.remove("show"), 1100);
}

function randomTable() {
  return TABLES[Math.floor(Math.random() * TABLES.length)];
}

function randomMultiplier() {
  return Math.floor(Math.random() * MAX_MULTIPLIER) + 1;
}

function burstConfetti(amount) {
  const colors = ["#9B5DE5", "#F15BB5", "#FEE440", "#00BBF9", "#00F5D4"];

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
      start: () => showScreen("prize-setup"),
      "start-adventure": startAdventure,
      "back-home": resetGame,
      "back-tables": () => showScreen("choose-table"),
      "back-mode": () => showScreen("choose-mode"),
      "ready-play": () => startRound(state.selectedTable),
      "choose-table": chooseAnotherTable,
      finish: finishGame,
      "play-again": playAgain,
      "toggle-music": () => {
        const isMuted = music.toggleMute();
        musicToggleBtn.textContent = isMuted ? '🔇' : '🎵';
        musicToggleBtn.setAttribute("aria-label", isMuted ? "Ativar música" : "Silenciar música");
      },
    };

    actions[actionButton.dataset.action]?.();
  });

  answerForm.addEventListener("submit", checkAnswer);
  answerInput.addEventListener("focus", () => document.body.classList.add("keyboard-mode"));
  answerInput.addEventListener("blur", () => document.body.classList.remove("keyboard-mode"));
  prizeNameInput.addEventListener("input", updatePrizeCalc);
  prizeCoinsInput.addEventListener("input", updatePrizeCalc);
}

renderTableOptions();
bindEvents();
updateScoreboard();

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

registerServiceWorker();