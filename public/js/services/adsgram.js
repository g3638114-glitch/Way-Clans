const ADSGRAM_SDK_URL = 'https://sad.adsgram.ai/js/sad.min.js';
let adsgramLoadPromise = null;
let rewardLoadingEl = null;
let rewardLoadingTextEl = null;
let rewardLoadingTimer = null;

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

function ensureRewardLoadingUi() {
  if (rewardLoadingEl) {
    return rewardLoadingEl;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'reward-loading-overlay';
  wrapper.innerHTML = `
    <div class="reward-loading-card">
      <div class="reward-loading-spinner"></div>
      <div class="reward-loading-title">Загружаем рекламу...</div>
      <div class="reward-loading-text">Подождите 1-2 секунды</div>
    </div>
  `;

  rewardLoadingEl = wrapper;
  rewardLoadingTextEl = wrapper.querySelector('.reward-loading-text');
  document.body.appendChild(wrapper);
  return rewardLoadingEl;
}

function showRewardLoadingState() {
  const overlay = ensureRewardLoadingUi();
  overlay.classList.add('active');
  if (rewardLoadingTextEl) {
    rewardLoadingTextEl.textContent = 'Подождите 1-2 секунды';
  }
  if (rewardLoadingTimer) {
    clearTimeout(rewardLoadingTimer);
  }
  rewardLoadingTimer = setTimeout(() => {
    if (rewardLoadingTextEl && rewardLoadingEl?.classList.contains('active')) {
      rewardLoadingTextEl.textContent = 'Реклама готовится к показу...';
    }
  }, 1600);
}

function hideRewardLoadingState() {
  if (rewardLoadingTimer) {
    clearTimeout(rewardLoadingTimer);
    rewardLoadingTimer = null;
  }
  rewardLoadingEl?.classList.remove('active');
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

  showRewardLoadingState();
  try {
    const Adsgram = await ensureAdsgramReady();
    const controller = Adsgram.init({ blockId: String(blockId) });
    hideRewardLoadingState();
    const result = await controller.show();
    return Boolean(result && result.done && !result.error);
  } catch (error) {
    hideRewardLoadingState();
    throw error;
  }
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
