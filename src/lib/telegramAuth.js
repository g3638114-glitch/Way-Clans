import crypto from 'crypto';

export function verifyTelegramInitData(initData, botToken) {
  try {
    if (!initData || !botToken) {
      return null;
    }

    const data = new URLSearchParams(initData);
    const hash = data.get('hash');
    if (!hash) {
      return null;
    }

    data.delete('hash');
    const dataCheckString = Array.from(data.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (computedHash !== hash) {
      return null;
    }

    const authDateRaw = Number(data.get('auth_date'));
    if (!Number.isFinite(authDateRaw)) {
      return null;
    }

    const maxAgeSeconds = 24 * 60 * 60;
    if ((Date.now() / 1000) - authDateRaw > maxAgeSeconds) {
      return null;
    }

    const userStr = data.get('user');
    if (!userStr) {
      return null;
    }

    const user = JSON.parse(userStr);
    return user?.id ? user : null;
  } catch {
    return null;
  }
}
