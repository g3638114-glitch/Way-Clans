import { apiClient } from '../api/client.js';
import { appState } from '../utils/state.js';
import { updateUI } from '../ui/dom.js';
import { getResourceIconHtml } from '../utils/resourceIcons.js';

const METHOD_CONFIG = {
  card: {
    label: 'Карта',
    minAmount: 1,
    hint: 'Минимум 1 Jabcoin, комиссия 0%',
    destinationLabel: 'Номер карты',
    destinationPlaceholder: 'Введите номер карты',
    needsBank: false,
  },
  sbp: {
    label: 'СБП',
    minAmount: 1,
    hint: 'Минимум 1 Jabcoin, комиссия 0%',
    destinationLabel: 'Номер телефона',
    destinationPlaceholder: 'Введите номер телефона',
    needsBank: true,
  },
  usdt_trc20: {
    label: 'USDT TRC20',
    minAmount: 100,
    hint: 'Минимум 100 Jabcoin, комиссия 0%',
    destinationLabel: 'Адрес кошелька TRC20',
    destinationPlaceholder: 'Введите адрес кошелька TRC20',
    needsBank: false,
  },
};

function getCurrentMethod() {
  return appState.selectedWithdrawalMethod || 'card';
}

export function setupWithdrawalsPage() {
  document.getElementById('withdrawals-submit-btn')?.addEventListener('click', submitWithdrawalRequest);
  document.getElementById('withdrawals-back-btn')?.addEventListener('click', () => window.showPage?.('main'));
  document.getElementById('open-withdrawals-history-btn')?.addEventListener('click', openWithdrawalsHistoryModal);
  document.getElementById('close-withdrawals-history-btn')?.addEventListener('click', closeWithdrawalsHistoryModal);
  document.getElementById('withdrawals-history-modal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'withdrawals-history-modal') {
      closeWithdrawalsHistoryModal();
    }
  });

  document.querySelectorAll('.withdrawals-method-btn').forEach((button) => {
    button.addEventListener('click', () => {
      appState.selectedWithdrawalMethod = button.dataset.method;
      renderWithdrawalsMethodState();
    });
  });
}

export async function loadWithdrawalsPage() {
  renderWithdrawalsMethodState();
  renderWithdrawalsBalance();
}

async function submitWithdrawalRequest() {
  const method = getCurrentMethod();
  const amountInput = document.getElementById('withdrawals-amount-input');
  const destinationInput = document.getElementById('withdrawals-destination-input');
  const bankInput = document.getElementById('withdrawals-bank-input');
  const submitBtn = document.getElementById('withdrawals-submit-btn');
  const feedbackEl = document.getElementById('withdrawals-feedback');

  if (!amountInput || !destinationInput || !submitBtn || !feedbackEl || !bankInput) return;

  submitBtn.disabled = true;
  feedbackEl.textContent = 'Отправляем заявку...';
  feedbackEl.className = 'withdrawals-feedback is-info';

  try {
    const result = await apiClient.createWithdrawal(appState.userId, {
      method,
      amountJabcoins: amountInput.value,
      destination: destinationInput.value,
      bank: bankInput.value,
    });

    appState.currentUser = result.user;
    updateUI(appState.currentUser);
    renderWithdrawalsBalance();
    amountInput.value = '';
    destinationInput.value = '';
    bankInput.value = '';
    feedbackEl.textContent = 'Заявка на вывод отправлена. Ожидайте обработки администратором.';
    feedbackEl.className = 'withdrawals-feedback is-success';
  } catch (error) {
    feedbackEl.textContent = error.message || 'Не удалось создать заявку';
    feedbackEl.className = 'withdrawals-feedback is-error';
  } finally {
    submitBtn.disabled = false;
  }
}

function renderWithdrawalsMethodState() {
  const method = getCurrentMethod();
  const config = METHOD_CONFIG[method];

  document.querySelectorAll('.withdrawals-method-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.method === method);
  });

  const hintEl = document.getElementById('withdrawals-method-hint');
  const destinationLabelEl = document.getElementById('withdrawals-destination-label');
  const destinationInputEl = document.getElementById('withdrawals-destination-input');
  const bankLabelEl = document.getElementById('withdrawals-bank-label');
  const bankInputEl = document.getElementById('withdrawals-bank-input');
  const amountInput = document.getElementById('withdrawals-amount-input');

  if (hintEl) hintEl.textContent = config.hint;
  if (destinationLabelEl) destinationLabelEl.textContent = config.destinationLabel;
  if (destinationInputEl) destinationInputEl.placeholder = config.destinationPlaceholder;
  if (amountInput) amountInput.min = String(config.minAmount);
  if (bankLabelEl) bankLabelEl.classList.toggle('is-visible', Boolean(config.needsBank));
  if (bankInputEl) bankInputEl.classList.toggle('is-visible', Boolean(config.needsBank));
}

function renderWithdrawalsBalance() {
  const balanceEl = document.getElementById('withdrawals-balance-value');
  if (!balanceEl) return;
  balanceEl.innerHTML = `${getResourceIconHtml('jabcoin', 'resource-inline-icon-lg', 'Jabcoin')} ${Number(appState.currentUser?.jabcoins || 0)}`;
}

function renderWithdrawalHistory(withdrawals) {
  const historyList = document.getElementById('withdrawals-history-modal-body');
  if (!historyList) return;
  if (!withdrawals.length) {
    historyList.innerHTML = '<div class="withdrawals-history-empty">Заявок на вывод ещё не было</div>';
    return;
  }

  historyList.innerHTML = withdrawals.map((item) => `
    <div class="withdrawals-history-item">
      <div class="withdrawals-history-top">
        <div class="withdrawals-history-method">${item.methodLabel}</div>
        <div class="withdrawals-history-status status-${item.status}">${getStatusLabel(item.status)}</div>
      </div>
      <div class="withdrawals-history-amount">${item.amountJabcoins} Jabcoin</div>
      <div class="withdrawals-history-meta">${item.destinationMasked}</div>
      <div class="withdrawals-history-meta">${formatDate(item.createdAt)}</div>
    </div>
  `).join('');
}

async function openWithdrawalsHistoryModal() {
  const modal = document.getElementById('withdrawals-history-modal');
  const body = document.getElementById('withdrawals-history-modal-body');
  if (!modal || !body) return;

  body.innerHTML = '<div class="withdrawals-history-empty">Загружаем историю выводов...</div>';
  modal.classList.add('active');

  try {
    const result = await apiClient.getWithdrawals(appState.userId);
    renderWithdrawalHistory(result.withdrawals || []);
  } catch (error) {
    body.innerHTML = `<div class="withdrawals-history-empty">${error.message || 'Не удалось загрузить историю выводов'}</div>`;
  }
}

function closeWithdrawalsHistoryModal() {
  document.getElementById('withdrawals-history-modal')?.classList.remove('active');
}

function getStatusLabel(status) {
  if (status === 'pending') return 'На рассмотрении';
  if (status === 'completed') return 'Выполнено';
  if (status === 'refunded') return 'Отклонено';
  return status;
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('ru-RU');
  } catch {
    return value || '';
  }
}
