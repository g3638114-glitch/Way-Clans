import test from 'node:test';
import assert from 'node:assert/strict';

import { getResourceIconPath, getResourceLabel, getResourceMeta } from '../public/js/utils/resourceIcons.js';

test('resource meta resolves aliases consistently', () => {
  assert.equal(getResourceMeta('jamcoin').key, 'gold');
  assert.equal(getResourceMeta('jabcoin').key, 'jabcoins');
});

test('resource helper returns correct labels and paths', () => {
  assert.equal(getResourceLabel('wood'), 'Дерево');
  assert.equal(getResourceIconPath('stone'), '/resources/Stone.png');
});
