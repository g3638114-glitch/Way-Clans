import { loadQuests, checkQuestProgress, claimQuestReward } from '../../game/quests.js';
import { renderBuildings } from '../builders.js';
import { appState } from '../../utils/state.js';

export async function openQuestsModal() {
  const quests = await loadQuests();
  renderQuestsList(quests);
  document.getElementById('quests-modal').classList.add('active');
}

export function closeQuestsModal() {
  document.getElementById('quests-modal').classList.remove('active');
}

export function renderQuestsList(quests) {
  const questsList = document.getElementById('quests-list');
  questsList.innerHTML = '';

  quests.forEach(quest => {
    const questCard = document.createElement('div');
    questCard.className = 'quest-card';
    if (quest.completed) {
      questCard.classList.add('completed');
    }

    let questContent = `
      <div class="quest-header">
        <span class="quest-icon">${quest.icon}</span>
        <div class="quest-info">
          <h3 class="quest-title">${quest.title}</h3>
          <p class="quest-description">${quest.description}</p>
        </div>
      </div>
      <div class="quest-reward">
        <span class="reward-text">Reward: ${quest.reward}</span>
      </div>
    `;

    // Button logic
    if (quest.rewarded) {
      // If already received reward - show completed status
      questContent += `
        <button class="btn btn-quest btn-quest-completed" disabled>
          ✓ Reward received
        </button>
      `;
    } else if (quest.completed) {
      // If completed but not rewarded - show "Get Reward" button
      questContent += `
        <button class="btn btn-quest btn-quest-claim" onclick="handleClaimReward('${quest.id}')">
          Get reward ✓
        </button>
      `;
    } else if (quest.url) {
      // For subscribe quest - show button to open link and check button
      questContent += `
        <div class="quest-buttons">
          <button class="btn btn-quest btn-quest-action" onclick="window.open('${quest.url}', '_blank')">
            Go to channel
          </button>
          <button class="btn btn-quest btn-quest-check" onclick="handleCheckQuest('${quest.id}')">
            Check
          </button>
        </div>
      `;
    } else {
      // For referral quests - show check button
      questContent += `
        <button class="btn btn-quest btn-quest-check" onclick="handleCheckQuest('${quest.id}')">
          Check
        </button>
      `;
    }

    questCard.innerHTML = questContent;
    questsList.appendChild(questCard);
  });
}

// Global handlers for quest buttons (used in onclick)
window.handleCheckQuest = async (questId) => {
  const quests = await checkQuestProgress(questId);
  renderQuestsList(quests);
};

window.handleClaimReward = async (questId) => {
  const result = await claimQuestReward(questId);
  if (result) {
    const quests = await loadQuests();
    renderQuestsList(quests);

    // If we're on the mining page, refresh building display
    if (appState.currentPage === 'mining') {
      renderBuildings();
    }
  }
};
