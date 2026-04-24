import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { verifyTelegramInitData } from '../src/lib/telegramAuth.js';

function buildSignedInitData(user, botToken, authDate = Math.floor(Date.now() / 1000)) {
  const data = new URLSearchParams();
  data.set('auth_date', String(authDate));
  data.set('query_id', 'AAHdF6IQAAAAAN0XohDhrOrc');
  data.set('user', JSON.stringify(user));

  const dataCheckString = Array.from(data.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  data.set('hash', hash);
  return data.toString();
}

test('verifyTelegramInitData accepts valid signed payload', () => {
  const botToken = '123456:TEST_TOKEN';
  const user = { id: 12345, username: 'tester', first_name: 'Test' };
  const initData = buildSignedInitData(user, botToken);

  const verifiedUser = verifyTelegramInitData(initData, botToken);
  assert.equal(verifiedUser.id, user.id);
  assert.equal(verifiedUser.username, user.username);
});

test('verifyTelegramInitData rejects tampered payload', () => {
  const botToken = '123456:TEST_TOKEN';
  const user = { id: 12345, username: 'tester', first_name: 'Test' };
  const validInitData = buildSignedInitData(user, botToken);
  const tampered = validInitData.replace('tester', 'hacker');

  assert.equal(verifyTelegramInitData(tampered, botToken), null);
});

test('verifyTelegramInitData rejects expired payload', () => {
  const botToken = '123456:TEST_TOKEN';
  const user = { id: 12345, username: 'tester', first_name: 'Test' };
  const expiredAuthDate = Math.floor(Date.now() / 1000) - (25 * 60 * 60);
  const initData = buildSignedInitData(user, botToken, expiredAuthDate);

  assert.equal(verifyTelegramInitData(initData, botToken), null);
});
