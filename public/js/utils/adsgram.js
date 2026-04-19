const ADSGRAM_BLOCKS = {
  buildingCollect: '28172',
  miningThreshold: '28167',
};

const ADSGRAM_SCRIPT_SRC = 'https://sad.adsgram.ai/js/sad.min.js';
const controllerCache = new Map();
let adsgramScriptPromise = null;

function ensureAdsgramScript() {
  if (window.Adsgram?.init) {
    return Promise.resolve(window.Adsgram);
  }

  if (adsgramScriptPromise) {
    return adsgramScriptPromise;
  }

  adsgramScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${ADSGRAM_SCRIPT_SRC}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.Adsgram), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('AdsGram SDK failed to load')), { once: true });
      setTimeout(() => {
        if (window.Adsgram?.init) {
          resolve(window.Adsgram);
        }
      }, 0);
      return;
    }

    const script = document.createElement('script');
    script.src = ADSGRAM_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.Adsgram);
    script.onerror = () => reject(new Error('AdsGram SDK failed to load'));
    document.head.appendChild(script);
  });

  return adsgramScriptPromise;
}

async function waitForAdsgramSdk(timeoutMs = 10000) {
  await ensureAdsgramScript().catch(() => null);
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

  return controller.show()
    .then((result) => {
      if (result?.error) {
        throw createAdsgramError(result);
      }

      return result;
    })
    .catch((result) => {
      throw createAdsgramError(result);
    });
}

function createAdsgramError(result) {
  if (result instanceof Error) {
    return result;
  }

  const description = result?.description || 'AdsGram show failed';
  const state = result?.state ? ` [${result.state}]` : '';
  const error = new Error(`${description}${state}`);
  error.adsgram = result;
  return error;
}
