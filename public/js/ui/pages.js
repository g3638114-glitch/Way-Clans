import { appState } from '../utils/state.js';
import { renderBuildings } from './builders.js';
import { startProductionRefresh, stopProductionRefresh } from '../game/production.js';

// Show specific page
export function showPage(page) {
  appState.currentPage = page;

  // Hide all pages
  document.getElementById('main-page').classList.remove('active');
  document.getElementById('mining-page').classList.remove('active');
  document.getElementById('coin-mining-page').classList.remove('active');

  // Update nav items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  // Show selected page
  if (page === 'main') {
    document.getElementById('main-page').classList.add('active');
    document.getElementById('nav-main').classList.add('active');
    stopProductionRefresh();
  } else if (page === 'mining') {
    document.getElementById('mining-page').classList.add('active');
    document.getElementById('nav-mining').classList.add('active');
    renderBuildings(); // Load buildings when switching to mining page
    startProductionRefresh();
  } else if (page === 'coin-mining') {
    document.getElementById('coin-mining-page').classList.add('active');
    document.getElementById('nav-coin-mining').classList.add('active');
    stopProductionRefresh();
  }
}
