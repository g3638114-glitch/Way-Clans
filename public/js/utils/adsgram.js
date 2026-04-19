const ADSGRAM_BLOCKS = {
  buildingCollect: '28172',
  miningThreshold: '28167',
};

const ADSGRAM_SCRIPT_SRC = 'https://sad.adsgram.ai/js/sad.min.js';
const controllerCache = new Map();
let adsgramScriptPromise = null;

function ensureAdsgramScript() {
  if (window.Adsgram?.init) {
    console.log('[AdsGram] SDK already available');
    return Promise.resolve(window.Adsgram);
  }

  if (adsgramScriptPromise) {
    return adsgramScriptPromise;
  }

  adsgramScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${ADSGRAM_SCRIPT_SRC}"]`);
    if (existingScript) {
      console.log('[AdsGram] Removing stale SDK script and reloading');
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = ADSGRAM_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      console.log('[AdsGram] SDK script loaded', { hasAdsgram: Boolean(window.Adsgram), hasInit: Boolean(window.Adsgram?.init) });
      if (window.Adsgram?.init) {
        resolve(window.Adsgram);
      } else {
        reject(new Error('AdsGram SDK loaded, but window.Adsgram.init is missing'));
      }
    };
    script.onerror = () => {
      console.error('[AdsGram] SDK script failed to load');
      reject(new Error('AdsGram SDK failed to load'));
    };
    document.head.appendChild(script);

    setTimeout(() => {
      if (!window.Adsgram?.init) {
        console.error('[AdsGram] SDK load timeout');
        reject(new Error('AdsGram SDK load timeout'));
      }
    }, 8000);
  });

  return adsgramScriptPromise.finally(() => {
    adsgramScriptPromise = null;
  });
}

async function waitForAdsgramSdk(timeoutMs = 10000) {
  await ensureAdsgramScript();
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
  console.log('[AdsGram] Showing rewarded ad', { placement, blockId });

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
