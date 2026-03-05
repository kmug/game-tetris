const {
  HEIGHT,
  WIDTH,
  PIECES,
  createInitialState,
  dropIntervalMs,
  getGhostY,
  gravityDrop,
  hardDrop,
  holdPiece,
  movePiece,
  rotatePiece,
  softDrop,
  togglePause,
} = window.TetrisLogic;

const COLORS = {
  0: "#f7f7f7",
  1: "#2a9d8f",
  2: "#e9c46a",
  3: "#457b9d",
  4: "#8ac926",
  5: "#e76f51",
  6: "#577590",
  7: "#f4a261",
};

const INPUT_REPEAT = {
  dasMs: 150,
  arrMs: 45,
};
const MASTER_SFX_GAIN = 1.6;

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const linesEl = document.querySelector("#lines");
const levelEl = document.querySelector("#level");
const statusEl = document.querySelector("#status");
const restartBtn = document.querySelector("#restart");
const pauseBtn = document.querySelector("#pause");
const soundBtn = document.querySelector("#sound-toggle");
const nextEls = Array.from(document.querySelectorAll("[data-next-index]"));
const holdEl = document.querySelector("[data-hold-piece]");
const touchEl = document.querySelector(".touch");
const touchButtons = Array.from(document.querySelectorAll(".touch-dock [data-action]"));
const utilityButtons = [restartBtn, pauseBtn, soundBtn];

const CELL = canvas.width / WIDTH;

let state = createInitialState();
let accumulator = 0;
let lastTime = 0;
let rafId = 0;
let soundEnabled = true;
let audioContext = null;
let masterGainNode = null;
let audioUnlocked = false;
let audioReady = false;
const sfxLastPlayedAt = {};

const keyState = {
  left: false,
  right: false,
  down: false,
  leftTimer: 0,
  rightTimer: 0,
};
const pointerActionMap = new Map();

function getAudioContext() {
  if (!soundEnabled) return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  if (!audioContext) {
    audioContext = new Ctx();
    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = 1;
    masterGainNode.connect(audioContext.destination);
  }

  return audioContext;
}

function unlockAudio() {
  const ac = getAudioContext();
  if (!ac) return;
  if (audioUnlocked && ac.state === "running" && audioReady) return;

  const resumePromise =
    ac.state === "suspended" || ac.state === "interrupted" ? ac.resume() : Promise.resolve();

  resumePromise
    .then(() => {
      audioReady = ac.state === "running";
      const buffer = ac.createBuffer(1, 1, 22050);
      const source = ac.createBufferSource();
      source.buffer = buffer;
      source.connect(masterGainNode || ac.destination);
      source.start(0);
      audioUnlocked = true;
      audioReady = true;
    })
    .catch(() => {});
}

function ensureAudioRunning() {
  const ac = getAudioContext();
  if (!ac) return false;
  if (ac.state === "running" && audioReady) return true;
  unlockAudio();
  return ac.state === "running" && audioReady;
}

function playTone({ frequency, duration = 0.08, type = "square", gain = 0.03, slideTo = null }) {
  const ac = getAudioContext();
  if (!ac) return;
  if (!ensureAudioRunning()) return;

  try {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    const start = ac.currentTime;
    const end = start + duration;

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, end);

    const boostedGain = Math.min(0.12, gain * MASTER_SFX_GAIN);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(boostedGain, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(amp);
    amp.connect(masterGainNode || ac.destination);
    osc.start(start);
    osc.stop(end + 0.01);
  } catch (_error) {
    // On Safari this can fail intermittently during context recovery.
  }
}

function playSfx(type, meta = {}) {
  if (!soundEnabled) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const minGapByType = {
    move: 42,
    down: 32,
    lock: 55,
  };
  const minGap = minGapByType[type] || 0;
  if (minGap > 0) {
    const last = sfxLastPlayedAt[type] || 0;
    if (now - last < minGap) return;
    sfxLastPlayedAt[type] = now;
  }

  if (type === "move") playTone({ frequency: 245, duration: 0.03, type: "square", gain: 0.018 });
  if (type === "down") playTone({ frequency: 200, duration: 0.035, type: "square", gain: 0.015 });
  if (type === "rotate") playTone({ frequency: 410, duration: 0.05, type: "triangle", gain: 0.022 });
  if (type === "drop") playTone({ frequency: 165, duration: 0.11, type: "sawtooth", gain: 0.028, slideTo: 95 });
  if (type === "hold") playTone({ frequency: 330, duration: 0.05, type: "triangle", gain: 0.02 });
  if (type === "lock") playTone({ frequency: 130, duration: 0.055, type: "square", gain: 0.016 });
  if (type === "pause") playTone({ frequency: 290, duration: 0.06, type: "triangle", gain: 0.02 });
  if (type === "resume") playTone({ frequency: 350, duration: 0.06, type: "triangle", gain: 0.02 });
  if (type === "restart") {
    playTone({ frequency: 210, duration: 0.045, type: "square", gain: 0.018 });
    window.setTimeout(() => playTone({ frequency: 280, duration: 0.05, type: "square", gain: 0.02 }), 45);
  }
  if (type === "line") {
    const lines = meta.lines || 1;
    const base = lines >= 4 ? 560 : 430;
    const gain = lines >= 4 ? 0.03 : 0.022;
    playTone({ frequency: base, duration: 0.06, type: "triangle", gain });
    window.setTimeout(() => playTone({ frequency: base + 140, duration: 0.08, type: "triangle", gain }), 55);
  }
  if (type === "gameover") {
    playTone({ frequency: 220, duration: 0.12, type: "sawtooth", gain: 0.025, slideTo: 130 });
    window.setTimeout(() => playTone({ frequency: 130, duration: 0.18, type: "sawtooth", gain: 0.022, slideTo: 80 }), 95);
  }
}

function detectAndPlayTransitionSound(prev, next, action) {
  if (!prev.over && next.over) {
    playSfx("gameover");
    return;
  }

  if (next.lines > prev.lines) {
    playSfx("line", { lines: next.lines - prev.lines });
    return;
  }

  if (action === "pause" && prev.paused !== next.paused) {
    playSfx(next.paused ? "pause" : "resume");
    return;
  }

  if (action === "restart") {
    playSfx("restart");
    return;
  }

  if (action === "rotate") {
    if (prev.active.rotation !== next.active.rotation || prev.active.x !== next.active.x) playSfx("rotate");
    return;
  }

  if (action === "left" || action === "right") {
    if (prev.active.x !== next.active.x) playSfx("move");
    return;
  }

  if (action === "down") {
    if (next.active.y > prev.active.y) playSfx("down");
    return;
  }

  if (action === "drop") {
    playSfx("drop");
    return;
  }

  if (action === "hold") {
    if (prev.active.type !== next.active.type || prev.heldType !== next.heldType) playSfx("hold");
    return;
  }

  if (action === "tick") {
    if (!next.over && next.active.y < prev.active.y) playSfx("lock");
  }
}

function applyNextState(next, action) {
  const prev = state;
  state = next;
  detectAndPlayTransitionSound(prev, next, action);
}

function statusText() {
  if (state.over) return "Game over";
  if (state.paused) return "Paused";
  return "Running";
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function drawRoundedRect(x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCell(x, y, value, options = {}) {
  const px = x * CELL;
  const py = y * CELL;

  if (value === 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(px, py, CELL, CELL);
    ctx.strokeStyle = "rgba(208, 220, 240, 0.26)";
    ctx.strokeRect(px, py, CELL, CELL);
    return;
  }

  const color = COLORS[value] || "#999999";
  const isGhost = Boolean(options.ghost);
  const isActive = Boolean(options.active);
  const ghostColor = "#a6adbb";
  const renderColor = isGhost ? ghostColor : color;
  const padding = CELL * 0.08;
  const blockX = px + padding;
  const blockY = py + padding;
  const blockW = CELL - padding * 2;
  const blockH = CELL - padding * 2;
  const radius = Math.max(2, blockW * 0.22);
  const baseAlpha = isGhost ? 0.36 : isActive ? 0.58 : 0.44;

  if (isGhost) {
    const ghostGrad = ctx.createLinearGradient(blockX, blockY, blockX + blockW, blockY + blockH);
    ghostGrad.addColorStop(0, rgba(renderColor, Math.min(0.72, baseAlpha + 0.2)));
    ghostGrad.addColorStop(0.5, rgba(renderColor, Math.min(0.58, baseAlpha + 0.08)));
    ghostGrad.addColorStop(1, rgba(renderColor, baseAlpha));
    drawRoundedRect(blockX, blockY, blockW, blockH, radius);
    ctx.fillStyle = ghostGrad;
    ctx.fill();
    drawRoundedRect(blockX, blockY, blockW, blockH, radius);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    return;
  }

  const mainGrad = ctx.createLinearGradient(blockX, blockY, blockX + blockW, blockY + blockH);
  mainGrad.addColorStop(0, rgba(renderColor, Math.min(0.72, baseAlpha + 0.2)));
  mainGrad.addColorStop(0.5, rgba(renderColor, Math.min(0.58, baseAlpha + 0.08)));
  mainGrad.addColorStop(1, rgba(renderColor, baseAlpha));
  drawRoundedRect(blockX, blockY, blockW, blockH, radius);
  ctx.fillStyle = mainGrad;
  ctx.fill();

  const topGloss = ctx.createLinearGradient(blockX, blockY, blockX, blockY + blockH * 0.36);
  topGloss.addColorStop(0, "rgba(255, 255, 255, 0.55)");
  topGloss.addColorStop(1, "rgba(255, 255, 255, 0.02)");
  drawRoundedRect(blockX + 1, blockY + 1, Math.max(0, blockW - 2), blockH * 0.36, radius * 0.7);
  ctx.fillStyle = topGloss;
  ctx.fill();

  const bottomShade = ctx.createLinearGradient(blockX, blockY + blockH * 0.45, blockX, blockY + blockH);
  bottomShade.addColorStop(0, "rgba(0, 0, 0, 0)");
  bottomShade.addColorStop(1, "rgba(20, 30, 60, 0.14)");
  drawRoundedRect(blockX + 1, blockY + 1, Math.max(0, blockW - 2), Math.max(0, blockH - 2), radius * 0.85);
  ctx.fillStyle = bottomShade;
  ctx.fill();

  drawRoundedRect(blockX, blockY, blockW, blockH, radius);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGhost() {
  const ghostY = getGhostY(state);
  const active = state.active;
  if (ghostY === active.y) return;

  for (let y = 0; y < active.shape.length; y += 1) {
    for (let x = 0; x < active.shape[y].length; x += 1) {
      const value = active.shape[y][x];
      if (!value) continue;
      drawCell(active.x + x, ghostY + y, value, { ghost: true });
    }
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f4f7ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      drawCell(x, y, state.board[y][x]);
    }
  }

  drawGhost();

  const active = state.active;
  for (let y = 0; y < active.shape.length; y += 1) {
    for (let x = 0; x < active.shape[y].length; x += 1) {
      const value = active.shape[y][x];
      if (!value) continue;
      drawCell(active.x + x, active.y + y, value, { active: true });
    }
  }
}

function shapeToPreviewGrid(shape) {
  const grid = Array.from({ length: 4 }, () => Array(4).fill(0));
  const shapeHeight = shape.length;
  const shapeWidth = shape[0].length;
  const offsetY = Math.floor((4 - shapeHeight) / 2);
  const offsetX = Math.floor((4 - shapeWidth) / 2);

  for (let y = 0; y < shapeHeight; y += 1) {
    for (let x = 0; x < shapeWidth; x += 1) {
      grid[offsetY + y][offsetX + x] = shape[y][x];
    }
  }

  return grid;
}

function renderGridToPanel(element, grid) {
  element.textContent = "";
  const fragment = document.createDocumentFragment();
  const pieceGrid = document.createElement("div");
  pieceGrid.className = "piece-grid";

  for (const row of grid) {
    for (const value of row) {
      const cell = document.createElement("span");
      cell.className = `next-cell${value ? ` fill-${value}` : ""}`;
      pieceGrid.append(cell);
    }
  }

  fragment.append(pieceGrid);
  element.append(fragment);
}

function renderNextPanel() {
  for (const el of nextEls) {
    const index = Number(el.dataset.nextIndex);
    const pieceType = state.nextQueue[index];
    if (!pieceType) {
      el.textContent = "";
      continue;
    }

    renderGridToPanel(el, shapeToPreviewGrid(PIECES[pieceType]));
  }
}

function renderPieceToPanel(element, pieceType) {
  if (!pieceType) {
    element.textContent = "";
    return;
  }

  renderGridToPanel(element, shapeToPreviewGrid(PIECES[pieceType]));
}

function updateTouchButtonLabels(isCoarse) {
  const iconMap = {
    rotate: "rotate_right",
    drop: "keyboard_double_arrow_down",
    hold: "back_hand",
    left: "arrow_back",
    down: "arrow_downward",
    right: "arrow_forward",
  };
  const labelMap = {
    rotate: "Rotate",
    drop: "Drop",
    hold: "Hold",
    left: "Left",
    down: "Down",
    right: "Right",
  };

  for (const button of touchButtons) {
    const action = button.dataset.action;
    if (!action) continue;
    setButtonLabel(button, labelMap[action], iconMap[action], isCoarse);
  }
}

function setButtonLabel(button, label, iconName, useIconOnly) {
  button.title = label;
  button.setAttribute("aria-label", label);
  button.classList.toggle("icon-only", useIconOnly);
  if (useIconOnly) {
    button.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${iconName}</span>`;
    return;
  }
  button.textContent = label;
}

function updateUtilityButtonLabels(isCoarse) {
  const utilityLabel = {
    restart: "Restart",
    pause: state.paused ? "Resume" : "Pause",
    sound: soundEnabled ? "Sound on" : "Sound off",
  };
  const utilityIcon = {
    restart: "restart_alt",
    pause: state.paused ? "play_arrow" : "pause",
    sound: soundEnabled ? "volume_up" : "volume_off",
  };

  setButtonLabel(restartBtn, utilityLabel.restart, utilityIcon.restart, isCoarse);
  setButtonLabel(pauseBtn, utilityLabel.pause, utilityIcon.pause, isCoarse);
  setButtonLabel(soundBtn, utilityLabel.sound, utilityIcon.sound, isCoarse);
}

function render() {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  drawBoard();
  renderNextPanel();
  renderPieceToPanel(holdEl, state.heldType);
  holdEl.style.opacity = state.canHold ? "1" : "0.55";
  scoreEl.textContent = String(state.score);
  linesEl.textContent = String(state.lines);
  levelEl.textContent = String(state.level);
  statusEl.textContent = statusText();
  for (const button of utilityButtons) button.classList.remove("icon-only");
  updateTouchButtonLabels(isCoarse);
  updateUtilityButtonLabels(isCoarse);
}

function processHorizontalRepeat(dt) {
  const holdLeft = keyState.left && !keyState.right;
  const holdRight = keyState.right && !keyState.left;

  if (holdLeft) {
    keyState.leftTimer += dt;
    if (keyState.leftTimer >= INPUT_REPEAT.dasMs) {
      const elapsed = keyState.leftTimer - INPUT_REPEAT.dasMs;
      const repeats = Math.floor(elapsed / INPUT_REPEAT.arrMs);
      for (let i = 0; i <= repeats; i += 1) applyNextState(movePiece(state, -1), "left");
      keyState.leftTimer = INPUT_REPEAT.dasMs + (elapsed % INPUT_REPEAT.arrMs);
    }
  } else {
    keyState.leftTimer = 0;
  }

  if (holdRight) {
    keyState.rightTimer += dt;
    if (keyState.rightTimer >= INPUT_REPEAT.dasMs) {
      const elapsed = keyState.rightTimer - INPUT_REPEAT.dasMs;
      const repeats = Math.floor(elapsed / INPUT_REPEAT.arrMs);
      for (let i = 0; i <= repeats; i += 1) applyNextState(movePiece(state, 1), "right");
      keyState.rightTimer = INPUT_REPEAT.dasMs + (elapsed % INPUT_REPEAT.arrMs);
    }
  } else {
    keyState.rightTimer = 0;
  }

  if (keyState.down) applyNextState(softDrop(state), "down");
}

function update(ms) {
  if (state.over || state.paused) return;

  processHorizontalRepeat(ms);

  accumulator += ms;
  const tick = dropIntervalMs(state.level);

  while (accumulator >= tick) {
    accumulator -= tick;
    applyNextState(gravityDrop(state), "tick");
    if (state.over) break;
  }
}

function frame(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  update(delta);
  render();

  rafId = requestAnimationFrame(frame);
}

function resetInputState() {
  keyState.left = false;
  keyState.right = false;
  keyState.down = false;
  keyState.leftTimer = 0;
  keyState.rightTimer = 0;
}

function restart() {
  resetInputState();
  applyNextState(createInitialState(), "restart");
  accumulator = 0;
  render();
}

function doAction(action) {
  if (action === "left") applyNextState(movePiece(state, -1), action);
  if (action === "right") applyNextState(movePiece(state, 1), action);
  if (action === "down") applyNextState(softDrop(state), action);
  if (action === "rotate") applyNextState(rotatePiece(state), action);
  if (action === "drop") applyNextState(hardDrop(state), action);
  if (action === "hold") applyNextState(holdPiece(state), action);
  if (action === "pause") applyNextState(togglePause(state), action);
  if (action === "restart") restart();
  render();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    const ac = getAudioContext();
    if (ac && ac.state === "suspended") ac.resume();
    playTone({ frequency: 340, duration: 0.05, type: "triangle", gain: 0.02 });
  }
  render();
}

function primeAudio() {
  ensureAudioRunning();
}

function onPressAction(action) {
  primeAudio();

  if (action === "left") {
    doAction("left");
    keyState.left = true;
    keyState.leftTimer = 0;
    return;
  }

  if (action === "right") {
    doAction("right");
    keyState.right = true;
    keyState.rightTimer = 0;
    return;
  }

  if (action === "down") {
    doAction("down");
    keyState.down = true;
    return;
  }

  doAction(action);
}

function onReleaseAction(action) {
  if (action === "left") {
    keyState.left = false;
    keyState.leftTimer = 0;
  }
  if (action === "right") {
    keyState.right = false;
    keyState.rightTimer = 0;
  }
  if (action === "down") keyState.down = false;
}

document.addEventListener("keydown", (event) => {
  if (event.repeat) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    onPressAction("left");
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    onPressAction("right");
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    onPressAction("down");
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    onPressAction("rotate");
  }
  if (event.key === " ") {
    event.preventDefault();
    onPressAction("drop");
  }
  if (event.key.toLowerCase() === "p") {
    event.preventDefault();
    onPressAction("pause");
  }
  if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    onPressAction("restart");
  }
  if (event.key.toLowerCase() === "m") {
    event.preventDefault();
    primeAudio();
    toggleSound();
  }
  if (event.key.toLowerCase() === "c" || event.key === "Shift") {
    event.preventDefault();
    onPressAction("hold");
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") onReleaseAction("left");
  if (event.key === "ArrowRight") onReleaseAction("right");
  if (event.key === "ArrowDown") onReleaseAction("down");
});

restartBtn.addEventListener("click", () => onPressAction("restart"));
pauseBtn.addEventListener("click", () => onPressAction("pause"));
soundBtn.addEventListener("click", () => {
  primeAudio();
  toggleSound();
});

function touchActionFromElement(target) {
  if (!(target instanceof HTMLElement)) return null;
  return target.dataset.action || null;
}

touchEl.addEventListener("pointerdown", (event) => {
  const action = touchActionFromElement(event.target);
  if (!action) return;
  event.preventDefault();
  pointerActionMap.set(event.pointerId, action);
  onPressAction(action);
});

touchEl.addEventListener("pointerup", (event) => {
  const action = pointerActionMap.get(event.pointerId) || touchActionFromElement(event.target);
  if (!action) return;
  event.preventDefault();
  pointerActionMap.delete(event.pointerId);
  onReleaseAction(action);
});

touchEl.addEventListener("pointercancel", (event) => {
  const action = pointerActionMap.get(event.pointerId) || touchActionFromElement(event.target);
  if (!action) return;
  pointerActionMap.delete(event.pointerId);
  onReleaseAction(action);
});

window.addEventListener("pointerup", (event) => {
  const action = pointerActionMap.get(event.pointerId);
  if (!action) return;
  pointerActionMap.delete(event.pointerId);
  onReleaseAction(action);
});

window.render_game_to_text = () =>
  JSON.stringify({
    coordinateSystem: "origin=(0,0) top-left; +x right; +y down",
    boardSize: { width: WIDTH, height: HEIGHT },
    active: {
      type: state.active.type,
      x: state.active.x,
      y: state.active.y,
      rotation: state.active.rotation,
      shape: state.active.shape,
    },
    ghostY: getGhostY(state),
    nextQueue: state.nextQueue,
    heldType: state.heldType,
    canHold: state.canHold,
    lockedCells: state.board
      .flatMap((row, y) => row.map((v, x) => (v ? { x, y, v } : null)))
      .filter(Boolean),
    score: state.score,
    lines: state.lines,
    level: state.level,
    paused: state.paused,
    over: state.over,
    soundEnabled,
    input: {
      leftHold: keyState.left,
      rightHold: keyState.right,
      downHold: keyState.down,
    },
  });

window.advanceTime = (ms) => {
  const chunk = 16;
  let rest = ms;
  while (rest > 0) {
    const dt = Math.min(chunk, rest);
    update(dt);
    rest -= dt;
  }
  render();
};

render();
rafId = requestAnimationFrame(frame);

window.addEventListener("blur", resetInputState);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    ensureAudioRunning();
  }
});
["touchstart", "pointerdown", "mousedown", "keydown"].forEach((eventName) => {
  window.addEventListener(eventName, primeAudio, { once: true });
});
window.addEventListener("beforeunload", () => {
  if (rafId) cancelAnimationFrame(rafId);
});
