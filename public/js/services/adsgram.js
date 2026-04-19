function getAdsgramController(blockId) {
  if (!window.Adsgram || !blockId) {
    throw new Error('AdsGram недоступен');
  }

  return window.Adsgram.init({ blockId: String(blockId) });
}

export async function showRewardedAd(blockId) {
  const controller = getAdsgramController(blockId);
  const result = await controller.show();
  return Boolean(result && result.done && !result.error);
}

export function getAdsgramBlockId(kind) {
  const cfg = window.ADSGRAM_CONFIG || {};
  if (kind === 'building') return cfg.buildingRewardBlockId;
  if (kind === 'mining') return cfg.miningRewardBlockId;
  return null;
}
