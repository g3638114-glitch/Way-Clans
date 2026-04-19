const ADSGRAM_SDK_URL = 'https://sad.adsgram.ai/js/sad.min.js';
const ADSGRAM_SHOW_TIMEOUT_MS = 15000;

let adsgramLoadPromise = null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadAdsgramScript() {
  if (adsgramLoadPromise) {
    return adsgramLoadPromise;
  }

  adsgramLoadPromise = new Promise((resolve, reject) => {
    if (window.Adsgram) {
      resolve(window.Adsgram);
      return;
    }

    const existingScript = document.querySelector(`script[src="${ADSGRAM_SDK_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.Adsgram));
      existingScript.addEventListener('error', () => reject(new Error('Не удалось загрузить AdsGram SDK')));
      return;
    }

    const script = document.createElement('script');
    script.src = ADSGRAM_SDK_URL;
    script.async = true;
    script.onload = () => resolve(window.Adsgram);
    script.onerror = () => reject(new Error('Не удалось загрузить AdsGram SDK'));
    document.head.appendChild(script);
  });

  return adsgramLoadPromise;
}

async function ensureAdsgramReady() {
  if (window.Adsgram) {
    return window.Adsgram;
  }

  await loadAdsgramScript();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (window.Adsgram) {
      return window.Adsgram;
    }
    await wait(150);
  }

  throw new Error('AdsGram недоступен');
}

export async function showRewardedAd(blockId) {
  if (!blockId) {
    throw new Error('Не задан blockId для AdsGram');
  }

  try {
    window.Telegram?.WebApp?.expand?.();
  } catch {}

  const Adsgram = await ensureAdsgramReady();
  const controller = Adsgram.init({ blockId: String(blockId) });
  const result = await Promise.race([
    controller.show(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AdsGram не открыл рекламу вовремя')), ADSGRAM_SHOW_TIMEOUT_MS);
    }),
  ]);
  return Boolean(result && result.done && !result.error);
}

export async function initializeAdsgram() {
  try {
    await ensureAdsgramReady();
  } catch (error) {
    console.warn('AdsGram init failed:', error);
  }
}

export function getAdsgramBlockId(kind) {
  const cfg = window.ADSGRAM_CONFIG || {};
  if (kind === 'building') return cfg.buildingRewardBlockId;
  if (kind === 'mining') return cfg.miningRewardBlockId;
  return null;
}
