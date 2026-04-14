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
  document.getElementById('sell-page').classList.remove('active');
  document.getElementById('marketplace-page').classList.remove('active');

  // Update nav items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  // Get resources header
  const resourcesHeader = document.querySelector('.resources-header');

  // Show selected page
  if (page === 'main') {
    document.getElementById('main-page').classList.add('active');
    document.getElementById('nav-main').classList.add('active');
    stopProductionRefresh();
    // Show resources header on main page
    if (resourcesHeader) resourcesHeader.style.display = 'grid';
  } else if (page === 'mining') {
    document.getElementById('mining-page').classList.add('active');
    document.getElementById('nav-mining').classList.add('active');
    renderBuildings(); // Load buildings when switching to mining page
    startProductionRefresh();
    // Show resources header on mining page
    if (resourcesHeader) resourcesHeader.style.display = 'grid';
  } else if (page === 'coin-mining') {
    document.getElementById('coin-mining-page').classList.add('active');
    document.getElementById('nav-coin-mining').classList.add('active');
    stopProductionRefresh();
    // Hide resources header on coin mining page
    if (resourcesHeader) resourcesHeader.style.display = 'none';
  } else if (page === 'sell') {
    document.getElementById('sell-page').classList.add('active');
    stopProductionRefresh();
    // Show resources header on sell page
    if (resourcesHeader) resourcesHeader.style.display = 'grid';
  } else if (page === 'marketplace') {
    document.getElementById('marketplace-page').classList.add('active');
    stopProductionRefresh();
    // Show resources header on marketplace page
    if (resourcesHeader) resourcesHeader.style.display = 'grid';
  }
}
