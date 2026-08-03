const TABLES = Array.from({ length: 9 }, (_, index) => index + 2);
const MAX_MULTIPLIER = 10;
const TOTAL_QUESTIONS = TABLES.length * MAX_MULTIPLIER;
const COINS_PER_HIT = 1;
const SPEED_BONUS_COINS = 1;
const SPEED_BONUS_LIMIT_MS = 5000;
const TABLE_BONUS = 10;

const state = {
  sessionMode: "knowledge",
  gameMode: "sequence",
  selectedTable: 2,
  tableOrder: [],
  tableIndex: 0,
  currentTable: 2,
  currentMultiplier: 1,
  coins: 0,
  hitsInCurrentTable: new Set(),
  completedQuestions: new Set(),
  randomQueue: [],
  randomTableHits: new Map(),
  questionStartedAt: Date.now(),
  timerInterval: null,
  transitionTimeout: null,
  transitioning: false,
};

const prize = { name: "", coins: 0 };

const music = (() => {
  const audio = new Audio("assets/tabuadagame.mp3");
  audio.loop = true;
  audio.volume = 0.5;

  return {
    start() {
      audio.play().catch(() => {});
    },
    toggleMute() {
      audio.muted = !audio.muted;
      return audio.muted;
    },
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
const statusLabel = document.querySelector("#status-label");
const journeyPreview = document.querySelector("#journey-preview");
const timerElement = document.querySelector("#timer");
const tableIndicator = document.querySelector("#table-indicator");
const questionElement = document.querySelector("#question");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer-input");
const feedback = document.querySelector("#feedback");
const progressBar = document.querySelector("#progress-bar");
const progressTrack = document.querySelector("#game-progress");
const finalCoins = document.querySelector("#final-coins");
const resultTitle = document.querySelector("#result-title");
const resultMessage = document.querySelector("#result-message");
const confettiLayer = document.querySelector("#confetti-layer");
const errorBurst = document.querySelector("#error-burst");
const speedBonus = document.querySelector("#speed-bonus");
const milestone = document.querySelector("#milestone");
const milestoneTitle = document.querySelector("#milestone-title");
const milestoneCopy = document.querySelector("#milestone-copy");
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
const dedicationModal = document.querySelector("#dedication-modal");
const dedicationPlaque = document.querySelector("#dedication-plaque");
const dedicationTrigger = document.querySelector("#dedication-trigger");
let dedicationReturnFocus = null;

function showScreen(screenName) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === screenName);
  });

  if (screenName !== "play") stopQuestionTimer();
  if (screenName === "play") focusAnswerInput(160);
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function openDedication() {
  dedicationReturnFocus = document.activeElement;
  dedicationModal.hidden = false;
  dedicationTrigger.setAttribute("aria-expanded", "true");
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => dedicationPlaque.focus({ preventScroll: true }));
}

function closeDedication() {
  if (dedicationModal.hidden) return;
  dedicationModal.hidden = true;
  dedicationTrigger.setAttribute("aria-expanded", "false");
  document.body.classList.remove("modal-open");
  dedicationReturnFocus?.focus?.({ preventScroll: true });
}

function renderTableOptions() {
  const tableButtons = TABLES.map((table) => `
    <button class="table-option" type="button" data-table="${table}">
      <strong>${table}</strong>
      <span>Começar pela tabuada do ${table}</span>
    </button>
  `).join("");

  tableOptions.innerHTML = `${tableButtons}
    <button class="table-option random" type="button" data-table="random">
      <strong>🎲</strong>
      <span><b>Modo sortido</b> · todas as 90 contas misturadas</span>
    </button>`;
}

function resetJourney() {
  clearTimeout(state.transitionTimeout);
  state.tableOrder = [];
  state.tableIndex = 0;
  state.coins = 0;
  state.hitsInCurrentTable = new Set();
  state.completedQuestions = new Set();
  state.randomQueue = [];
  state.randomTableHits = new Map(TABLES.map((table) => [table, new Set()]));
  state.transitioning = false;
  hideMilestone();
  updateScoreboard();
}

function beginSession(mode) {
  state.sessionMode = mode;
  resetJourney();
  if (mode === "knowledge") {
    prize.name = "";
    prize.coins = 0;
    music.start();
    showScreen("choose-table");
  } else {
    showScreen("prize-setup");
  }
}

function chooseTable(table) {
  if (table === "random") {
    state.gameMode = "random";
    startRandomJourney();
    return;
  }

  state.gameMode = "sequence";
  state.selectedTable = Number(table);
  selectedTableLabel.textContent = `Começando pela tabuada do ${state.selectedTable}`;
  showScreen("choose-mode");
}

function renderMemoryTable() {
  memoryTitle.textContent = `Tabuada do ${state.selectedTable}`;
  memoryList.innerHTML = Array.from({ length: MAX_MULTIPLIER }, (_, index) => {
    const multiplier = index + 1;
    return `<li><span>${state.selectedTable} × ${multiplier}</span><strong>${state.selectedTable * multiplier}</strong></li>`;
  }).join("");
}

function startSequenceJourney() {
  resetJourney();
  const startIndex = TABLES.indexOf(state.selectedTable);
  state.tableOrder = [...TABLES.slice(startIndex), ...TABLES.slice(0, startIndex)];
  state.tableIndex = 0;
  startTable(state.tableOrder[0]);
  setFeedback("Valendo! Complete esta tabuada para avançar para a próxima.", "neutral");
  showScreen("play");
}

function startRandomJourney() {
  resetJourney();
  state.randomQueue = shuffle(TABLES.flatMap((table) => (
    Array.from({ length: MAX_MULTIPLIER }, (_, index) => ({ table, multiplier: index + 1 }))
  )));
  setFeedback("Modo sortido! Acerte as 90 contas, sem deixar nenhuma para trás.", "neutral");
  renderRandomQuestion();
  showScreen("play");
}

function startTable(table) {
  state.currentTable = table;
  state.hitsInCurrentTable = new Set();
  renderSequenceQuestion();
}

function renderSequenceQuestion(previousMultiplier = null) {
  const unanswered = Array.from({ length: MAX_MULTIPLIER }, (_, index) => index + 1)
    .filter((multiplier) => !state.hitsInCurrentTable.has(multiplier));
  const withoutPrevious = unanswered.filter((multiplier) => multiplier !== previousMultiplier);
  const options = withoutPrevious.length ? withoutPrevious : unanswered;
  state.currentMultiplier = options[Math.floor(Math.random() * options.length)];
  tableIndicator.textContent = `Tabuada do ${state.currentTable} · ${state.tableIndex + 1} de ${TABLES.length}`;
  prepareQuestion();
}

function renderRandomQuestion() {
  const question = state.randomQueue.shift();
  state.currentTable = question.table;
  state.currentMultiplier = question.multiplier;
  tableIndicator.textContent = `Modo sortido · ${state.completedQuestions.size} de ${TOTAL_QUESTIONS} resolvidas`;
  prepareQuestion();
}

function prepareQuestion() {
  state.transitioning = false;
  questionElement.textContent = `${state.currentTable} × ${state.currentMultiplier}`;
  answerInput.value = "";
  answerInput.disabled = false;
  updateScoreboard();
  startQuestionTimer();
  focusAnswerInput();
}

function checkAnswer(event) {
  event.preventDefault();
  if (state.transitioning) return;

  const table = state.currentTable;
  const multiplier = state.currentMultiplier;
  const elapsedMs = Date.now() - state.questionStartedAt;
  const rightAnswer = table * multiplier;

  if (Number(answerInput.value) === rightAnswer) {
    rewardCorrectAnswer(table, multiplier, elapsedMs);
    return;
  }

  setFeedback(`Quase! ${table} × ${multiplier} = ${rightAnswer}. Essa conta voltará depois.`, "error");
  showErrorEvent();
  if (state.gameMode === "random") {
    state.randomQueue.push({ table, multiplier });
    renderRandomQuestion();
  } else {
    renderSequenceQuestion(multiplier);
  }
}

function rewardCorrectAnswer(table, multiplier, elapsedMs) {
  const key = `${table}x${multiplier}`;
  let earnedCoins = COINS_PER_HIT;
  state.coins += COINS_PER_HIT;
  state.completedQuestions.add(key);

  if (elapsedMs < SPEED_BONUS_LIMIT_MS) {
    state.coins += SPEED_BONUS_COINS;
    earnedCoins += SPEED_BONUS_COINS;
    showSpeedBonus();
  }

  if (state.gameMode === "random") {
    const tableHits = state.randomTableHits.get(table);
    tableHits.add(multiplier);
    const completedTableNow = tableHits.size === MAX_MULTIPLIER;
    if (completedTableNow) {
      state.coins += TABLE_BONUS;
      earnedCoins += TABLE_BONUS;
      tableHits.add("bonus-awarded");
      showMilestone(`Tabuada do ${table} completa!`, `+${TABLE_BONUS} moedas de bônus`);
    }
    updateScoreboard();
    burstConfetti(completedTableNow ? 48 : 16);

    if (state.completedQuestions.size === TOTAL_QUESTIONS) {
      completeJourney();
    } else {
      setFeedback(`Acertou! +${earnedCoins} ${earnedCoins === 1 ? "moeda" : "moedas"}.`, "success");
      renderRandomQuestion();
    }
    return;
  }

  state.hitsInCurrentTable.add(multiplier);
  const completedTableNow = state.hitsInCurrentTable.size === MAX_MULTIPLIER;
  if (!completedTableNow) {
    setFeedback(`Acertou! +${earnedCoins} ${earnedCoins === 1 ? "moeda" : "moedas"}.`, "success");
    burstConfetti(16);
    renderSequenceQuestion(multiplier);
    return;
  }

  state.coins += TABLE_BONUS;
  updateScoreboard();
  burstConfetti(48);
  if (state.tableIndex === state.tableOrder.length - 1) {
    completeJourney();
    return;
  }

  const completedTable = state.currentTable;
  const nextTable = state.tableOrder[state.tableIndex + 1];
  state.transitioning = true;
  answerInput.disabled = true;
  stopQuestionTimer();
  setFeedback(`Tabuada do ${completedTable} completa! Pontos contabilizados.`, "success");
  showMilestone(`Mandou bem na tabuada do ${completedTable}!`, `Agora vamos para a tabuada do ${nextTable}.`);
  state.transitionTimeout = setTimeout(() => {
    hideMilestone();
    state.tableIndex += 1;
    startTable(nextTable);
  }, 1700);
}

function completeJourney() {
  state.transitioning = true;
  updateScoreboard();
  burstConfetti(90);
  setTimeout(() => finishGame(true), 450);
}

function chooseAnotherTable() {
  stopQuestionTimer();
  clearTimeout(state.transitionTimeout);
  resetJourney();
  setFeedback("Escolha como quer começar a nova jornada!", "neutral");
  showScreen("choose-table");
}

function updatePrizeCalc() {
  const name = prizeNameInput.value.trim();
  const coins = parseInt(prizeCoinsInput.value, 10);
  const valid = Boolean(name && coins >= 1);
  prizeCalc.hidden = !valid;
  startAdventureBtn.hidden = !valid;
  if (!valid) return;

  prizeDisplayName.textContent = `“${name}”`;
  calcNormal.textContent = coins;
  calcSpeed.textContent = Math.ceil(coins / 2);
  calcTables.textContent = Math.ceil(coins / 20);
}

function startAdventure() {
  const name = prizeNameInput.value.trim();
  const coins = parseInt(prizeCoinsInput.value, 10);
  if (!name || coins < 1) return;
  prize.name = name;
  prize.coins = coins;
  state.sessionMode = "prize";
  resetJourney();
  music.start();
  showScreen("choose-table");
}

function updateScoreboard() {
  if (!coinsElement) return;
  const completed = state.completedQuestions.size;
  coinsElement.textContent = state.coins;
  streakElement.textContent = state.gameMode === "random"
    ? `${completed}/${TOTAL_QUESTIONS}`
    : `${state.hitsInCurrentTable.size}/${MAX_MULTIPLIER}`;

  const journeyPct = Math.round((completed / TOTAL_QUESTIONS) * 100);
  if (state.sessionMode === "prize" && prize.coins > 0) {
    statusLabel.textContent = "Prêmio";
    journeyPreview.textContent = `${Math.min(100, Math.round((state.coins / prize.coins) * 100))}%`;
  } else {
    statusLabel.textContent = "Jornada";
    journeyPreview.textContent = `${journeyPct}%`;
  }

  const currentProgress = state.gameMode === "random"
    ? (completed / TOTAL_QUESTIONS) * 100
    : (state.hitsInCurrentTable.size / MAX_MULTIPLIER) * 100;
  progressBar.style.width = `${currentProgress}%`;
  progressTrack.setAttribute("aria-valuenow", String(Math.round(currentProgress)));
}

function finishGame(completed = false) {
  stopQuestionTimer();
  clearTimeout(state.transitionTimeout);
  hideMilestone();
  finalCoins.textContent = state.coins;
  resultTitle.textContent = completed ? "Parabéns! Você finalizou o jogo" : "Jogo encerrado";
  resultMessage.textContent = completed
    ? `Você resolveu todas as ${TOTAL_QUESTIONS} contas e somou ${state.coins} moedas!`
    : `Você praticou ${state.completedQuestions.size} contas e somou ${state.coins} moedas.`;

  if (state.sessionMode === "prize" && prize.name) {
    const pct = Math.min(100, (state.coins / prize.coins) * 100);
    resultPrizeName.textContent = `🎁 ${prize.name}`;
    resultProgressBar.style.width = `${pct}%`;
    resultCoinsEarned.textContent = state.coins;
    resultCoinsNeeded.textContent = prize.coins;
    resultPrizeMsg.textContent = state.coins >= prize.coins
      ? "🎉 Missão cumprida! Você conquistou o prêmio!"
      : `Faltam ${prize.coins - state.coins} moedas para conquistar o prêmio!`;
    prizeResultEl.hidden = false;
  } else {
    prizeResultEl.hidden = true;
  }

  showScreen("result");
}

function resetGame() {
  resetJourney();
  stopQuestionTimer();
  state.selectedTable = 2;
  state.gameMode = "sequence";
  state.sessionMode = "knowledge";
  prize.name = "";
  prize.coins = 0;
  prizeNameInput.value = "";
  prizeCoinsInput.value = "";
  prizeCalc.hidden = true;
  startAdventureBtn.hidden = true;
  showScreen("home");
}

function setFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = "feedback";
  if (type === "success" || type === "error") feedback.classList.add(type);
}

function focusAnswerInput(delay = 0) {
  const focus = () => {
    if (!document.querySelector('[data-screen="play"]').classList.contains("active") || answerInput.disabled) return;
    answerInput.focus({ preventScroll: true });
    answerInput.select();
    document.body.classList.add("keyboard-mode");
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  };
  if (delay > 0) setTimeout(focus, delay);
  else focus();
}

function startQuestionTimer() {
  stopQuestionTimer();
  state.questionStartedAt = Date.now();
  updateTimer();
  state.timerInterval = setInterval(updateTimer, 1000);
}

function stopQuestionTimer() {
  if (!state.timerInterval) return;
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function updateTimer() {
  timerElement.textContent = `${Math.floor((Date.now() - state.questionStartedAt) / 1000)}s`;
}

function showMilestone(title, copy) {
  milestoneTitle.textContent = title;
  milestoneCopy.textContent = copy;
  milestone.classList.add("show");
  milestone.setAttribute("aria-hidden", "false");
  setTimeout(hideMilestone, 1500);
}

function hideMilestone() {
  milestone.classList.remove("show");
  milestone.setAttribute("aria-hidden", "true");
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

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function burstConfetti(amount) {
  const colors = ["#ffb515", "#18d1b1", "#f14add", "#26c6f3", "#f24649"];
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
    const tableButton = event.target.closest("[data-table]");
    const modeButton = event.target.closest("[data-mode]");
    const actionButton = event.target.closest("[data-action]");

    if (tableButton) return chooseTable(tableButton.dataset.table);
    if (modeButton) {
      if (modeButton.dataset.mode === "memorize") {
        renderMemoryTable();
        showScreen("memorize");
      } else startSequenceJourney();
      return;
    }
    if (!actionButton) return;

    const actions = {
      "start-practice": () => beginSession("knowledge"),
      "start-prize": () => beginSession("prize"),
      "open-dedication": openDedication,
      "close-dedication": closeDedication,
      "start-adventure": startAdventure,
      "back-home": resetGame,
      "back-tables": () => showScreen("choose-table"),
      "back-mode": () => showScreen("choose-mode"),
      "ready-play": startSequenceJourney,
      "choose-table": chooseAnotherTable,
      finish: () => finishGame(false),
      "play-again": () => {
        resetJourney();
        showScreen("choose-table");
      },
      "toggle-music": () => {
        const isMuted = music.toggleMute();
        musicToggleBtn.textContent = isMuted ? "🔇" : "🎵";
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
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDedication();
  });
}

renderTableOptions();
bindEvents();
updateScoreboard();

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js?v=20260803-dedication", {
        updateViaCache: "none",
      });
      await registration.update();
    } catch (error) {
      console.warn("Não foi possível ativar o modo offline.", error);
    }
  });
}

registerServiceWorker();
