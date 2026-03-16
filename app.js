const DIFFICULTIES = {
    easy: { key: "easy", min: 1, max: 50, label: "Easy - 1-50" },
    normal: { key: "normal", min: 1, max: 100, label: "Normal - 1-100" },
    hard: { key: "hard", min: 1, max: 500, label: "Hard - 1-500" }
};

const STORAGE_KEY_PREFIX = "lostDigitHuntBestScore_";
const SOUND_PREF_KEY = "lostDigitHuntSoundMuted";

const ui = {
    guessInput: document.querySelector("#guessInput"),
    guessButton: document.querySelector("#guessButton"),
    resetButton: document.querySelector("#resetButton"),
    result: document.querySelector("#result"),
    attemptCount: document.querySelector("#attemptCount"),
    bestScore: document.querySelector("#bestScore"),
    hint: document.querySelector("#hint"),
    history: document.querySelector("#history"),
    difficultySelect: document.querySelector("#difficultySelect"),
    rangeLabel: document.querySelector("#rangeLabel"),
    soundToggle: document.querySelector("#soundToggle"),
    zoneRange: document.querySelector("#zoneRange"),
    zoneWidth: document.querySelector("#zoneWidth"),
    zoneWindow: document.querySelector("#zoneWindow")
};

const state = {
    difficultyKey: ui.difficultySelect?.value || "normal",
    targetNumber: 0,
    attempts: 0,
    history: [],
    lastHint: "-",
    bestScore: null,
    possibleMin: 0,
    possibleMax: 0,
    isCompleted: false,
    isMuted: window.localStorage.getItem(SOUND_PREF_KEY) === "1"
};

const audio = {
    context: null
};

function ensureAudioContext() {
    if (audio.context) {
        return audio.context;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return null;
    }

    audio.context = new AudioContextClass();
    return audio.context;
}

function playTone({ frequency, duration = 0.08, type = "sine", gain = 0.03, when = 0 }) {
    if (state.isMuted) {
        return;
    }

    const context = ensureAudioContext();
    if (!context) {
        return;
    }

    if (context.state === "suspended") {
        context.resume();
    }

    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);

    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
}

function playClickSound() {
    playTone({ frequency: 540, duration: 0.05, type: "square", gain: 0.02 });
}

function playErrorSound() {
    playTone({ frequency: 180, duration: 0.08, type: "sawtooth", gain: 0.025 });
    playTone({ frequency: 130, duration: 0.09, type: "sawtooth", gain: 0.02, when: 0.06 });
}

function playSuccessSound() {
    playTone({ frequency: 520, duration: 0.08, type: "triangle", gain: 0.03 });
    playTone({ frequency: 760, duration: 0.1, type: "triangle", gain: 0.03, when: 0.08 });
    playTone({ frequency: 980, duration: 0.13, type: "triangle", gain: 0.03, when: 0.17 });
}

function playResetSound() {
    playTone({ frequency: 360, duration: 0.05, type: "square", gain: 0.02 });
    playTone({ frequency: 300, duration: 0.05, type: "square", gain: 0.02, when: 0.06 });
}

function renderSoundToggle() {
    if (!ui.soundToggle) {
        return;
    }

    ui.soundToggle.textContent = state.isMuted ? "Sound: Off" : "Sound: On";
    ui.soundToggle.setAttribute("aria-pressed", state.isMuted ? "true" : "false");
}

function toggleSound() {
    state.isMuted = !state.isMuted;
    window.localStorage.setItem(SOUND_PREF_KEY, state.isMuted ? "1" : "0");
    renderSoundToggle();

    if (!state.isMuted) {
        playClickSound();
    }
}

function currentDifficulty() {
    return DIFFICULTIES[state.difficultyKey] || DIFFICULTIES.normal;
}

function rangeBounds() {
    const { min, max } = currentDifficulty();
    return { min, max };
}

function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function storageKey(difficultyKey) {
    return `${STORAGE_KEY_PREFIX}${difficultyKey}`;
}

function loadBestScore(difficultyKey) {
    const value = Number(window.localStorage.getItem(storageKey(difficultyKey)));
    return Number.isInteger(value) && value > 0 ? value : null;
}

function saveBestScore(score, difficultyKey) {
    window.localStorage.setItem(storageKey(difficultyKey), String(score));
    state.bestScore = score;
}

function setStatus(message, kind = "status-neutral") {
    ui.result.textContent = message;
    ui.result.className = `status ${kind}`;
}

function renderRange() {
    const { min, max } = rangeBounds();
    const { label } = currentDifficulty();
    ui.rangeLabel.textContent = `Range: ${min}-${max} (${label})`;
}

function renderStats() {
    ui.attemptCount.textContent = String(state.attempts);
    ui.bestScore.textContent = state.bestScore ? String(state.bestScore) : "-";
    ui.hint.textContent = state.lastHint;
}

function renderHistory() {
    if (!state.history.length) {
        ui.history.innerHTML = '<span class="chip">No guesses yet</span>';
        return;
    }

    ui.history.innerHTML = state.history.map((value) => `<span class="chip">${value}</span>`).join("");
}

function renderSearchZone() {
    if (!ui.zoneRange || !ui.zoneWidth || !ui.zoneWindow) {
        return;
    }

    const { min, max } = rangeBounds();
    const totalValues = max - min + 1;

    state.possibleMin = Math.max(min, Math.min(state.possibleMin, max));
    state.possibleMax = Math.max(state.possibleMin, Math.min(state.possibleMax, max));

    const candidates = state.possibleMax - state.possibleMin + 1;
    const leftPercent = ((state.possibleMin - min) / totalValues) * 100;
    const widthPercent = (candidates / totalValues) * 100;

    ui.zoneRange.textContent = `${state.possibleMin}-${state.possibleMax}`;
    ui.zoneWidth.textContent = `${candidates} candidate${candidates === 1 ? "" : "s"} left`;
    ui.zoneWindow.style.left = `${leftPercent}%`;
    ui.zoneWindow.style.width = `${Math.max(widthPercent, 1)}%`;
    ui.zoneWindow.classList.toggle("zone-window--locked", state.isCompleted);
}

function scoreRound() {
    const { min, max } = rangeBounds();
    const rangeSize = max - min + 1;
    if (state.attempts <= 0) {
        return 0;
    }

    const rawScore = (rangeSize / state.attempts) * 10;
    return Math.max(1, Math.round(rawScore));
}

function hintForGuess(userGuess, targetNumber) {
    const { min, max } = rangeBounds();
    const rangeSize = max - min + 1;
    const difference = Math.abs(userGuess - targetNumber);

    if (difference === 0) {
        return "Signal locked";
    }

    const direction = userGuess < targetNumber ? "low" : "high";
    const closeness = difference / rangeSize;

    if (closeness > 0.5) {
        return `Way too ${direction}`;
    }
    if (closeness > 0.25) {
        return `Too ${direction}`;
    }
    return `Close. Slightly too ${direction}`;
}

function refreshBestScore() {
    state.bestScore = loadBestScore(state.difficultyKey);
}

function tightenSearchZone(userGuess) {
    if (userGuess < state.targetNumber) {
        state.possibleMin = Math.max(state.possibleMin, userGuess + 1);
        return;
    }

    state.possibleMax = Math.min(state.possibleMax, userGuess - 1);
}

function resetRound() {
    const { min, max } = rangeBounds();

    state.targetNumber = randomInRange(min, max);
    state.attempts = 0;
    state.history = [];
    state.lastHint = "-";
    state.possibleMin = min;
    state.possibleMax = max;
    state.isCompleted = false;

    refreshBestScore();
    renderRange();
    setStatus("Awaiting first probe.");

    ui.guessInput.value = "";
    ui.guessInput.focus();

    renderStats();
    renderSearchZone();
    renderHistory();
}

function resolveCorrectGuess() {
    state.isCompleted = true;
    state.lastHint = "Signal locked";
    state.possibleMin = state.targetNumber;
    state.possibleMax = state.targetNumber;

    const score = scoreRound();
    setStatus(`Target located in ${state.attempts} attempts. Score: ${score} pts.`, "status-win");

    if (!state.bestScore || score > state.bestScore) {
        saveBestScore(score, state.difficultyKey);
    }

    playSuccessSound();
}

function resolveIncorrectGuess(userGuess) {
    const hint = hintForGuess(userGuess, state.targetNumber);
    state.lastHint = hint;
    tightenSearchZone(userGuess);
    setStatus(`${hint}. Send another probe.`, "status-neutral");
}

function validateGuess(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) {
        playErrorSound();
        return { isValid: false, message: "Enter a valid whole number." };
    }

    const { min, max } = rangeBounds();
    if (parsed < min || parsed > max) {
        playErrorSound();
        return {
            isValid: false,
            message: `Out of range. Enter a value between ${min} and ${max}.`
        };
    }

    return { isValid: true, guess: parsed };
}

function submitGuess() {
    playClickSound();

    if (state.isCompleted) {
        setStatus("Mission complete. Press Restart mission for a new round.");
        return;
    }

    const validation = validateGuess(ui.guessInput.value);
    if (!validation.isValid) {
        setStatus(validation.message, "status-error");
        return;
    }

    const { guess } = validation;
    state.attempts += 1;
    state.history.push(guess);

    if (guess === state.targetNumber) {
        resolveCorrectGuess();
    } else {
        resolveIncorrectGuess(guess);
    }

    renderStats();
    renderSearchZone();
    renderHistory();
    ui.guessInput.select();
}

function onDifficultyChange() {
    state.difficultyKey = ui.difficultySelect.value;
    resetRound();
}

function bindEvents() {
    ui.guessButton.addEventListener("click", submitGuess);
    ui.resetButton.addEventListener("click", () => {
        playResetSound();
        resetRound();
    });

    ui.guessInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            submitGuess();
        }
    });

    if (ui.difficultySelect) {
        ui.difficultySelect.addEventListener("change", onDifficultyChange);
    }

    if (ui.soundToggle) {
        ui.soundToggle.addEventListener("click", toggleSound);
    }
}

bindEvents();
renderSoundToggle();
resetRound();
