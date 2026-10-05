'use strict';

function canMerge(a, b) {
  return a === b && a > 0 && Number.isSafeInteger(a * 2);
}

function slide(board, direction) {
  const result = Array(16).fill(0);
  const paths = [];
  let gain = 0;
  for (let line = 0; line < 4; line++) {
    const positions = Array.from({ length: 4 }, (_, i) => {
      if (direction === 'left') return line * 4 + i;
      if (direction === 'right') return line * 4 + 3 - i;
      if (direction === 'up') return i * 4 + line;
      return (3 - i) * 4 + line;
    });
    const filled = positions.filter(index => board[index] !== 0);
    let cursor = 0;
    for (let i = 0; i < filled.length; i++) {
      const sources = [filled[i]];
      let value = board[filled[i]];
      if (i + 1 < filled.length && canMerge(value, board[filled[i + 1]])) {
        sources.push(filled[++i]);
        value *= 2;
        gain += value;
      }
      const to = positions[cursor++];
      result[to] = value;
      paths.push({ to, sources, value });
    }
  }
  return { board: result, gain, paths, changed: result.some((value, i) => value !== board[i]) };
}

function legalMoves(board) {
  return ['left', 'right', 'up', 'down'].some(direction => slide(board, direction).changed);
}

function spawn(board, random = Math.random) {
  const empty = board.map((value, index) => value === 0 ? index : -1).filter(index => index >= 0);
  if (!empty.length) return -1;
  const index = empty[Math.floor(random() * empty.length)];
  board[index] = random() < .9 ? 2 : 4;
  return index;
}

function validState(state) {
  return !!state && state.version === 1 && Array.isArray(state.board) && state.board.length === 16 &&
    state.board.every(value => value === 0 || (Number.isSafeInteger(value) && value >= 2 && value === 2 ** Math.round(Math.log2(value)))) &&
    state.board.filter(Boolean).length >= 2 && Number.isSafeInteger(state.score) && state.score >= 0 &&
    typeof state.progressed === 'boolean' && typeof state.acknowledged === 'boolean' &&
    (!state.acknowledged || state.board.some(value => value >= 2048));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { slide, legalMoves, spawn, validState };
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const boardEl = $('board');
  const layer = $('tiles');
  const overlay = $('overlay');
  const storageKey = 'play2048-state-v1';
  const bestKey = 'play2048-best-v1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let state;
  let best = 0;
  let tileElements = new Map();
  let finishAnimation = null;
  let animationTimer;
  let storageEnabled = true;
  let announcementTimer;

  function storageFailure(message) {
    $('storage-notice').textContent = message;
    $('storage-notice').hidden = false;
  }

  function storage(method, key, value) {
    if (!storageEnabled) return null;
    try {
      return window.localStorage[method](key, value);
    } catch {
      storageEnabled = false;
      storageFailure('Saving is unavailable. You can keep playing, but this session will not be saved.');
      document.querySelector('footer span').textContent = 'This game is running without saving.';
      return null;
    }
  }

  function save() {
    best = Math.max(best, state.score);
    storage('setItem', storageKey, JSON.stringify(state));
    storage('setItem', bestKey, String(best));
  }

  function announce(message) {
    clearTimeout(announcementTimer);
    $('status').textContent = '';
    announcementTimer = setTimeout(() => { $('status').textContent = message; }, 40);
  }

  function wonPending() {
    return !state.acknowledged && state.board.some(value => value >= 2048);
  }

  function updateStatus() {
    $('score').textContent = state.score;
    $('best').textContent = best;
    const pending = wonPending();
    const over = !legalMoves(state.board);
    const wasHidden = overlay.hidden;
    overlay.hidden = !pending && !over;
    $('keep-going').hidden = !pending;
    $('result-title').textContent = pending ? 'You reached 2048!' : 'Game over.';
    $('result-detail').textContent = pending ? 'A little patience goes a long way. Keep going?' : `No moves left. Final score: ${state.score}.`;
    const grid = $('accessible-board');
    grid.replaceChildren();
    for (let row = 0; row < 4; row++) {
      const rowEl = document.createElement('div');
      rowEl.setAttribute('role', 'row');
      for (let col = 0; col < 4; col++) {
        const cell = document.createElement('span');
        cell.setAttribute('role', 'gridcell');
        cell.textContent = state.board[row * 4 + col] || 'Empty';
        rowEl.appendChild(cell);
      }
      grid.appendChild(rowEl);
    }
    if (wasHidden && !overlay.hidden) {
      (pending ? $('keep-going') : $('try-again')).focus({ preventScroll: true });
    }
  }

  function tile(index, value, element, effect = '') {
    const el = element || document.createElement('div');
    el.className = `tile ${effect} ${value > 2048 ? 'super' : ''} ${value >= 1024 ? 'large' : ''} ${value >= 16384 ? 'extra-large' : ''}`;
    el.dataset.value = value;
    el.style.setProperty('--x', index % 4);
    el.style.setProperty('--y', Math.floor(index / 4));
    el.style.transform = '';
    if (!el.firstChild) {
      const face = document.createElement('div');
      face.className = 'tile-face';
      el.appendChild(face);
    }
    el.firstChild.textContent = value;
    return el;
  }

  function flushAnimation() {
    if (finishAnimation) finishAnimation();
  }

  function renderBoard() {
    flushAnimation();
    tileElements = new Map();
    layer.replaceChildren();
    state.board.forEach((value, i) => {
      if (value) {
        const el = tile(i, value);
        tileElements.set(i, el);
        layer.appendChild(el);
      }
    });
    updateStatus();
  }

  function animateMove(result, spawned) {
    const previous = tileElements;
    const step = (layer.clientWidth + parseFloat(getComputedStyle(boardEl).getPropertyValue('--gap'))) / 4;
    for (const path of result.paths) {
      for (const from of path.sources) {
        const el = previous.get(from);
        el.className = 'tile';
        if (state.board[path.to] / path.sources.length > 2048) el.classList.add('super');
        if (Number(el.dataset.value) >= 1024) el.classList.add('large');
        if (Number(el.dataset.value) >= 16384) el.classList.add('extra-large');
        el.style.transform = `translate(${(path.to % 4 - from % 4) * step}px, ${(Math.floor(path.to / 4) - Math.floor(from / 4)) * step}px)`;
      }
    }
    finishAnimation = () => {
      clearTimeout(animationTimer);
      finishAnimation = null;
      const next = new Map();
      for (const path of result.paths) {
        const survivor = previous.get(path.sources[0]);
        // Disable positioning transition while committing the slide's destination.
        survivor.style.transition = 'none';
        tile(path.to, path.value, survivor, path.sources.length === 2 ? 'merge' : '');
        next.set(path.to, survivor);
      }
      if (spawned >= 0) next.set(spawned, tile(spawned, state.board[spawned], null, 'spawn'));
      layer.replaceChildren(...next.values());
      tileElements = next;
      void layer.offsetWidth;
      for (const el of next.values()) el.style.transition = '';
    };
    if (reducedMotion.matches) finishAnimation();
    else animationTimer = setTimeout(finishAnimation, 125);
  }

  function move(direction) {
    if (!overlay.hidden) return;
    flushAnimation();
    const result = slide(state.board, direction);
    if (!result.changed) return;
    state.board = result.board;
    state.score += result.gain;
    state.progressed = true;
    const spawned = spawn(state.board);
    save();
    animateMove(result, spawned);
    updateStatus();
    const outcome = wonPending() ? 'You reached 2048. Keep going or try again.' : !legalMoves(state.board) ? 'Game over.' : `Moved ${direction}.`;
    announce(`${outcome} Score ${state.score}.${result.gain ? ` Gained ${result.gain}.` : ''}`);
  }

  function newGame(force = false) {
    if (!force && state.progressed && legalMoves(state.board) && !wonPending() &&
        !window.confirm('Start a new game? Your current progress will be lost.')) return;
    flushAnimation();
    state = { version: 1, board: Array(16).fill(0), score: 0, progressed: false, acknowledged: false };
    spawn(state.board);
    spawn(state.board);
    save();
    renderBoard();
    announce('New game. Two tiles on the board.');
  }

  const savedBest = Number(storage('getItem', bestKey));
  if (Number.isSafeInteger(savedBest) && savedBest >= 0) best = savedBest;
  const saved = storage('getItem', storageKey);
  try {
    const restored = JSON.parse(saved);
    if (validState(restored)) state = restored;
    else if (saved) storageFailure('Your saved game could not be restored. A fresh board is ready.');
  } catch {
    storageFailure('Your saved game could not be restored. A fresh board is ready.');
  }
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    boardEl.querySelector('.cells').appendChild(cell);
  }
  if (state) {
    save();
    renderBoard();
    announce(`Game restored. Score ${state.score}.`);
  } else newGame(true);

  $('new-game').addEventListener('click', () => { newGame(); });
  $('try-again').addEventListener('click', () => { newGame(true); boardEl.focus(); });
  $('keep-going').addEventListener('click', () => {
    state.acknowledged = true;
    save();
    updateStatus();
    (overlay.hidden ? boardEl : $('try-again')).focus();
    announce(overlay.hidden ? 'Keep going. Your board is unchanged.' : `Game over. Final score ${state.score}.`);
  });
  const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))) return;
    const direction = keys[event.key] || keys[event.key.toLowerCase()];
    if (!direction || !overlay.hidden) return;
    event.preventDefault();
    move(direction);
  });
  let pointerStart = null;
  boardEl.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || !overlay.hidden) return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    boardEl.setPointerCapture(event.pointerId);
    boardEl.focus({ preventScroll: true });
  });
  boardEl.addEventListener('pointerup', event => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
  });
  boardEl.addEventListener('pointercancel', () => { pointerStart = null; });
  window.addEventListener('resize', flushAnimation);
  reducedMotion.addEventListener('change', flushAnimation);
}
