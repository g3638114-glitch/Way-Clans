import test from 'node:test';
import assert from 'node:assert/strict';

import { formatDurationMs } from '../public/js/utils/formatters.js';

test('formatDurationMs formats minutes only', () => {
  assert.equal(formatDurationMs(10 * 60 * 1000), '10м');
});

test('formatDurationMs formats hours and minutes', () => {
  assert.equal(formatDurationMs((2 * 60 + 15) * 60 * 1000), '2ч 15м');
});

test('formatDurationMs handles non-positive values', () => {
  assert.equal(formatDurationMs(0), '0м');
});
