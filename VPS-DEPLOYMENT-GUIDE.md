# 📖 Полная инструкция запуска Way Clans Bot на VPS

Этот гайд шаг за шагом объясняет, как запустить бота на VPS с нуля до полной работы 24/7.

---

## 🔧 ТРЕБОВАНИЯ

- **VPS IP:** 194.33.35.18
- **Домен:** way.clans.idlebat.online
- **OS:** Linux (Ubuntu 20.04+ или Debian)
- **Доступ:** SSH root доступ
- **GitHub:** g3638114-glitch/Way-Clans

---

## ✅ ШАГ 1: Подготовка VPS (начальная настройка)

### 1.1 Подключитесь к VPS по SSH

```bash
ssh root@194.33.35.18
```

Введите пароль от VPS.

### 1.2 Обновите систему

```bash
apt update && apt upgrade -y
```

### 1.3 Установите необходимые пакеты

```bash
apt install -y curl wget git nano htop nginx certbot python3-certbot-nginx
```

### 1.4 Установите Node.js (версия 18+)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
```

Проверьте установку:

```bash
node --version
npm --version
```

---

## 📂 ШАГ 2: Клонирование проекта с GitHub

### 2.1 Создайте директорию приложения

```bash
mkdir -p /home/way-clans/app
cd /home/way-clans
```

### 2.2 Клонируйте репозиторий

```bash
git clone https://github.com/g3638114-glitch/Way-Clans.git app
cd app
```

### 2.3 Проверьте структуру проекта

```bash
ls -la
```

Должны видеть:
```
src/
public/
package.json
.env.example
.gitignore
deploy.sh
way-clans-bot.service
supabase-setup.sql
```

---

## 📦 ШАГ 3: Установка зависимостей Node.js

### 3.1 Установите npm пакеты

```bash
cd /home/way-clans/app
npm install
```

Это установит:
- `express` - веб-сервер
- `telegraf` - Telegram бот
- `dotenv` - управление переменными окружения
- `@supabase/supabase-js` - Supabase клиент

---

## 🗄️ ШАГ 4: Настройка Supabase базы данных

### 4.1 Откройте Supabase в браузере

Перейдите на https://supabase.com и войдите в аккаунт.

### 4.2 Создайте новый проект

1. Нажмите **"New Project"**
2. Выберите регион (рекомендуется ближайший к серверу)
3. Задайте пароль для базы данных
4. Дождитесь создания проекта (~2 минуты)

### 4.3 Создайте таблицы через SQL Editor

1. В левом меню выберите **"SQL Editor"**
2. Нажмите **"New query"**
3. **Скопируйте содержимое файла `supabase-setup.sql` из проекта**
4. Вставьте в SQL Editor
5. Нажмите **"Run"** (или Ctrl+Enter)

Вы должны увидеть: ✅ Success message

### 4.4 Получите необходимые ключи доступа

1. В левом меню выберите **"Settings"** → **"API"**
2. Скопируйте:
   - **Project URL** (примерно: `https://xxxxx.supabase.co`)
   - **Anon public key** (начинается с `eyJ...`)

**СОХРАНИТЕ эти значения - они нужны для .env файла!**

---

## 🔑 ШАГ 5: Создание .env файла с секретами

### 5.1 Создайте файл .env на VPS

```bash
nano /home/way-clans/app/.env
```

### 5.2 Добавьте содержимое (замените значения!)

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=8460620669:AAGCfFJXlmeRCN_AbM99Cfhj3UJrPdcIFhM
TELEGRAM_WEBHOOK_URL=https://way.clans.idlebat.online

# Server
PORT=3000
NODE_ENV=production

# Supabase (скопируйте из шага 4.4)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...

# Database Connection (строка подключения)
DATABASE_URL=postgresql://postgres:KhamzatJaradat@db.lqbznbvljsqqnvwjxpmn.supabase.co:5432/postgres

# MiniApp
MINIAPP_URL=https://way.clans.idlebat.online
```

**Что означает каждая переменная:**

| Переменная | Значение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Ваш токен Telegram бота |
| `TELEGRAM_WEBHOOK_URL` | URL для вебхука (должен быть с HTTPS!) |
| `PORT` | Порт для Express сервера (3000 - внутренний) |
| `NODE_ENV` | `production` для VPS |
| `SUPABASE_URL` | URL вашего Supabase проекта |
| `SUPABASE_KEY` | API ключ Supabase |
| `DATABASE_URL` | Полная строка подключения к БД |
| `MINIAPP_URL` | URL где будет доступен MiniApp |

### 5.3 Сохраните файл

Нажмите **Ctrl+X**, затем **Y**, затем **Enter**

### 5.4 Проверьте файл

```bash
cat /home/way-clans/app/.env
```

### 5.5 Убедитесь, что .env не скоммитится

Проверьте `.gitignore`:

```bash
cat /home/way-clans/app/.gitignore | grep .env
```

Должно быть `.env` в списке.

---

## 🌐 ШАГ 6: Настройка Nginx с HTTPS

### 6.1 Создайте конфиг Nginx

```bash
nano /etc/nginx/sites-available/way-clans
```

### 6.2 Добавьте конфигурацию

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name way.clans.idlebat.online;
    return 301 https://$server_name$request_uri;
}

# HTTPS (будет создан Let's Encrypt после)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name way.clans.idlebat.online;

    # SSL сертификаты (будут добавлены автоматически)
    ssl_certificate /etc/letsencrypt/live/way.clans.idlebat.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/way.clans.idlebat.online/privkey.pem;

    # SSL параметры
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Логи
    access_log /var/log/nginx/way-clans-access.log;
    error_log /var/log/nginx/way-clans-error.log;

    # Proxy на Node.js приложение
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Специальная обработка для вебхука Telegram
    location /webhook {
        proxy_pass http://localhost:3000/webhook;
        proxy_http_version 1.1;
        proxy_set_header Content-Type application/json;
        proxy_set_header Host $host;
    }
}
```

### 6.3 Включите конфиг Nginx

```bash
ln -s /etc/nginx/sites-available/way-clans /etc/nginx/sites-enabled/way-clans
```

### 6.4 Удалите дефолтный сайт

```bash
rm -f /etc/nginx/sites-enabled/default
```

### 6.5 Проверьте синтаксис Nginx

```bash
nginx -t
```

Должно быть:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 6.6 Перезагрузите Nginx

```bash
systemctl restart nginx
```

---

## 🔐 ШАГ 7: Получение SSL сертификата (Let's Encrypt)

### 7.1 Установите SSL сертификат

```bash
certbot certonly --nginx -d way.clans.idlebat.online
```

Следуйте инструкциям:
1. Введите email для оповещений
2. Согласитесь с условиями
3. Согласитесь на маркетинговые письма (опционально)

### 7.2 Проверьте установку сертификата

```bash
ls -la /etc/letsencrypt/live/way.clans.idlebat.online/
```

Должны быть файлы:
- `fullchain.pem`
- `privkey.pem`

### 7.3 Настройте автоматическое обновление сертификата

```bash
systemctl enable certbot.timer
systemctl start certbot.timer
```

Сертификат будет обновляться автоматически.

---

## ⚙️ ШАГ 8: Настройка systemd сервиса

### 8.1 Скопируйте файл сервиса

```bash
cp /home/way-clans/app/way-clans-bot.service /etc/systemd/system/way-clans-bot.service
```

### 8.2 Отредактируйте сервис (опционально)

```bash
nano /etc/systemd/system/way-clans-bot.service
```

Проверьте, что пути правильные:
```
WorkingDirectory=/home/way-clans/app
EnvironmentFile=/home/way-clans/app/.env
ExecStart=/usr/bin/node /home/way-clans/app/src/index.js
```

### 8.3 Перезагрузите systemd конфигурацию

```bash
systemctl daemon-reload
```

### 8.4 Включите автозапуск сервиса

```bash
systemctl enable way-clans-bot
```

---

## 🚀 ШАГ 9: Запуск приложения

### 9.1 Стартуйте сервис

```bash
systemctl start way-clans-bot
```

### 9.2 Проверьте статус

```bash
systemctl status way-clans-bot
```

Должно быть:
```
● way-clans-bot.service - Way Clans Telegram Bot with MiniApp
     Loaded: loaded (/etc/systemd/system/way-clans-bot.service; enabled; ...)
     Active: active (running) since [дата и время]
```

### 9.3 Просмотрите логи

```bash
journalctl -u way-clans-bot -f
```

Нажмите **Ctrl+C** для выхода.

---

## ✅ ШАГ 10: Проверка работы

### 10.1 Тестируйте бота в Telegram

1. Откройте Telegram
2. Найдите вашего бота
3. Отправьте команду `/start`
4. Должны увидеть приветствие с кнопкой "🎮 Открыть МiniApp"

### 10.2 Нажмите на кнопку MiniApp

Должно открыться приложение с:
- 5 ресурсами (💰 💚 🪨 🍖 💎)
- Карточкой игрока
- Кнопками (Склад, Обмен, Атаковать)
- Меню внизу

### 10.3 Проверьте HTTPS

В браузере откройте:
```
https://way.clans.idlebat.online
```

Должна быть MiniApp без ошибок HTTPS.

---

## 🔍 КОМАНДЫ ДЛЯ ОТЛАДКИ

### Проверить статус сервиса

```bash
systemctl status way-clans-bot
```

### Посмотреть последние логи

```bash
journalctl -u way-clans-bot -n 50
```

### Посмотреть логи в реальном времени

```bash
journalctl -u way-clans-bot -f
```

### Перезагрузить приложение

```bash
systemctl restart way-clans-bot
```

### Остановить приложение

```bash
systemctl stop way-clans-bot
```

### Проверить, слушает ли приложение порт 3000

```bash
netstat -tuln | grep 3000
```

### Проверить логи Nginx

```bash
tail -f /var/log/nginx/way-clans-error.log
tail -f /var/log/nginx/way-clans-access.log
```

---

## 🔄 ОБНОВЛЕНИЕ КОДА

Когда вы внесли изменения и хотите обновить на VPS:

### 1. На локальном компьютере (или GitHub):

```bash
git add .
git commit -m "Описание изменений"
git push origin main
```

### 2. На VPS:

```bash
cd /home/way-clans/app
git pull origin main
npm install  # если были добавлены новые пакеты
systemctl restart way-clans-bot
```

### 3. Проверьте обновления:

```bash
journalctl -u way-clans-bot -f
```

---

## 🛡️ БЕЗОПАСНОСТЬ

### ✅ Сделано:

- `.env` файл НЕ коммитится в git (защищены секреты)
- SSL сертификат автоматически обновляется
- Nginx требует HTTPS для всех запросов
- Systemd запускает сервис с правильными правами

### ⚠️ Рекомендации:

1. **Регулярно обновляйте пакеты:**
   ```bash
   apt update && apt upgrade -y
   ```

2. **Мониторьте логи на ошибки:**
   ```bash
   journalctl -u way-clans-bot --since today
   ```

3. **Используйте сильный пароль для БД**

4. **Ограничивайте SSH доступ (опционально):**
   - Используйте только ключи (не пароли)
   - Меняйте SSH порт (по умолчанию 22)

---

## 📊 МОНИТОРИНГ (опционально)

### Проверить использование ресурсов

```bash
htop
```

### Проверить место на диске

```bash
df -h
```

### Проверить память

```bash
free -h
```

---

## 🚨 ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема: "Бот не отвечает на /start"

**Решение:**
1. Проверьте логи: `journalctl -u way-clans-bot -f`
2. Убедитесь, что `TELEGRAM_BOT_TOKEN` правильный
3. Проверьте, что сервис запущен: `systemctl status way-clans-bot`
4. Убедитесь, что `TELEGRAM_WEBHOOK_URL` = `https://way.clans.idlebat.online`

### Проблема: "MiniApp черный экран"

**Решение:**
1. Откройте браузер консоль (F12)
2. Проверьте консоль на ошибки
3. Убедитесь, что `MINIAPP_URL` = `https://way.clans.idlebat.online`
4. Перезагрузите MiniApp

### Проблема: "Ошибка подключения к Supabase"

**Решение:**
1. Проверьте `SUPABASE_URL` и `SUPABASE_KEY` в `.env`
2. Убедитесь, что IP сервера добавлен в Supabase Firewall (если нужно)
3. Проверьте, что таблицы созданы: `supabase-setup.sql`

### Проблема: "SSL сертификат не работает"

**Решение:**
```bash
# Проверьте статус сертификата
certbot certificates

# Обновите сертификат вручную
certbot renew
```

### Проблема: "Nginx ошибка при перезагрузке"

**Решение:**
```bash
# Проверьте синтаксис
nginx -t

# Если ошибка, отредактируйте конфиг
nano /etc/nginx/sites-available/way-clans
```

---

## 📋 ФИНАЛЬНЫЙ ЧЕКЛИСТ

- [ ] SSH доступ на VPS получен
- [ ] Node.js установлен (проверка: `node --version`)
- [ ] Проект клонирован в `/home/way-clans/app`
- [ ] npm пакеты установлены (`npm install`)
- [ ] Supabase проект создан
- [ ] Таблицы созданы (SQL скрипт выполнен)
- [ ] Ключи Supabase скопированы
- [ ] `.env` файл создан со всеми переменными
- [ ] Nginx конфиг создан и включен
- [ ] SSL сертификат получен
- [ ] Systemd сервис установлен и включен
- [ ] Сервис запущен и работает
- [ ] Бот отвечает на `/start` в Telegram
- [ ] MiniApp открывается без ошибок
- [ ] HTTPS работает на `https://way.clans.idlebat.online`

---

## 💬 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

**Логины для доступа:**
- SSH: `ssh root@194.33.35.18`
- Домен: `way.clans.idlebat.online`
- GitHub: `g3638114-glitch/Way-Clans`

**Порты:**
- 80 → перенаправляется на 443 (HTTP → HTTPS)
- 443 → Nginx с SSL
- 3000 → Node.js приложение (внутренний, не доступен снаружи)

**Файлы для отладки:**
- Логи бота: `journalctl -u way-clans-bot -f`
- Логи Nginx: `/var/log/nginx/way-clans-*.log`
- Конфиг Nginx: `/etc/nginx/sites-available/way-clans`
- Файл окружения: `/home/way-clans/app/.env`

---

✅ **Готово! Бот должен работать 24/7!**

Если возникли проблемы, проверьте:
1. Логи: `journalctl -u way-clans-bot -f`
2. Статус: `systemctl status way-clans-bot`
3. Nginx: `nginx -t`
