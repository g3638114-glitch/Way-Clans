import { apiClient } from '../api/client.js';
import { appState, withOperationLock } from '../utils/state.js';

export async function loadReferralsPage() {
  await withOperationLock('loadReferrals', async () => {
    const container = document.getElementById('friends-page');
    if (!container) return;

    container.innerHTML = '<div class="friends-loading">Загрузка друзей...</div>';

    try {
      const data = await apiClient.getReferrals(appState.userId);
      renderReferralsPage(data);
    } catch (error) {
      const message = error.message || 'Не удалось загрузить друзей';
      const details = message.includes('Failed to load referrals')
        ? 'Реферальная ссылка MiniApp пока не настроена на сервере. Нужны TELEGRAM_BOT_USERNAME и TELEGRAM_MINIAPP_SHORT_NAME.'
        : message;
      container.innerHTML = `<div class="friends-empty">${details}</div>`;
    }
  });
}

function renderReferralsPage(data) {
  const container = document.getElementById('friends-page');
  if (!container) return;

  const invitedUsers = data.invitedUsers || [];
  const listHtml = invitedUsers.length > 0
    ? invitedUsers.map((user) => `
        <div class="friend-item">
          <div class="friend-item-main">
            <div class="friend-item-name">${user.first_name || 'Игрок'}</div>
            <div class="friend-item-username">@${user.username || 'unknown'}</div>
          </div>
          <div class="friend-item-date">${formatInviteDate(user.created_at)}</div>
        </div>
      `).join('')
    : '<div class="friends-empty">Пока никто не присоединился по вашей ссылке</div>';

  container.innerHTML = `
    <div class="friends-page-shell">
      <section class="friends-hero-card">
        <div class="friends-hero-kicker">Реферальная система</div>
        <div class="friends-hero-title">Приглашайте друзей в Way Clans</div>
        <div class="friends-stats-row">
          <div class="friends-stat-card">
            <span class="friends-stat-label">Всего друзей</span>
            <span class="friends-stat-value">${data.totalReferrals || 0}</span>
          </div>
          <div class="friends-stat-card">
            <span class="friends-stat-label">Формат ссылки</span>
            <span class="friends-stat-value">MiniApp</span>
          </div>
        </div>
      </section>

      <section class="friends-link-card">
        <div class="friends-link-title">Ваша ссылка</div>
        <div class="friends-link-box" id="friends-link-box">${escapeHtml(data.referralLink || '')}</div>
        <div class="friends-link-actions">
          <button class="btn btn-primary" id="copy-referral-link-btn">Копировать</button>
          <button class="btn btn-secondary" id="share-referral-link-btn">Поделиться</button>
        </div>
      </section>

      <section class="friends-list-card">
        <div class="friends-list-title">Ваши друзья</div>
        <div class="friends-list">${listHtml}</div>
      </section>
    </div>
  `;

  const copyBtn = document.getElementById('copy-referral-link-btn');
  const shareBtn = document.getElementById('share-referral-link-btn');

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(data.referralLink || '');
      tg.showAlert('Ссылка скопирована');
    } catch {
      tg.showAlert('Не удалось скопировать ссылку');
    }
  });

  shareBtn?.addEventListener('click', () => {
    const shareText = `Присоединяйся ко мне в Way Clans: ${data.referralLink}`;
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
      return;
    }

    try {
      navigator.clipboard.writeText(shareText);
      tg.showAlert('Текст для приглашения скопирован');
    } catch {
      tg.showAlert('Не удалось подготовить приглашение');
    }
  });
}

function formatInviteDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
