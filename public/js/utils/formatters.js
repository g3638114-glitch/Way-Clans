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

export function formatDurationMs(ms) {
  if (!ms || ms <= 0) {
    return '0м';
  }

  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}м`;
  }

  if (minutes === 0) {
    return `${hours}ч`;
  }

  return `${hours}ч ${minutes}м`;
}
