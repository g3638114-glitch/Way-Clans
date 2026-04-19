const ADSGRAM_BLOCKS = {
  buildingCollect: 28172,
  miningThreshold: 28167,
};

const controllerCache = new Map();

function getAdsgramController(blockId) {
  if (controllerCache.has(blockId)) {
    return controllerCache.get(blockId);
  }

  if (!window.Adsgram?.init) {
    throw new Error('AdsGram SDK is not available');
  }

  const controller = window.Adsgram.init({ blockId });
  controllerCache.set(blockId, controller);
  return controller;
}

export async function showRewardAd(placement) {
  const blockId = ADSGRAM_BLOCKS[placement];
  if (!blockId) {
    throw new Error('Unknown AdsGram placement');
  }

  const controller = getAdsgramController(blockId);
  return controller.show();
}
