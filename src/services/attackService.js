import { supabase } from '../bot.js';

export async function getRandomTarget(userId) {
  const { data: currentUser } = await supabase.from('users').select('id').eq('telegram_id', userId).single();
  
  // Get a random user who is not the current user
  const { data: targets, error } = await supabase
    .from('users')
    .select('id, username, first_name, gold, wood, stone, meat')
    .neq('id', currentUser.id)
    .limit(100); // Get a pool to pick from

  if (error || !targets || targets.length === 0) {
    throw new Error('Нет доступных целей для атаки');
  }

  const target = targets[Math.floor(Math.random() * targets.length)];

  // Get target's defenders
  const { data: defenders } = await supabase
    .from('user_troops')
    .select('level, count')
    .eq('user_id', target.id)
    .eq('troop_type', 'defender')
    .gt('count', 0);

  return {
    target: {
      username: target.username,
      first_name: target.first_name,
      gold: target.gold,
      wood: target.wood,
      stone: target.stone,
      meat: target.meat
    },
    defenders: defenders || []
  };
}