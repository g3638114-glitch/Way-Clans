document.addEventListener('DOMContentLoaded', () => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  const user = tg?.initDataUnsafe?.user;
  const playerName = document.getElementById('playerName');
  const playerAvatarLine = document.getElementById('playerAvatarLine');
  const playerIdLine = document.getElementById('playerIdLine');
  const warehouseModal = document.getElementById('warehouseModal');
  const exchangeModal = document.getElementById('exchangeModal');
  const openWarehouse = document.getElementById('openWarehouse');
  const openExchange = document.getElementById('openExchange');
  const goldAmount = document.getElementById('goldAmount');
  const jabcoinResult = document.getElementById('jabcoinResult');

  if (user) {
    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'PlayerName';
    const username = user.username ? `@${user.username}` : '@username';

    playerName.textContent = displayName;
    playerAvatarLine.textContent = `🧑 Аватар ${username}`;
    playerIdLine.textContent = `ID: ${user.id}`;
  }

  const openModal = (modal) => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = (modal) => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  };

  openWarehouse.addEventListener('click', () => openModal(warehouseModal));
  openExchange.addEventListener('click', () => openModal(exchangeModal));

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const modalId = button.getAttribute('data-close-modal');
      const modal = document.getElementById(modalId);
      closeModal(modal);
    });
  });

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal.is-open').forEach(closeModal);
    }
  });

  const updateExchangeResult = () => {
    const goldValue = Number.parseInt(goldAmount.value || '0', 10) || 0;
    const jabcoins = Math.floor(goldValue / 1000000);
    jabcoinResult.textContent = `= 💎 ${jabcoins} Jabcoin`;
  };

  goldAmount.addEventListener('input', updateExchangeResult);
  updateExchangeResult();
});
