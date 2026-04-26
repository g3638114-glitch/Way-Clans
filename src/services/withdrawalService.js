import { withTransaction } from '../database/pg.js';

export const WITHDRAWAL_METHODS = {
  card: {
    label: 'Карта',
    minAmount: 1,
  },
  sbp: {
    label: 'СБП',
    minAmount: 1,
  },
  usdt_trc20: {
    label: 'USDT TRC20',
    minAmount: 100,
  },
};

export async function createWithdrawalRequest(userId, { method, amountJabcoins, destination, bank }) {
  const normalizedMethod = String(method || '').trim();
  const methodConfig = WITHDRAWAL_METHODS[normalizedMethod];
  if (!methodConfig) {
    throw new Error('Неверный способ вывода');
  }

  const amount = Math.floor(Number(amountJabcoins || 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Введите корректную сумму вывода');
  }
  if (amount < methodConfig.minAmount) {
    throw new Error(`Минимальная сумма для ${methodConfig.label}: ${methodConfig.minAmount} Jabcoin`);
  }

  const normalizedDestination = normalizeDestination(normalizedMethod, destination, bank);
  const maskedDestination = maskDestination(normalizedMethod, normalizedDestination);

  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    if (Number(user.jabcoins || 0) < amount) {
      throw new Error('Недостаточно Jabcoin для вывода');
    }

    const updatedUserResult = await client.query(
      `UPDATE users
       SET jabcoins = $1
       WHERE id = $2
       RETURNING *`,
      [Number(user.jabcoins || 0) - amount, user.id]
    );

    const withdrawalResult = await client.query(
      `INSERT INTO withdrawals (
         user_id,
         telegram_id,
         amount_jabcoins,
         amount_rub,
         method,
         destination_raw,
         destination_masked,
         status,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
       RETURNING *`,
      [user.id, Number(user.telegram_id), amount, amount, normalizedMethod, normalizedDestination, maskedDestination]
    );

    return {
      success: true,
      user: updatedUserResult.rows[0],
      withdrawal: mapWithdrawal(withdrawalResult.rows[0], { includeRaw: true }),
    };
  });
}

export async function getWithdrawalHistory(userId) {
  const result = await withTransaction(async (client) => {
    const userResult = await client.query('SELECT id FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');

    const historyResult = await client.query(
      `SELECT * FROM withdrawals
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userResult.rows[0].id]
    );

    return historyResult.rows.map(mapWithdrawal);
  });

  return { withdrawals: result };
}

export async function completeWithdrawal(withdrawalId, adminActor) {
  return withTransaction(async (client) => {
    const withdrawalResult = await client.query('SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE', [withdrawalId]);
    if (withdrawalResult.rows.length === 0) throw new Error('Заявка не найдена');

    const row = withdrawalResult.rows[0];
    if (row.status !== 'pending') {
      return { ok: false, reason: 'already_processed', withdrawal: mapWithdrawal(row) };
    }

    const updatedResult = await client.query(
      `UPDATE withdrawals
       SET status = 'completed',
           admin_actor_telegram_id = $1,
           admin_actor_name = $2,
           processed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [adminActor.telegramId || null, adminActor.name || null, withdrawalId]
    );

    return { ok: true, withdrawal: mapWithdrawal(updatedResult.rows[0]) };
  });
}

export async function rejectWithdrawal(withdrawalId, adminActor) {
  return withTransaction(async (client) => {
    const withdrawalResult = await client.query('SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE', [withdrawalId]);
    if (withdrawalResult.rows.length === 0) throw new Error('Заявка не найдена');

    const row = withdrawalResult.rows[0];
    if (row.status !== 'pending') {
      return { ok: false, reason: 'already_processed', withdrawal: mapWithdrawal(row) };
    }

    const userResult = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [row.user_id]);
    if (userResult.rows.length === 0) throw new Error('Пользователь не найден');
    const user = userResult.rows[0];

    const updatedUserResult = await client.query(
      `UPDATE users
       SET jabcoins = $1
       WHERE id = $2
       RETURNING *`,
      [Number(user.jabcoins || 0) + Number(row.amount_jabcoins || 0), user.id]
    );

    const updatedResult = await client.query(
      `UPDATE withdrawals
       SET status = 'refunded',
           admin_actor_telegram_id = $1,
           admin_actor_name = $2,
           processed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [adminActor.telegramId || null, adminActor.name || null, withdrawalId]
    );

    return {
      ok: true,
      user: updatedUserResult.rows[0],
      withdrawal: mapWithdrawal(updatedResult.rows[0]),
    };
  });
}

function normalizeDestination(method, destination, bank) {
  const raw = String(destination || '').trim();
  if (!raw) {
    throw new Error('Введите реквизиты для вывода');
  }

  if (method === 'card') {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 16 || digits.length > 19) {
      throw new Error('Введите корректный номер карты');
    }
    return digits;
  }

  if (method === 'sbp') {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      throw new Error('Введите корректный номер телефона');
    }
    const bankName = String(bank || '').trim();
    if (!bankName) {
      throw new Error('Введите название банка для СБП');
    }
    return `Телефон: ${digits}; Банк: ${bankName}`;
  }

  if (method === 'usdt_trc20') {
    if (!/^T[a-zA-Z0-9]{33}$/.test(raw)) {
      throw new Error('Введите корректный адрес кошелька TRC20');
    }
    return raw;
  }

  throw new Error('Неверный способ вывода');
}

function maskDestination(method, destination) {
  if (method === 'card') {
    return `${destination.slice(0, 4)} **** **** ${destination.slice(-4)}`;
  }
  if (method === 'sbp') {
    const phoneMatch = destination.match(/Телефон:\s*(\d+)/);
    const bankMatch = destination.match(/Банк:\s*(.+)$/);
    const phone = phoneMatch?.[1] || '';
    const bank = bankMatch?.[1] || '';
    const maskedPhone = phone.length >= 4
      ? `${phone.slice(0, 2)}******${phone.slice(-2)}`
      : phone;
    return `${maskedPhone}${bank ? ` • ${bank}` : ''}`;
  }
  if (method === 'usdt_trc20') {
    return `${destination.slice(0, 5)}...${destination.slice(-5)}`;
  }
  return destination;
}

function mapWithdrawal(row, options = {}) {
  const payload = {
    id: row.id,
    telegramId: Number(row.telegram_id),
    amountJabcoins: Number(row.amount_jabcoins || 0),
    amountRub: Number(row.amount_rub || 0),
    method: row.method,
    methodLabel: WITHDRAWAL_METHODS[row.method]?.label || row.method,
    destinationMasked: row.destination_masked,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processedAt: row.processed_at,
    adminActorName: row.admin_actor_name,
  };

  if (options.includeRaw) {
    payload.destinationRaw = row.destination_raw;
  }

  return payload;
}
