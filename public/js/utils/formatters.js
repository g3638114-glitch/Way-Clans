// Format numbers with spaces (1000 → 1 000, 1234567 → 1 234 567)
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Format large numbers with abbreviations (100000 → 100K, 1200000 → 1.2M)
export function formatNumberShort(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}
