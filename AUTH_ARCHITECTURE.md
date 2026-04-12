# Архитектура аутентификации Way Clans

## 📋 Обзор

Way Clans использует **Telegram Web App API** для безопасной идентификации пользователей. Система поддерживает три способа получения userId:

## 🔑 Способы идентификации (в порядке приоритета)

### 1. URL параметр userId (Резервный вариант)
```
https://way.clans.idlebat.online/?userId=6910097562
```

**Когда используется:**
- Напрямая в ссылках
- Для тестирования
- Когда Web App недоступен

**Безопасность:** ⚠️ Низкая (userId не зашифрован)

**Применение в коде:**
```javascript
const params = new URLSearchParams(window.location.search);
const userId = params.get('userId');
```

---

### 2. initDataUnsafe из Telegram Web App
```javascript
window.Telegram.WebApp.initDataUnsafe.user.id
```

**Когда используется:**
- Первый метод при открытии как Telegram Web App
- Немедленная идентификация без задержки

**Безопасность:** ⚠️ Средняя (данные не подписаны)

**Преимущества:**
- Быстро (нет сетевого запроса)
- Всегда доступно в Telegram Web App

**Недостатки:**
- Не проверяется подпись Telegram
- Может быть подделано на клиенте

---

### 3. Проверенная initData на сервере (Рекомендуется)
```javascript
const response = await fetch('/api/user/auth/verify', {
  method: 'POST',
  body: JSON.stringify({ initData: window.Telegram.WebApp.initData })
});
```

**Когда используется:**
- Основной метод для безопасной идентификации
- Если initDataUnsafe не доступен
- Для критических операций

**Безопасность:** ✅ Высокая (HMAC-SHA256 подпись)

**Как работает:**
1. Клиент отправляет `window.Telegram.WebApp.initData` на сервер
2. Сервер проверяет HMAC-SHA256 подпись используя `TELEGRAM_BOT_TOKEN`
3. Если подпись валидна, сервер возвращает `userId`
4. Клиент использует полученный `userId`

**Алгоритм проверки подписи:**
```javascript
// На сервере в src/routes/user.js -> verifyTelegramInitData()
const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

if (computedHash !== hash) {
  return null; // Подпись невалидна - подделка!
}
```

---

## 🔄 Поток инициализации

### Сценарий 1: Открытие через кнопку Web App в Telegram (✅ Рекомендуется)

```
1. Пользователь нажимает кнопку "🎮 Открыть МiniApp" в Telegram
   ↓
2. Telegram открывает приложение как Web App
   ↓
3. window.Telegram.WebApp инициализируется
   ↓
4. initializeUserId() вызывается в фронтенде
   ↓
5. Проверяется URL параметр userId
   ├─ ✗ Не найден
   ↓
6. Проверяется initDataUnsafe
   ├─ ✓ Найдено → используется немедленно
   ├─ ✗ Не найдено
   ↓
7. Отправляется initData на сервер для проверки
   ↓
8. Сервер проверяет подпись и возвращает userId
   ↓
9. Фронтенд загружает данные пользователя из Supabase
```

### Сценарий 2: Открытие по прямой ссылке в браузере (❌ Не рекомендуется)

```
1. Пользователь открывает https://way.clans.idlebat.online/
   ↓
2. window.Telegram.WebApp недоступен или initData пусто
   ↓
3. initializeUserId() возвращает null
   ↓
4. Пользователь видит ошибку:
   "Не удалось загрузить данные игрока.
    Пожалуйста, откройте приложение через кнопку бота в Telegram."
```

---

## 🛡️ Безопасность

### Почему три способа?

1. **URL параметр** - для резервных ссылок и тестирования
2. **initDataUnsafe** - быстрая идентификация (хотя не проверяется)
3. **Проверенная initData** - криптографически безопасная идентификация

### Защита от подделок

Система защищена следующим образом:

1. **HMAC-SHA256 подпись**
   - Только сервер знает `TELEGRAM_BOT_TOKEN`
   - Клиент не может подделать валидную подпись
   - Даже если userId подделан в URL, он не будет использован

2. **Проверка initData на сервере**
   - Подпись вычисляется на сервере с использованием секретного токена
   - Невозможно подделать на клиенте
   - Защита от CSRF атак

3. **Rate limiting** (можно добавить)
   - Можно добавить ограничение запросов на /api/user/auth/verify
   - Защита от brute-force атак

---

## 📝 Правильная настройка BotFather

**⚠️ ВАЖНО:** Кнопка ДОЛЖНА быть типа `web_app`, а не обычная ссылка!

### Правильная настройка:
```
/edit_menu_button
→ Button
→ Text: 🎮 Открыть МiniApp
→ URL: https://way.clans.idlebat.online/
→ Type: Web App ✅
```

### Неправильная настройка:
```
/edit_menu_button
→ Button
→ Text: 🎮 Открыть МiniApp
→ URL: https://way.clans.idlebat.online/
→ Type: Regular URL ❌
```

---

## 🔧 Миграция на новую систему

Если вы обновили код и хотите убедиться что всё работает:

1. **Перезагрузите бота:**
   ```bash
   sudo systemctl restart way-clans-bot
   ```

2. **Откройте Telegram и нажмите на кнопку "🎮 Открыть МiniApp"**

3. **Проверьте логи:**
   ```bash
   sudo journalctl -u way-clans-bot -f
   ```

   Должны быть сообщения вроде:
   ```
   ✅ Verified initData for user 6910097562
   📝 Verified user ID from initData: 6910097562
   ```

4. **Если видите ошибку:**
   ```
   ⚠️ Invalid initData
   ```

   Проверьте:
   - Используется ли `web_app` кнопка в BotFather
   - Правильно ли установлен `TELEGRAM_BOT_TOKEN` в .env
   - Консоль браузера (DevTools) на предмет ошибок

---

## 📊 Таблица сравнения методов

| Метод | Скорость | Безопасность | Когда использовать |
|-------|----------|--------------|-------------------|
| URL параметр | Моментально | Низкая | Резервный вариант |
| initDataUnsafe | Моментально | Средняя | Первичная идентификация |
| Проверка на сервере | Медленнее на ~100ms | Высокая | Критические операции |

---

## 🚀 Будущие улучшения

1. **Rate limiting** на /api/user/auth/verify
2. **Кэширование** результатов проверки initData
3. **Логирование** попыток с невалидной подписью
4. **Refresh token** для долгоживущих сессий
5. **CORS** правильная настройка для других доменов

---

## 📞 Отладка

### Debug логирование

Откройте DevTools в браузере и смотрите консоль:

```javascript
// Проверить что Telegram Web App доступен
console.log(window.Telegram.WebApp);

// Проверить initData (но не показывайте это в production!)
console.log(window.Telegram.WebApp.initData);

// Проверить userId
console.log(appState.userId);
```

### Проверить подпись вручную

```bash
# На сервере можно добавить временный endpoint для отладки
curl -X POST http://localhost:3000/api/user/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"initData": "YOUR_INIT_DATA_HERE"}'
```

---

## 📚 Ссылки

- [Telegram Web App API](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [initData формат](https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app)
