import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/init.js';
import { completeWithdrawal, rejectWithdrawal, WITHDRAWAL_METHODS } from './services/withdrawalService.js';

dotenv.config();

// Initialize bot and Supabase
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const WITHDRAWAL_ADMIN_IDS = new Set(['5676949534', '6910097562']);
const WITHDRAWAL_CHAT = process.env.WITHDRAWAL_TELEGRAM_CHAT || '@wayclanszayavki';

function resolveAdminLabel(adminActor) {
  if (!adminActor) return 'Администратор';
  if (adminActor.name) return adminActor.name;
  if (adminActor.username) return `@${adminActor.username}`;
  if (adminActor.telegramId) return `ID ${adminActor.telegramId}`;
  return 'Администратор';
}

function isAuthorizedWithdrawalAdmin(telegramId) {
  return WITHDRAWAL_ADMIN_IDS.has(String(telegramId || ''));
}

async function updateWithdrawalAdminMessage(ctx, statusLine) {
  const message = ctx.callbackQuery?.message;
  const baseText = message?.text || message?.caption || '';
  const updatedText = baseText.includes(statusLine) ? baseText : `${baseText}\n\n${statusLine}`.trim();
  try {
    if (message?.text) {
      await ctx.telegram.editMessageText(message.chat.id, message.message_id, undefined, updatedText, {
        disable_web_page_preview: true,
        reply_markup: null,
      });
    } else if (message?.caption) {
      await ctx.telegram.editMessageCaption(message.chat.id, message.message_id, undefined, updatedText, {
        reply_markup: null,
      });
    }
  } catch {
    try {
      await ctx.telegram.editMessageReplyMarkup(message.chat.id, message.message_id, undefined, null);
    } catch {}
  }
}

async function notifyWithdrawalStatusToUser(withdrawal, text) {
  try {
    await bot.telegram.sendMessage(withdrawal.telegramId, text);
  } catch (error) {
    console.warn('⚠️ Failed to notify user about withdrawal status:', error.message);
  }
}

async function fetchUserSnapshotByTelegramId(telegramId) {
  const { data: user } = await supabase
    .from('users')
    .select('telegram_id, username, first_name, jabcoins')
    .eq('telegram_id', telegramId)
    .single();
  return user || null;
}

async function fetchTelegramProfileMeta(telegramId) {
  try {
    const chat = await bot.telegram.getChat(telegramId);
    const first = chat?.first_name || '';
    const last = chat?.last_name || '';
    return {
      username: chat?.username || null,
      fullName: `${first} ${last}`.trim() || null,
      displayName: `${first} ${last}`.trim() || chat?.username || null,
    };
  } catch {
    return null;
  }
}

async function notifyAdminWithdrawal(withdrawal, userSnapshot, telegramUser) {
  const methodLabel = WITHDRAWAL_METHODS[withdrawal.method]?.label || withdrawal.method;
  const usernamePart = userSnapshot?.username ? `, @${userSnapshot.username}` : telegramUser?.username ? `, @${telegramUser.username}` : '';
  const displayName = userSnapshot?.first_name || telegramUser?.first_name || `Игрок ${withdrawal.telegramId}`;
  const lines = [
    `Заявка #${withdrawal.id} на вывод`,
    '',
    `Игрок: ${displayName} (ID: ${withdrawal.telegramId}${usernamePart})`,
    `Сумма: ${withdrawal.amountJabcoins} Jabcoin`,
    `Эквивалент: ${withdrawal.amountRub} RUB`,
    `Способ: ${methodLabel}`,
    `Реквизиты: ${withdrawal.destinationRaw || withdrawal.destinationMasked}`,
    `Остаток после списания: ${Number(userSnapshot?.jabcoins || 0)} Jabcoin`,
  ];

  await bot.telegram.sendMessage(WITHDRAWAL_CHAT, lines.join('\n'), {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Выполнено', callback_data: `wd:done:${withdrawal.id}` },
        { text: '🚫 Отклонить', callback_data: `wd:reject:${withdrawal.id}` },
      ]],
    },
  });
}

/**
 * Create initial buildings for a new user (free buildings: mine, quarry, lumber_mill, farm)
 * Each player starts with 1 of each building type at level 1
 */
async function createInitialBuildings(userRecord) {
  try {
    // userRecord is already the user object from Supabase, no need to query again
    if (!userRecord || !userRecord.id) {
      console.error('Error: Invalid user record for initial buildings');
      return;
    }

    // Create initial buildings: mine, quarry, lumber_mill, farm
    const buildingTypes = ['mine', 'quarry', 'lumber_mill', 'farm'];
    const productionRates = {
      mine: 100,
      quarry: 80,
      lumber_mill: 90,
      farm: 31,
    };

    const buildingsToCreate = buildingTypes.map((type) => ({
      user_id: userRecord.id,
      building_type: type,
      building_number: 1,
      level: 1,
      collected_amount: 0,
      production_rate: productionRates[type],
      last_activated: null,
      created_at: new Date().toISOString(),
    }));

    const { data: createdBuildings, error: createError } = await supabase
      .from('user_buildings')
      .insert(buildingsToCreate)
      .select();

    if (createError) {
      console.error('Error creating initial buildings:', createError);
      return;
    }

    console.log(`✅ Created ${createdBuildings.length} initial buildings for user ${userRecord.id}`);
  } catch (error) {
    console.error('Error creating initial buildings:', error);
  }
}

/**
 * Get profile photo URL for a Telegram user using direct Telegram Bot API
 * Returns the URL of the user's profile photo if available
 * Includes retry logic for reliability
 */
async function getUserProfilePhotoUrl(userId, maxRetries = 2) {
  let lastError;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set');
    return null;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Call Telegram Bot API directly to get user profile photos
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getUserProfilePhotos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            offset: 0,
            limit: 1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.ok) {
        throw new Error(`Telegram API returned error: ${result.description}`);
      }

      const photos = result.result;

      if (photos && photos.photos && photos.photos.length > 0) {
        // Get the largest photo (usually the last one in the array)
        const photoArray = photos.photos[0];
        if (photoArray && photoArray.length > 0) {
          const largestPhoto = photoArray[photoArray.length - 1];

          // Get file info to construct the download URL
          const fileResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_id: largestPhoto.file_id }),
            }
          );

          if (!fileResponse.ok) {
            throw new Error(`Telegram getFile error: ${fileResponse.status}`);
          }

          const fileResult = await fileResponse.json();

          if (fileResult.ok && fileResult.result && fileResult.result.file_path) {
            const photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileResult.result.file_path}`;
            console.log(`✅ Successfully fetched profile photo for user ${userId}`);
            return photoUrl;
          }
        }
      }

      // User has no profile photo
      console.log(`ℹ️ User ${userId} has no profile photo`);
      return null;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt + 1}/${maxRetries + 1} - Error getting user profile photo:`, error.message);

      // Wait before retrying (exponential backoff: 500ms, 1000ms)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
      }
    }
  }

  console.error(`❌ Failed to get profile photo after ${maxRetries + 1} attempts:`, lastError?.message);
  return null;
}

// Handle /start command
bot.command('start', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'Unknown';
  const firstName = ctx.from.first_name || '';

  try {
    // Get user's profile photo URL from Telegram with retry logic
    const photoUrl = await getUserProfilePhotoUrl(userId);

    // Get or create user in Supabase
    let { data: user, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (selectError && selectError.code === 'PGRST116') {
      // User doesn't exist, create new with initial resources
      console.log(`📝 Creating new user ${userId}`);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: userId,
          username: username,
          first_name: firstName,
          photo_url: photoUrl,
          gold: 5000,
          wood: 2500,
          stone: 2500,
          meat: 500,
          jabcoins: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating user:', insertError);
        await ctx.reply('Произошла ошибка при создании аккаунта. Попробуйте позже.');
        return;
      }

      user = newUser;
      console.log(`✅ User ${userId} created successfully`);
      // Create initial buildings for the user
      await createInitialBuildings(user);
    } else if (selectError) {
      console.error('❌ Error fetching user:', selectError);
      await ctx.reply('Произошла ошибка при загрузке вашего аккаунта. Попробуйте позже.');
      return;
    } else {
      // User exists - update profile info and photo
      console.log(`📝 Updating existing user ${userId}`);
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: username,
          first_name: firstName,
          photo_url: photoUrl,
        })
        .eq('telegram_id', userId);

      if (updateError) {
        console.error('⚠️ Error updating user profile:', updateError);
        // Continue anyway - the user can still play
      } else {
        console.log(`✅ User ${userId} profile updated`);
      }
    }

    // Send welcome message with plain MiniApp link so Telegram opens it with proper initData
    const botUsername = (process.env.TELEGRAM_BOT_USERNAME || 'Way_clans_bot').replace(/^@/, '').trim();
    const miniAppShortName = (process.env.TELEGRAM_MINIAPP_SHORT_NAME || 'wayclans').trim();
    const miniappUrl = `https://t.me/${botUsername}/${miniAppShortName}`;

    await ctx.reply('🎮 Добро пожаловать в Way Clans!', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Открыть МiniApp',
              url: miniappUrl,
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error('❌ Error in /start command:', error);
    await ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery?.data || '';
  if (!data.startsWith('wd:')) {
    try { await ctx.answerCbQuery(); } catch {}
    return;
  }

  const actorId = ctx.from?.id;
  if (!isAuthorizedWithdrawalAdmin(actorId)) {
    try { await ctx.answerCbQuery('У вас нет прав для этого действия', { show_alert: true }); } catch {}
    return;
  }

  const [, action, withdrawalId] = data.split(':');
  const adminActor = {
    telegramId: actorId,
    username: ctx.from?.username || null,
    name: [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || null,
  };

  try {
    if (action === 'done') {
      const result = await completeWithdrawal(withdrawalId, adminActor);
      if (!result.ok) {
        await ctx.answerCbQuery('Заявка уже обработана', { show_alert: true });
        await updateWithdrawalAdminMessage(ctx, 'Заявка уже обработана ранее.');
        return;
      }
      const statusLine = `✅ Заявка #${result.withdrawal.id} выполнена администратором ${resolveAdminLabel(adminActor)}`;
      await updateWithdrawalAdminMessage(ctx, statusLine);
      await notifyWithdrawalStatusToUser(
        result.withdrawal,
        `Ваша заявка #${result.withdrawal.id} выполнена.\nСпособ: ${result.withdrawal.methodLabel}\nСумма: ${result.withdrawal.amountJabcoins} Jabcoin`
      );
      await ctx.answerCbQuery('Заявка выполнена');
      return;
    }

    if (action === 'reject') {
      const result = await rejectWithdrawal(withdrawalId, adminActor);
      if (!result.ok) {
        await ctx.answerCbQuery('Заявка уже обработана', { show_alert: true });
        await updateWithdrawalAdminMessage(ctx, 'Заявка уже обработана ранее.');
        return;
      }
      const statusLine = `🚫 Заявка #${result.withdrawal.id} отклонена администратором ${resolveAdminLabel(adminActor)}`;
      await updateWithdrawalAdminMessage(ctx, statusLine);
      await notifyWithdrawalStatusToUser(
        result.withdrawal,
        `Ваша заявка #${result.withdrawal.id} отклонена. Jabcoin возвращены на баланс.`
      );
      await ctx.answerCbQuery('Заявка отклонена');
      return;
    }

    await ctx.answerCbQuery('Неизвестное действие', { show_alert: true });
  } catch (error) {
    console.error('❌ Withdrawal callback error:', error);
    try { await ctx.answerCbQuery('Ошибка обработки', { show_alert: true }); } catch {}
  }
});

// Handle unknown commands
bot.on('message', async (ctx) => {
  // Only respond to unknown messages
  if (!ctx.message.text?.startsWith('/')) {
    await ctx.reply('Используйте команду /start для начала игры.');
  }
});

// Error handler
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  try {
    ctx.reply('Произошла ошибка. Попробуйте позже.').catch(() => {});
  } catch (e) {
    console.error('Error sending error message:', e);
  }
});

export { bot, supabase, initializeDatabase, notifyAdminWithdrawal, fetchUserSnapshotByTelegramId, fetchTelegramProfileMeta };
