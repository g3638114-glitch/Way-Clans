import { verifyTelegramInitData } from '../lib/telegramAuth.js';

function getInitDataFromRequest(req) {
  const headerValue = req.headers['x-telegram-init-data'];
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  const bodyValue = req.body?.initData;
  if (typeof bodyValue === 'string' && bodyValue.trim()) {
    return bodyValue.trim();
  }

  return null;
}

export function requireTelegramAuth(req, res, next) {
  const initData = getInitDataFromRequest(req);
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData || !botToken) {
    return res.status(401).json({ error: 'Telegram authentication required' });
  }

  const verifiedUser = verifyTelegramInitData(initData, botToken);
  if (!verifiedUser) {
    return res.status(401).json({ error: 'Invalid Telegram authentication data' });
  }

  const routeUserId = Number(req.params.userId);
  if (Number.isFinite(routeUserId) && routeUserId > 0 && routeUserId !== Number(verifiedUser.id)) {
    return res.status(403).json({ error: 'User mismatch' });
  }

  req.telegramUser = verifiedUser;
  return next();
}
