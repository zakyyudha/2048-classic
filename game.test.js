'use strict';
const assert = require('node:assert/strict');
const { slide, legalMoves, spawn, validState } = require('./game.js');
const board = row => [...row, ...Array(12).fill(0)];

assert.deepEqual(slide(board([2, 2, 2, 2]), 'left').board.slice(0, 4), [4, 4, 0, 0]);
assert.equal(slide(board([2, 2, 2, 2]), 'left').gain, 8);
assert.deepEqual(slide(board([2, 2, 4, 0]), 'left').board.slice(0, 4), [4, 4, 0, 0]);
assert.deepEqual(slide(board([2, 2, 4, 0]), 'right').board.slice(0, 4), [0, 0, 4, 4]);
const vertical = [2, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0];
assert.deepEqual(slide(vertical, 'up').board.filter((_, i) => i % 4 === 0), [4, 8, 0, 0]);
assert.deepEqual(slide(vertical, 'down').board.filter((_, i) => i % 4 === 0), [0, 0, 4, 8]);
assert.equal(slide(board([2, 4, 8, 16]), 'left').changed, false);
assert.deepEqual(slide(board([2, 2, 0, 0]), 'left').paths[0], { to: 0, sources: [0, 1], value: 4 });
assert.equal(slide(board([1024, 1024, 0, 0]), 'left').board[0], 2048);
const blocked = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
assert.equal(legalMoves(blocked), false);
assert.equal(legalMoves(blocked.map((value, i) => i === 15 ? 4 : value)), true);
assert.equal(spawn([...blocked]), -1);
for (const [random, expected] of [[.89, 2], [.9, 4]]) {
  const b = Array(16).fill(0);
  const index = spawn(b, () => random);
  assert.equal(b[index], expected);
  assert.equal(b.filter(Boolean).length, 1);
}
const state = { version: 1, board: board([2, 2, 0, 0]), score: 0, progressed: false, acknowledged: false };
assert.equal(validState(state), true);
for (const bad of [null, {}, { ...state, score: -1 }, { ...state, board: board([3, 2, 0, 0]) }, { ...state, progressed: 'true' }, { ...state, acknowledged: true }, { ...state, board: board([Infinity, 2, 0, 0]) }]) {
  assert.equal(validState(bad), false);
}

for (let i = 0; i < 1000; i++) {
  const b = Array.from({ length: 16 }, () => Math.random() < .3 ? 0 : 2 ** (1 + Math.floor(Math.random() * 10)));
  const before = [...b];
  for (const direction of ['left', 'right', 'up', 'down']) {
    const result = slide(b, direction);
    assert.equal(result.board.reduce((a, n) => a + n), b.reduce((a, n) => a + n));
    assert.deepEqual(b, before);
    assert.equal(result.changed, result.board.some((value, index) => value !== b[index]));
    assert.equal(result.paths.flatMap(path => path.sources).length, b.filter(Boolean).length);
  }
}
console.log('PASS: four directions, merge-once, scores, win/loss, spawn, restore validation, and 4,000 invariant checks.');
