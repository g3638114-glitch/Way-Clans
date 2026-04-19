const ADSGRAM_BLOCKS = {
  buildingCollect: '28172',
  miningThreshold: '28167',
};

const controllerCache = new Map();

async function waitForAdsgramSdk(timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (window.Adsgram?.init) {
      return window.Adsgram;
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  throw new Error('AdsGram SDK is not available');
}

async function getAdsgramController(blockId) {
  if (controllerCache.has(blockId)) {
    return controllerCache.get(blockId);
  }

  const Adsgram = await waitForAdsgramSdk();

  const controller = Adsgram.init({ blockId, hasReward: true });
  controllerCache.set(blockId, controller);
  return controller;
}

export async function showRewardAd(placement) {
  const blockId = ADSGRAM_BLOCKS[placement];
  if (!blockId) {
    throw new Error('Unknown AdsGram placement');
  }

  const controller = await getAdsgramController(blockId);
  return controller.show();
}
