const elements = {
    guessInput: document.querySelector("#guessInput"),
    guessButton: document.querySelector("#guessButton"),
    resetButton: document.querySelector("#resetButton"),
    result: document.querySelector("#result"),
    attemptCount: document.querySelector("#attemptCount"),
    bestScore: document.querySelector("#bestScore"),
    hint: document.querySelector("#hint"),
    history: document.querySelector("#history"),
    difficultySelect: document.querySelector("#difficultySelect"),
    rangeLabel: document.querySelector("#rangeLabel")
};

const DIFFICULTIES = {
    easy: { key: "easy", min: 1, max: 50, label: "Easy · 1–50" },
    normal: { key: "normal", min: 1, max: 100, label: "Normal · 1–100" },
    hard: { key: "hard", min: 1, max: 500, label: "Hard · 1–500" }
};

const STORAGE_KEY_PREFIX = "lostDigitHuntBestScore_";

const gameState = {
    difficultyKey: (document.querySelector("#difficultySelect")?.value) || "normal",
    targetNumber: null,
    attempts: 0,
    history: [],
    lastHint: "-",
    isCompleted: false,
    bestScore: null
};

function getCurrentDifficulty() {
    return DIFFICULTIES[gameState.difficultyKey] || DIFFICULTIES.normal;
}

function getRangeBounds() {
    const { min, max } = getCurrentDifficulty();
    return { min, max };
}

function generateTargetNumber() {
    const { min, max } = getRangeBounds();
    const span = max - min + 1;
    return Math.floor(Math.random() * span) + min;
}

function getBestScoreForDifficulty(difficultyKey) {
    const key = `${STORAGE_KEY_PREFIX}${difficultyKey}`;
    const value = Number(window.localStorage.getItem(key));
    return Number.isInteger(value) && value > 0 ? value : null;
}

function setBestScoreForDifficulty(score, difficultyKey) {
    const key = `${STORAGE_KEY_PREFIX}${difficultyKey}`;
    window.localStorage.setItem(key, String(score));
    gameState.bestScore = score;
}

function updateStatus(message, statusType) {
    elements.result.textContent = message;
    elements.result.className = `status ${statusType}`;
}

function updateRangeLabel() {
    if (!elements.rangeLabel) return;
    const { min, max } = getRangeBounds();
    const difficulty = getCurrentDifficulty();
    elements.rangeLabel.textContent = `Range: ${min}–${max} (${difficulty.label})`;
}

function renderStats() {
    elements.attemptCount.textContent = String(gameState.attempts);
    elements.hint.textContent = gameState.lastHint;
    elements.bestScore.textContent = gameState.bestScore ? String(gameState.bestScore) : "-";
}

function renderHistory() {
    if (gameState.history.length === 0) {
        elements.history.innerHTML = "<span class=\"chip\">No guesses yet</span>";
        return;
    }

    elements.history.innerHTML = gameState.history
        .map((guess) => `<span class="chip">${guess}</span>`)
        .join("");
}

function calculateRoundScore() {
    const { min, max } = getRangeBounds();
    const rangeSize = max - min + 1;
    if (!gameState.attempts || gameState.attempts <= 0) return 0;
    const raw = (rangeSize / gameState.attempts) * 10;
    return Math.max(1, Math.round(raw));
}

function buildHint(userGuess, targetNumber) {
    const { min, max } = getRangeBounds();
    const rangeSize = max - min + 1;
    const diff = Math.abs(userGuess - targetNumber);

    if (diff === 0) return "Correct";

    const direction = userGuess < targetNumber ? "low" : "high";
    const closeness = diff / rangeSize;

    if (closeness > 0.5) {
        return `Way too ${direction}`;
    }
    if (closeness > 0.25) {
        return `Too ${direction}`;
    }
    return `Very close, just a bit too ${direction}`;
}

function hydrateBestScore() {
    gameState.bestScore = getBestScoreForDifficulty(gameState.difficultyKey);
}

function resetRound({ keepDifficulty } = { keepDifficulty: true }) {
    if (!keepDifficulty && elements.difficultySelect) {
        gameState.difficultyKey = elements.difficultySelect.value;
    }

    gameState.targetNumber = generateTargetNumber();
    gameState.attempts = 0;
    gameState.history = [];
    gameState.lastHint = "-";
    gameState.isCompleted = false;

    hydrateBestScore();
    updateRangeLabel();

    elements.guessInput.value = "";
    elements.guessInput.focus();
    updateStatus("Make your first guess.", "status-neutral");
    renderStats();
    renderHistory();
}

function handleDifficultyChange() {
    if (!elements.difficultySelect) return;
    gameState.difficultyKey = elements.difficultySelect.value;
    resetRound({ keepDifficulty: true });
}

function submitGuess() {
    if (gameState.isCompleted) {
        updateStatus("Round completed. Click 'New Round' to play again.", "status-neutral");
        return;
    }

    const userGuess = Number.parseInt(elements.guessInput.value, 10);

    if (!Number.isInteger(userGuess)) {
        updateStatus("Please enter a valid whole number.", "status-error");
        return;
    }

    const { min, max } = getRangeBounds();
    if (userGuess < min || userGuess > max) {
        updateStatus(`Out of range. Enter a number between ${min} and ${max}.`, "status-error");
        return;
    }

    gameState.attempts += 1;
    gameState.history.push(userGuess);

    if (userGuess === gameState.targetNumber) {
        gameState.isCompleted = true;
        const score = calculateRoundScore();
        gameState.lastHint = "Correct";

        updateStatus(
            `Correct! You found it in ${gameState.attempts} attempts. Score: ${score} pts.`,
            "status-win"
        );

        if (!gameState.bestScore || score > gameState.bestScore) {
            setBestScoreForDifficulty(score, gameState.difficultyKey);
        }
    } else {
        const hint = buildHint(userGuess, gameState.targetNumber);
        gameState.lastHint = hint;
        updateStatus(`${hint}. Try again.`, "status-neutral");
    }

    renderStats();
    renderHistory();
    elements.guessInput.select();
}

if (elements.difficultySelect) {
    elements.difficultySelect.addEventListener("change", handleDifficultyChange);
}

elements.guessButton.addEventListener("click", submitGuess);
elements.resetButton.addEventListener("click", () => resetRound({ keepDifficulty: true }));
elements.guessInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        submitGuess();
    }
});

resetRound({ keepDifficulty: true });