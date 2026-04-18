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
  mine: 100,
  quarry: 80,
  lumber_mill: 90,
  farm: 70,
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
