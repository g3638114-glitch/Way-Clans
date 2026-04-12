# Database Migrations Guide

## Обзор

Проект Way Clans теперь использует надёжную систему автоматических миграций БД, которая:

- ✅ **Создаёт таблицы** при их отсутствии
- ✅ **Добавляет новые столбцы** в уже существующие таблицы
- ✅ **НЕ теряет данные** - все новые столбцы имеют DEFAULT значения
- ✅ **Безопасна** - использует `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- ✅ **Автоматична** - выполняется при каждом запуске приложения

## Архитектура

### Файлы

- **`src/database/init.js`** - главная точка инициализации БД
  - Вызывает `runMigrations()` при старте приложения
  - Экспортирует константы `AVAILABLE_BUILDINGS` и `INITIAL_USER_RESOURCES`

- **`src/database/migrations.js`** - система миграций
  - Содержит массив всех миграций в виде идемпотентных SQL операторов
  - Функция `runMigrations()` выполняет все миграции по порядку

### Порядок выполнения

1. `src/index.js` → вызывает `initializeDatabase()`
2. `initializeDatabase()` → вызывает `runMigrations()`
3. `runMigrations()` → подключается к БД и выполняет все миграции
4. Каждая миграция использует `IF NOT EXISTS`, поэтому безопасна

## Как добавить новый столбец

Если вам нужно добавить новый столбец в существующую таблицу:

1. Откройте `src/database/migrations.js`
2. Найдите секцию нужной таблицы (например, `=== USERS TABLE ===`)
3. Добавьте новую миграцию в массив `migrations`:

```javascript
{
  name: 'Add my_new_column to users table',
  sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS my_new_column TEXT DEFAULT 'default_value';`,
}
```

4. При следующем запуске приложения:
   - Если столбец уже существует - ничего не произойдёт (безопасно)
   - Если столбца нет - он будет добавлен с DEFAULT значением
   - Все существующие данные сохранятся

### Важные правила

- **Всегда указывайте DEFAULT** для новых столбцов, иначе будет ошибка при добавлении в таблицу с данными
- **Используйте `IF NOT EXISTS`** чтобы миграция была идемпотентной
- **Давайте понятное имя** каждой миграции для логов

## Текущие таблицы

### users
- id (UUID PRIMARY KEY)
- telegram_id (BIGINT UNIQUE)
- username (TEXT)
- first_name (TEXT)
- gold (BIGINT, default: 5000)
- wood (BIGINT, default: 2500)
- stone (BIGINT, default: 2500)
- meat (BIGINT, default: 500)
- jabcoins (BIGINT, default: 0)
- referral_count (INT, default: 0)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**Индексы:**
- idx_users_telegram_id на telegram_id

### user_buildings
- id (UUID PRIMARY KEY)
- user_id (UUID FK → users)
- building_type (TEXT)
- building_number (INT)
- level (INT, default: 1)
- collected_amount (BIGINT, default: 0)
- production_rate (BIGINT, default: 100)
- last_activated (TIMESTAMP, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**Уникальное ограничение:**
- (user_id, building_type, building_number)

**Индексы:**
- idx_buildings_user_id на user_id
- idx_buildings_type на building_type

### completed_quests
- id (UUID PRIMARY KEY)
- user_id (UUID FK → users)
- quest_id (TEXT)
- completed_at (TIMESTAMP)

**Уникальное ограничение:**
- (user_id, quest_id)

**Индексы:**
- idx_completed_quests_user_id на user_id

## Важные изменения

### last_activated vs last_collected

Ранее было расхождение в названии столбца:
- SQL-файлы использовали: `last_collected`
- Backend-код ожидал: `last_activated`

**Теперь везде используется: `last_activated`**

Это исправлено в:
- ✅ `src/database/init.js`
- ✅ `src/database/migrations.js`
- ✅ `src/db-schema.sql`
- ✅ `SUPABASE_SETUP.md`
- ✅ `SUPABASE_COMPLETE_SETUP.sql`

### RLS (Row Level Security)

RLS отключена на всех таблицах (`DISABLE ROW LEVEL SECURITY`), так как приложение работает в режиме бота и управляет доступом через Telegram.

## Логи миграций

При запуске приложения вы будете видеть логи вроде:

```
🚀 Initializing database...
📦 Connecting to PostgreSQL...
✅ Connected to PostgreSQL

🔄 Running database migrations...
✅ Create users table
✅ Create index on users.telegram_id
✅ Add referral_count column to users if missing
✅ Create user_buildings table
...
✅ Disable RLS on completed_quests table

✅ Database initialization completed successfully!
   Migrations run: 17
   (5 operations skipped - normal for existing databases)
```

"Operations skipped" - это нормально! Это означает, что таблицы/столбцы уже существуют, и миграция пропустила их (из-за `IF NOT EXISTS`).

## Разработка и тестирование

### При добавлении новой функции

Если вам нужны новые столбцы в таблице:

1. Добавьте миграцию в `src/database/migrations.js`
2. Обновите код, который использует эти столбцы
3. При следующем запуске приложения миграция выполнится автоматически
4. Данные пользователей не потеряются благодаря DEFAULT значениям

### При работе с чистой БД

Если вы удалили БД и создали новую:
- Все таблицы будут созданы автоматически
- Все столбцы будут добавлены в нужном порядке
- Готово к работе!

### При работе со старой БД

Если у вас была БД до этих изменений:
- Новые таблицы будут созданы
- Новые столбцы будут добавлены в существующие таблицы
- Все существующие данные сохранятся
- Готово к работе!

## Решение проблем

### "Column already exists"

Если вы видите это в логах - это **нормально**. Это означает, что столбец уже был добавлен вручную или в предыдущем запуске приложения. Миграция пропустит его благодаря `IF NOT EXISTS`.

### "Table doesn't exist"

Если получите ошибку что таблица не существует при работе приложения:
1. Проверьте logи инициализации БД
2. Убедитесь, что `DATABASE_URL` правильный
3. Перезагрузите приложение

### Потеря данных

**Данные не должны теряться**, так как:
- Новые таблицы создаются с `CREATE TABLE IF NOT EXISTS`
- Новые столбцы добавляются с DEFAULT значениями
- Используется `ON DELETE CASCADE` только для внешних ключей
- Никогда не используется `DROP TABLE` или `ALTER TABLE ... DROP COLUMN`

Если всё же случилось - восстановите из бэкапа Supabase.

## Заключение

Новая система миграций делает управление схемой БД:
- 🔒 **Безопасным** - данные не теряются
- 🤖 **Автоматическим** - выполняется при каждом старте
- 🛡️ **Надёжным** - идемпотентные операции
- 🧑‍💻 **Удобным** - просто добавляйте новые миграции в массив
