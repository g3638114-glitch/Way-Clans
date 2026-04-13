# Way Clans - Telegram Bot with MiniApp

Telegram бот для игры Way Clans с интегрированным MiniApp, Supabase базой данных и поддержкой VPS развертывания через systemd.

## 📋 Возможности

- ✅ Telegram бот с командой `/start`
- ✅ MiniApp интерфейс с ресурсами и игровым контентом
- ✅ Система хранения данных в Supabase
- ✅ Модальные окна для продажи ресурсов и обмена золота
- ✅ Запуск на VPS через systemd
- ✅ Автоматический deploy из GitHub

## 🚀 Быстрый старт

### Локальная разработка

1. **Клонируйте репозиторий:**
```bash
git clone https://github.com/g3638114-glitch/Way-Clans.git
cd Way-Clans
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Создайте файл `.env`:**
```bash
cp .env.example .env
```

4. **Заполните переменные в `.env`:**
```
TELEGRAM_BOT_TOKEN=8460620669:AAGCfFJXlmeRCN_AbM99Cfhj3UJrPdcIFhM
TELEGRAM_WEBHOOK_URL=https://way.clans.idlebat.online
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your_project.supabase.co
SUPABASE_KEY=your_anon_key
DATABASE_URL=postgresql://postgres:KhamzatJaradat@db.lqbznbvljsqqnvwjxpmn.supabase.co:5432/postgres
MINIAPP_URL=https://way.clans.idlebat.online
```

5. **Запустите локально:**
```bash
npm run dev
```

## 🤖 Настройка BotFather для Web App

**⚠️ ВАЖНО:** Для правильной работы MiniApp необходимо настроить кнопку в BotFather как `web_app`, а НЕ как обычная ссылка!

### Шаги настройки:

1. **Откройте чат с [@BotFather](https://t.me/BotFather)**

2. **Введите команду для вашего бота:**
```
/mybots
```

3. **Выберите ваш бот из списка**

4. **Введите:**
```
/edit_menu_button
```

5. **Выберите "Button"**

6. **Укажите:**
   - **Text:** `🎮 Открыть МiniApp` (или другой текст)
   - **URL:** `https://way.clans.idlebat.online/`

7. **Убедитесь что кнопка типа `web_app`, а не обычная ссылка**
   - В BotFather она должна показываться как "Web App"
   - Если это просто URL, переделайте через `/edit_menu_button`

### Как проверить правильность настройки:

✅ **Правильно** (Web App):
- Кнопка открывается внутри Telegram
- Доступен `window.Telegram.WebApp`
- Данные игрока загружаются автоматически
- Отправляется `initData` на сервер для верификации

❌ **Неправильно** (обычная ссылка):
- Кнопка открывает внешний браузер
- `window.Telegram.WebApp` недоступен
- Данные игрока не загружаются
- Нет доступа к `initData`

### Альтернатива: Параметр userId в URL

Если по какой-то причине вы хотите использовать обычную ссылку, добавьте параметр `userId`:
```
https://way.clans.idlebat.online/?userId=YOUR_USER_ID
```

Но рекомендуется использовать `web_app` кнопку для полной функциональности и безопасности!

## 📦 Настройка Supabase

1. **Откройте [Supabase](https://supabase.co) и создайте проект**

2. **Скопируйте SQL из файла `supabase-setup.sql`**

3. **Откройте SQL Editor в Supabase и выполните запрос**

4. **Получите ключи доступа:**
   - Project URL → `SUPABASE_URL`
   - Anon Public Key → `SUPABASE_KEY`

## 🖥️ Развертывание на VPS

### Предварительные требования

- Node.js 16+ на сервере
- Git доступ
- SSH доступ к VPS
- Nginx или другой reverse proxy для HTTPS

### Пошаговая установка на VPS

1. **SSH на сервер:**
```bash
ssh root@194.33.35.18
```

2. **Создайте директорию для приложения:**
```bash
mkdir -p /home/way-clans
cd /home/way-clans
```

3. **Клонируйте репозиторий:**
```bash
git clone https://github.com/g3638114-glitch/Way-Clans.git app
cd app
```

4. **Установите зависимости:**
```bash
npm install
```

5. **Создайте файл `.env` с секретами:**
```bash
nano .env
```

Добавьте все необходимые переменные окружения (скопируйте из `.env.example`)

6. **Установите systemd сервис:**
```bash
sudo cp way-clans-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start way-clans-bot
sudo systemctl enable way-clans-bot
```

7. **Проверьте статус:**
```bash
sudo systemctl status way-clans-bot
```

8. **Просмотрите логи:**
```bash
journalctl -u way-clans-bot -f
```

### Использование скрипта Deploy

Если у вас есть SSH доступ, используйте скрипт:

```bash
chmod +x deploy.sh
./deploy.sh
```

## 🔄 Обновление на VPS

1. **Commit и push в GitHub:**
```bash
git add .
git commit -m "Описание изменений"
git push origin main
```

2. **На VPS:**
```bash
cd /home/way-clans/app
git pull origin main
npm install
sudo systemctl restart way-clans-bot
```

## 🌐 Настройка Nginx для HTTPS

Создайте конфиг `/etc/nginx/sites-available/way-clans`:

```nginx
server {
    listen 80;
    server_name way.clans.idlebat.online;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name way.clans.idlebat.online;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /webhook {
        proxy_pass http://localhost:3000/webhook;
        proxy_http_version 1.1;
        proxy_set_header Content-Type application/json;
    }
}
```

Включите конфиг:
```bash
sudo ln -s /etc/nginx/sites-available/way-clans /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 📁 Структура проекта

```
way-clans/
├── src/
│   ├── index.js          # Точка входа
│   ├── bot.js            # Логика Telegram бота
│   └── server.js         # Express сервер и API
├── public/
│   ├── index.html        # MiniApp интерфейс
│   ├── styles.css        # Стили
│   └── app.js            # MiniApp функциональность
├── package.json
├── .env                  # Секреты (не коммитится)
├── .env.example          # Пример .env
├── .gitignore
├── supabase-setup.sql    # SQL для базы данных
├── way-clans-bot.service # Systemd сервис
├── deploy.sh             # Скрипт развертывания
└── README.md
```

## 🔑 API Endpoints

### GET `/api/user/:userId`
Получить данные пользователя

**Response:**
```json
{
  "id": 1,
  "telegram_id": 123456789,
  "username": "testuser",
  "first_name": "Test",
  "gold": 120000,
  "wood": 50000,
  "stone": 30000,
  "meat": 10000,
  "jamcoins": 3,
  "level": 1,
  "experience": 0
}
```

### POST `/api/user/:userId/sell`
Продать ресурсы за золото

**Body:**
```json
{
  "wood": 1000,
  "stone": 500,
  "meat": 200
}
```

**Цены:**
- 🌲 Дерево: 10 золота за единицу
- 🪨 Камень: 15 золота за единицу
- 🍖 Мясо: 25 золота за единицу

### POST `/api/user/:userId/exchange`
Обменять золото на Jamcoins

**Body:**
```json
{
  "goldAmount": 1000000
}
```

**Курс:** 1,000,000 золота = 1 Jamcoin (минимум для обмена)

## 🐛 Решение проблем

### Бот не отвечает на `/start`
1. Проверьте, что токен правильно установлен в `.env`
2. Убедитесь, что `TELEGRAM_WEBHOOK_URL` совпадает с доменом
3. Проверьте логи: `journalctl -u way-clans-bot -f`

### Ошибка подключения к Supabase
1. Проверьте `SUPABASE_URL` и `SUPABASE_KEY`
2. Убедитесь, что таблицы созданы (выполните `supabase-setup.sql`)
3. Проверьте, что IP сервера добавлен в Supabase firewall

### MiniApp не загружается
1. Проверьте, что Nginx правильно настроен
2. Убедитесь, что HTTPS работает
3. Проверьте консоль браузера на ошибки

## 📞 Контакты и поддержка

GitHub: https://github.com/g3638114-glitch/Way-Clans
VPS IP: 194.33.35.18
Домен: way.clans.idlebat.online

## 📄 Лицензия

MIT
