import { supabase } from '../bot.js';

// Building configurations
export const BUILDING_CONFIGS = {
  mine: { productionRate: 80, cost: 0 },
  quarry: { productionRate: 60, cost: 0 },
  lumber_mill: { productionRate: 50, cost: 0 },
  farm: { productionRate: 40, cost: 0 },
};

export function calculateUpgradeCost(level) {
  return Math.floor(1000 * Math.pow(1.15, level - 1));
}

export async function collectResourcesFromBuilding(userId, buildingId) {
  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

  // Get building
  const { data: building, error: buildError } = await supabase
    .from('user_buildings')
    .select('*')
    .eq('id', buildingId)
    .eq('user_id', user.id)
    .single();

  if (buildError) {
    throw new Error('Building not found');
  }

  // Calculate collected amount based on time passed
  const lastCollected = new Date(building.last_collected);
  const now = new Date();
  const hoursPassed = (now - lastCollected) / (1000 * 60 * 60);
  const productionRate = building.production_rate || 80;
  const maxCapacity = productionRate * 24; // 24 hour max capacity

  // Calculate actual collected amount with decimals
  const totalCollected = (building.collected_amount || 0) + (hoursPassed * productionRate);
  const collectedAmount = Math.floor(Math.min(totalCollected, maxCapacity));

  if (collectedAmount <= 0) {
    throw new Error('Building has not accumulated resources yet. Please wait a moment!');
  }

  // Update building
  const { data: updatedBuilding, error: updateError } = await supabase
    .from('user_buildings')
    .update({
      collected_amount: 0,
      last_collected: new Date().toISOString(),
    })
    .eq('id', buildingId)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to collect resources');
  }

  // Add resources to user
  const resourceType = building.building_type;
  let updateData = {};

  if (resourceType === 'mine') {
    updateData.gold = user.gold + collectedAmount;
  } else if (resourceType === 'quarry') {
    updateData.stone = user.stone + collectedAmount;
  } else if (resourceType === 'lumber_mill') {
    updateData.wood = user.wood + collectedAmount;
  } else if (resourceType === 'farm') {
    updateData.meat = user.meat + collectedAmount;
  }

  const { data: updatedUser, error: userUpdateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (userUpdateError) {
    throw new Error('Failed to update resources');
  }

  return { success: true, collected: collectedAmount, user: updatedUser, building: updatedBuilding };
}

export async function upgradeBuilding(userId, buildingId) {
  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

  // Get building
  const { data: building, error: buildError } = await supabase
    .from('user_buildings')
    .select('*')
    .eq('id', buildingId)
    .eq('user_id', user.id)
    .single();

  if (buildError) {
    throw new Error('Building not found');
  }

  // Calculate upgrade cost
  const level = building.level || 1;
  const upgradeCost = calculateUpgradeCost(level);

  if (user.gold < upgradeCost) {
    throw new Error('Not enough gold');
  }

  // Update building
  const newProductionRate = building.production_rate * 1.2;

  const { data: updatedBuilding, error: updateError } = await supabase
    .from('user_buildings')
    .update({
      level: level + 1,
      production_rate: Math.floor(newProductionRate),
    })
    .eq('id', buildingId)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to upgrade building');
  }

  // Deduct gold from user
  const { data: updatedUser, error: userUpdateError } = await supabase
    .from('users')
    .update({ gold: user.gold - upgradeCost })
    .eq('id', user.id)
    .select()
    .single();

  if (userUpdateError) {
    throw new Error('Failed to update gold');
  }

  return { success: true, costDeducted: upgradeCost, user: updatedUser, building: updatedBuilding };
}

export async function purchaseBuilding(userId, buildingType) {
  if (!BUILDING_CONFIGS[buildingType]) {
    throw new Error('Invalid building type');
  }

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

  // Get user's buildings of this type to determine building number
  const { data: userBuildings, error: buildError } = await supabase
    .from('user_buildings')
    .select('*')
    .eq('user_id', user.id)
    .eq('building_type', buildingType)
    .order('building_number', { ascending: false });

  if (buildError && buildError.code !== 'PGRST116') {
    throw new Error('Failed to check existing buildings');
  }

  // Only allow the first building of each type to be purchased
  if (userBuildings && userBuildings.length > 0) {
    throw new Error('You already own this building. Get more from quests!');
  }

  const config = BUILDING_CONFIGS[buildingType];
  const buildingNumber = 1;
  const cost = config.cost; // All initial buildings are free (0)

  // Check if user has enough gold
  if (user.gold < cost) {
    throw new Error(`Not enough gold. Need ${cost}, have ${user.gold}`);
  }

  // Create new building
  const { data: newBuilding, error: createError } = await supabase
    .from('user_buildings')
    .insert({
      user_id: user.id,
      building_type: buildingType,
      building_number: buildingNumber,
      level: 1,
      collected_amount: 0,
      production_rate: config.productionRate,
      last_collected: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createError) {
    throw new Error('Failed to create building');
  }

  // Deduct gold from user
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ gold: user.gold - cost })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to update user gold');
  }

  return {
    success: true,
    costDeducted: cost,
    user: updatedUser,
    building: newBuilding,
  };
}
