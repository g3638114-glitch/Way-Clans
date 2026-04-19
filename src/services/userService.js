import { supabase } from '../bot.js';

const DEFAULT_USER_RESOURCES = {
  gold: 5000,
  wood: 2500,
  stone: 2500,
  meat: 500,
  jabcoins: 0,
};

const INITIAL_BUILDING_TYPES = ['mine', 'quarry', 'lumber_mill', 'farm'];
const INITIAL_PRODUCTION_RATES = {
  mine: 625,
  quarry: 312,
  lumber_mill: 312,
  farm: 10,
};

export async function createInitialBuildings(userRecord) {
  if (!userRecord?.id) {
    throw new Error('Invalid user record for initial buildings');
  }

  const buildingsToCreate = INITIAL_BUILDING_TYPES.map((type) => ({
    user_id: userRecord.id,
    building_type: type,
    building_number: 1,
    level: 1,
    collected_amount: 0,
    production_rate: INITIAL_PRODUCTION_RATES[type],
    last_activated: null,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('user_buildings').insert(buildingsToCreate);

  if (error) {
    throw new Error(`Failed to create initial buildings: ${error.message}`);
  }
}

function buildUserUpdates(user, userInfo) {
  if (!userInfo) return null;

  const updates = {};

  if (userInfo.username && userInfo.username !== user.username) {
    updates.username = userInfo.username;
  }

  if (userInfo.first_name && userInfo.first_name !== user.first_name) {
    updates.first_name = userInfo.first_name;
  }

  if (userInfo.photo_url && userInfo.photo_url !== user.photo_url) {
    updates.photo_url = userInfo.photo_url;
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

export async function getOrCreateUser(telegramId, userInfo = null) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (!error && user) {
    const updates = buildUserUpdates(user, userInfo);

    if (!updates) {
      return user;
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Failed to update user profile: ${updateError.message}`);
    }

    return updatedUser;
  }

  if (error?.code !== 'PGRST116') {
    throw new Error('User not found');
  }

  const username = userInfo?.username || `user_${telegramId}`;
  const firstName = userInfo?.first_name || 'Player';
  const photoUrl = userInfo?.photo_url || null;

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId,
      username,
      first_name: firstName,
      photo_url: photoUrl,
      created_at: new Date().toISOString(),
      ...DEFAULT_USER_RESOURCES,
    })
    .select('*')
    .single();

  if (insertError) {
    throw new Error(`Failed to create user: ${insertError.message}`);
  }

  await createInitialBuildings(newUser);
  return newUser;
}

export function parseReferralStartParam(startParam) {
  if (!startParam || typeof startParam !== 'string') return null;
  if (!startParam.startsWith('ref_')) return null;

  const referrerId = Number(startParam.slice(4));
  if (!Number.isFinite(referrerId) || referrerId <= 0) return null;
  return referrerId;
}

export async function applyReferralIfEligible(user, startParam) {
  const referrerTelegramId = parseReferralStartParam(startParam);

  if (!user || !referrerTelegramId) return user;
  if (Number(user.telegram_id) === referrerTelegramId) return user;
  if (user.referred_by_telegram_id) return user;

  const { data: referrer, error: referrerError } = await supabase
    .from('users')
    .select('id, telegram_id, referral_count')
    .eq('telegram_id', referrerTelegramId)
    .single();

  if (referrerError || !referrer) {
    return user;
  }

  const { data: updatedUser, error: updateUserError } = await supabase
    .from('users')
    .update({ referred_by_telegram_id: referrerTelegramId })
    .eq('id', user.id)
    .is('referred_by_telegram_id', null)
    .select('*')
    .single();

  if (updateUserError || !updatedUser) {
    return user;
  }

  await supabase
    .from('users')
    .update({ referral_count: Number(referrer.referral_count || 0) + 1 })
    .eq('id', referrer.id);

  return updatedUser;
}

export async function getUserByTelegramId(telegramId, columns = '*') {
  const { data: user, error } = await supabase
    .from('users')
    .select(columns)
    .eq('telegram_id', telegramId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  return user;
}

export async function getUserById(userId, columns = '*') {
  const { data: user, error } = await supabase
    .from('users')
    .select(columns)
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  return user;
}

export async function getReferralSummary(telegramId) {
  const user = await getUserByTelegramId(telegramId, 'id, telegram_id, referral_count');

  const { data: invitedUsers, error } = await supabase
    .from('users')
    .select('telegram_id, first_name, username, created_at')
    .eq('referred_by_telegram_id', telegramId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error('Failed to load referrals');
  }

  return {
    user,
    invitedUsers: invitedUsers || [],
    totalReferrals: Number(user.referral_count || 0),
  };
}
