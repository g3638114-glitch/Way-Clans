# 🏰 Руководство: Добавление новых уровней Казны и Склада

## Как работает система уровней

Казна (Treasury) и Склад (Storage) используют **динамическую систему уровней**, которая легко расширяется.

Вся конфигурация находится в **одном месте** для каждого:
- **Бэкенд**: `src/config/buildings.js`
- **Фронтенд**: `public/js/game/config.js`

> ⚠️ **ВАЖНО**: Оба файла должны быть идентичны! Если вы измените один, обновите и другой.

---

## Пример 1: Добавить уровень 6 для Казны

### Шаг 1. Отредактировать `src/config/buildings.js`

Найдите раздел `TREASURY_CONFIG`:

```javascript
export const TREASURY_CONFIG = {
  name: 'Казна',
  icon: '🏰',
  resource: 'gold',
  capacityPerLevel: [5000, 10000, 20000, 40000, 80000],  // ← Добавьте новое значение
  costs: {
    2: { gold: 500, stone: 300, wood: 300 },
    3: { gold: 1200, stone: 700, wood: 700 },
    4: { gold: 2500, stone: 1500, wood: 1500 },
    5: { gold: 5000, stone: 3000, wood: 3000 },
    6: { gold: 10000, stone: 6000, wood: 6000 },  // ← Добавьте новый уровень
  },
};
```

**Что изменить:**
1. В `capacityPerLevel` добавьте новое число в конец массива (например, `160000`)
2. В `costs` добавьте ключ `6` с объектом стоимости

### Шаг 2. Отредактировать `public/js/game/config.js`

Сделайте **точно то же самое** в фронтенд конфиге:

```javascript
export const TREASURY_CONFIG = {
  name: 'Казна',
  icon: '🏰',
  resource: 'gold',
  capacityPerLevel: [5000, 10000, 20000, 40000, 80000, 160000],  // ← Добавьте число
  costs: {
    2: { gold: 500, stone: 300, wood: 300 },
    3: { gold: 1200, stone: 700, wood: 700 },
    4: { gold: 2500, stone: 1500, wood: 1500 },
    5: { gold: 5000, stone: 3000, wood: 3000 },
    6: { gold: 10000, stone: 6000, wood: 6000 },  // ← Добавьте уровень
  },
};
```

### Готово! ✅

Функции `getTreasuryMaxLevel()` и `getTreasuryCapacity()` автоматически адаптируются к новому количеству уровней. Никаких других изменений не требуется!

---

## Пример 2: Добавить уровень 6 для Склада

Процесс **абсолютно аналогичный** для `STORAGE_CONFIG`:

### `src/config/buildings.js`

```javascript
export const STORAGE_CONFIG = {
  name: 'Склад',
  icon: '📦',
  capacityPerLevel: [5000, 10000, 20000, 40000, 80000, 160000],  // ← Добавьте число
  costs: {
    2: { gold: 300, stone: 200, wood: 200 },
    3: { gold: 800, stone: 500, wood: 500 },
    4: { gold: 1800, stone: 1000, wood: 1000 },
    5: { gold: 3500, stone: 2000, wood: 2000 },
    6: { gold: 7000, stone: 4000, wood: 4000 },  // ← Добавьте уровень
  },
};
```

### `public/js/game/config.js`

Сделайте то же самое в фронтенд файле.

---

## Как это работает "под капотом"

### Динамическое определение максимального уровня

```javascript
// Возвращает количество уровней на основе размера массива capacityPerLevel
export function getTreasuryMaxLevel() {
  return TREASURY_CONFIG.capacityPerLevel.length;
}
```

Поэтому:
- Если в `capacityPerLevel` 5 элементов → макс уровень 5
- Если в `capacityPerLevel` 6 элементов → макс уровень 6
- Если в `capacityPerLevel` 10 элементов → макс уровень 10

### Получение вместимости уровня

```javascript
export function getTreasuryCapacity(level) {
  const level_index = Math.max(0, Math.min(level - 1, TREASURY_CONFIG.capacityPerLevel.length - 1));
  return TREASURY_CONFIG.capacityPerLevel[level_index];
}
```

- **Уровень 1** → индекс 0 → `capacityPerLevel[0]`
- **Уровень 2** → индекс 1 → `capacityPerLevel[1]`
- **Уровень N** → индекс N-1 → `capacityPerLevel[N-1]`

---

## Проверка синхронизации

Убедитесь, что оба конфига одинаковые:

```bash
# Проверьте визуально или используйте diff
diff src/config/buildings.js public/js/game/config.js
```

Части, которые должны совпадать:
- `TREASURY_CONFIG.capacityPerLevel` должны быть идентичны
- `TREASURY_CONFIG.costs` должны быть идентичны
- `STORAGE_CONFIG.capacityPerLevel` должны быть идентичны
- `STORAGE_CONFIG.costs` должны быть идентичны

---

## Чего НЕ нужно делать

❌ **НЕ** жестко кодируйте `maxLevel` как число (например, `if (level >= 6)`)
❌ **НЕ** забывайте синхронизировать бэкенд и фронтенд конфиги
❌ **НЕ** используйте разные значения вместимости в разных файлах

---

## Примеры других расширений

### Добавить уровень 7, 8, 9...

Просто продолжайте добавлять значения в `capacityPerLevel` и соответствующие `costs`:

```javascript
capacityPerLevel: [5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1280000],
costs: {
  2: { ... },
  3: { ... },
  4: { ... },
  5: { ... },
  6: { ... },
  7: { ... },
  8: { ... },
  9: { ... },
}
```

---

## Важные файлы

Вся логика валидации работает через эти функции. Менять нужно **только конфиги**:

### Бэкенд
- ✅ `src/config/buildings.js` - измените конфиги
- ✅ `src/services/buildingService.js` - использует `getTreasuryMaxLevel()` и `getStorageMaxLevel()` (уже готово)

### Фронтенд
- ✅ `public/js/game/config.js` - измените конфиги
- ✅ `public/js/ui/dom.js` - использует `getTreasuryMaxLevel()` и `getStorageMaxLevel()` (уже готово)

---

## Итого

1. Отредактируйте `capacityPerLevel` - добавьте вместимость для нового уровня
2. Отредактируйте `costs` - добавьте стоимость для нового уровня (key = уровень)
3. Сделайте то же самое в обоих конфиг файлах (бэкенд и фронтенд)
4. **Готово!** Все функции автоматически адаптируются 🎉

