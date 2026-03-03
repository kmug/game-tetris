(() => {
const WIDTH = 10;
const HEIGHT = 20;
const NEXT_COUNT = 5;

const PIECES = {
  I: [[1, 1, 1, 1]],
  O: [
    [2, 2],
    [2, 2],
  ],
  T: [
    [0, 3, 0],
    [3, 3, 3],
  ],
  S: [
    [0, 4, 4],
    [4, 4, 0],
  ],
  Z: [
    [5, 5, 0],
    [0, 5, 5],
  ],
  J: [
    [6, 0, 0],
    [6, 6, 6],
  ],
  L: [
    [0, 0, 7],
    [7, 7, 7],
  ],
};

const PIECE_KEYS = Object.keys(PIECES);

const JLSTZ_KICKS = {
  "0>1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "1>0": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "1>2": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "2>1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "2>3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "3>2": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "3>0": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "0>3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
};

const I_KICKS = {
  "0>1": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  "1>0": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  "1>2": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  "2>1": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  "2>3": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  "3>2": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  "3>0": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  "0>3": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
};

function createEmptyBoard() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function rotateMatrixCW(matrix) {
  const h = matrix.length;
  const w = matrix[0].length;
  const next = Array.from({ length: w }, () => Array(h).fill(0));

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      next[x][h - 1 - y] = matrix[y][x];
    }
  }

  return next;
}

function shuffledBag(random = Math.random) {
  const bag = PIECE_KEYS.slice();
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  return bag;
}

function pullFromBag(state, random = Math.random) {
  let bag = state.bag;
  if (bag.length === 0) bag = shuffledBag(random);
  const [type, ...rest] = bag;
  return { type, bag: rest };
}

function fillNextQueue(state, random = Math.random) {
  let nextQueue = state.nextQueue.slice();
  let bag = state.bag;

  while (nextQueue.length < NEXT_COUNT) {
    const pulled = pullFromBag({ bag }, random);
    nextQueue.push(pulled.type);
    bag = pulled.bag;
  }

  return { ...state, nextQueue, bag };
}

function makePiece(type) {
  const shape = PIECES[type].map((row) => row.slice());
  const x = Math.floor((WIDTH - shape[0].length) / 2);
  return { type, x, y: 0, shape, rotation: 0 };
}

function canPlace(board, piece, targetX = piece.x, targetY = piece.y, targetShape = piece.shape) {
  for (let y = 0; y < targetShape.length; y += 1) {
    for (let x = 0; x < targetShape[y].length; x += 1) {
      const value = targetShape[y][x];
      if (!value) continue;

      const boardX = targetX + x;
      const boardY = targetY + y;

      if (boardX < 0 || boardX >= WIDTH || boardY < 0 || boardY >= HEIGHT) return false;
      if (board[boardY][boardX] !== 0) return false;
    }
  }

  return true;
}

function mergePiece(board, piece) {
  const next = cloneBoard(board);
  for (let y = 0; y < piece.shape.length; y += 1) {
    for (let x = 0; x < piece.shape[y].length; x += 1) {
      const value = piece.shape[y][x];
      if (!value) continue;
      next[piece.y + y][piece.x + x] = value;
    }
  }
  return next;
}

function clearLines(board) {
  const kept = board.filter((row) => row.some((v) => v === 0));
  const cleared = HEIGHT - kept.length;

  while (kept.length < HEIGHT) {
    kept.unshift(Array(WIDTH).fill(0));
  }

  return { board: kept, cleared };
}

function lineScore(lines) {
  if (lines === 1) return 100;
  if (lines === 2) return 300;
  if (lines === 3) return 500;
  if (lines >= 4) return 800;
  return 0;
}

function spawnPiece(state, random = Math.random, options = {}) {
  const { resetHold = true } = options;
  const ready = fillNextQueue(state, random);
  const [type, ...rest] = ready.nextQueue;
  const nextPiece = makePiece(type);
  const over = !canPlace(ready.board, nextPiece);

  return fillNextQueue(
    {
      ...ready,
      nextQueue: rest,
      active: nextPiece,
      over,
      canHold: resetHold ? true : ready.canHold,
    },
    random
  );
}

function createInitialState(random = Math.random) {
  const base = {
    board: createEmptyBoard(),
    bag: shuffledBag(random),
    nextQueue: [],
    active: null,
    score: 0,
    lines: 0,
    level: 1,
    heldType: null,
    canHold: true,
    over: false,
    paused: false,
  };

  return spawnPiece(base, random);
}

function movePiece(state, dx) {
  if (state.over || state.paused) return state;
  const nextX = state.active.x + dx;
  if (!canPlace(state.board, state.active, nextX, state.active.y)) return state;
  return { ...state, active: { ...state.active, x: nextX } };
}

function rotatePiece(state) {
  if (state.over || state.paused) return state;

  const current = state.active.rotation;
  const nextRotation = (current + 1) % 4;
  const rotated = rotateMatrixCW(state.active.shape);

  if (state.active.type === "O") {
    if (!canPlace(state.board, state.active, state.active.x, state.active.y, rotated)) return state;
    return { ...state, active: { ...state.active, shape: rotated, rotation: nextRotation } };
  }

  const key = `${current}>${nextRotation}`;
  const kickTable = state.active.type === "I" ? I_KICKS : JLSTZ_KICKS;
  const kicks = kickTable[key] || [[0, 0]];

  for (const [dx, dy] of kicks) {
    const nextX = state.active.x + dx;
    const nextY = state.active.y - dy;
    if (!canPlace(state.board, state.active, nextX, nextY, rotated)) continue;

    return {
      ...state,
      active: {
        ...state.active,
        x: nextX,
        y: nextY,
        shape: rotated,
        rotation: nextRotation,
      },
    };
  }

  return state;
}

function lockAndSpawn(state, random = Math.random) {
  const merged = mergePiece(state.board, state.active);
  const cleared = clearLines(merged);
  const totalLines = state.lines + cleared.cleared;
  const level = Math.floor(totalLines / 10) + 1;

  const next = {
    ...state,
    board: cleared.board,
    score: state.score + lineScore(cleared.cleared) * level,
    lines: totalLines,
    level,
  };

  return spawnPiece(next, random);
}

function softDrop(state, random = Math.random) {
  if (state.over || state.paused) return state;
  const nextY = state.active.y + 1;

  if (canPlace(state.board, state.active, state.active.x, nextY)) {
    return {
      ...state,
      active: { ...state.active, y: nextY },
      score: state.score + 1,
    };
  }

  return lockAndSpawn(state, random);
}

function gravityDrop(state, random = Math.random) {
  if (state.over || state.paused) return state;
  const nextY = state.active.y + 1;

  if (canPlace(state.board, state.active, state.active.x, nextY)) {
    return { ...state, active: { ...state.active, y: nextY } };
  }

  return lockAndSpawn(state, random);
}

function hardDrop(state, random = Math.random) {
  if (state.over || state.paused) return state;

  let droppedState = state;
  let distance = 0;

  while (canPlace(droppedState.board, droppedState.active, droppedState.active.x, droppedState.active.y + 1)) {
    droppedState = {
      ...droppedState,
      active: { ...droppedState.active, y: droppedState.active.y + 1 },
    };
    distance += 1;
  }

  return lockAndSpawn({ ...droppedState, score: droppedState.score + distance * 2 }, random);
}

function holdPiece(state, random = Math.random) {
  if (state.over || state.paused || !state.canHold) return state;

  if (state.heldType === null) {
    const spawned = spawnPiece(
      {
        ...state,
        heldType: state.active.type,
      },
      random,
      { resetHold: false }
    );
    return { ...spawned, canHold: false };
  }

  const swapped = makePiece(state.heldType);
  const over = !canPlace(state.board, swapped);

  return {
    ...state,
    active: swapped,
    heldType: state.active.type,
    canHold: false,
    over,
  };
}

function getGhostY(state) {
  let y = state.active.y;
  while (canPlace(state.board, state.active, state.active.x, y + 1)) y += 1;
  return y;
}

function togglePause(state) {
  if (state.over) return state;
  return { ...state, paused: !state.paused };
}

function dropIntervalMs(level) {
  return Math.max(70, 760 - (level - 1) * 55);
}

window.TetrisLogic = {
  HEIGHT,
  WIDTH,
  NEXT_COUNT,
  PIECES,
  canPlace,
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
};
})();
