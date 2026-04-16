import { appState } from '../utils/state.js';
import { renderBuildings } from './builders.js';
import { startProductionRefresh, stopProductionRefresh } from '../game/production.js';
import { loadMarketListings } from '../game/market.js';
import { renderBarracks } from './modals/barracks.js';

// Show specific page
export function showPage(page) {
  appState.currentPage = page;

  // Hide all pages
  document.getElementById('main-page').classList.remove('active');
  document.getElementById('mining-page').classList.remove('active');
  document.getElementById('coin-mining-page').classList.remove('active');
  document.getElementById('market-page').classList.remove('active');
  document.getElementById('barracks-page').classList.remove('active');

  // Update nav items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  // Get resources header and navigation elements
  const resourcesHeader = document.querySelector('.resources-header');
  const mainNav = document.getElementById('bottom-nav');
  const mainNavButtons = mainNav.querySelectorAll('#nav-main, #nav-mining, #nav-coin-mining, #nav-barracks');
  const marketBackBtn = document.getElementById('nav-market-back');

  // Show selected page
  if (page === 'main') {
    document.getElementById('main-page').classList.add('active');
    document.getElementById('nav-main').classList.add('active');
    stopProductionRefresh();
    if (resourcesHeader) resourcesHeader.style.display = 'grid';
    mainNavButtons.forEach(btn => btn.style.display = '');
    if (marketBackBtn) marketBackBtn.style.display = 'none';
  } else if (page === 'mining') {
    document.getElementById('mining-page').classList.add('active');
    document.getElementById('nav-mining').classList.add('active');
    renderBuildings();
    startProductionRefresh();
    if (resourcesHeader) resourcesHeader.style.display = 'grid';
    mainNavButtons.forEach(btn => btn.style.display = '');
    if (marketBackBtn) marketBackBtn.style.display = 'none';
  } else if (page === 'coin-mining') {
    document.getElementById('coin-mining-page').classList.add('active');
    document.getElementById('nav-coin-mining').classList.add('active');
    stopProductionRefresh();
    if (resourcesHeader) resourcesHeader.style.display = 'none';
    mainNavButtons.forEach(btn => btn.style.display = '');
    if (marketBackBtn) marketBackBtn.style.display = 'none';
  } else if (page === 'market') {
    document.getElementById('market-page').classList.add('active');
    stopProductionRefresh();
    if (resourcesHeader) resourcesHeader.style.display = 'grid';
    mainNavButtons.forEach(btn => btn.style.display = 'none');
    if (marketBackBtn) marketBackBtn.style.display = '';
    loadMarketListings('wood');
  } else if (page === 'barracks') {
    document.getElementById('barracks-page').classList.add('active');
    document.getElementById('nav-barracks').classList.add('active');
    stopProductionRefresh();
    if (resourcesHeader) resourcesHeader.style.display = 'grid';
    mainNavButtons.forEach(btn => btn.style.display = '');
    if (marketBackBtn) marketBackBtn.style.display = 'none';
    renderBarracks();
  }
}