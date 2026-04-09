# 🚀 Команды и шпаргалка для VPS

Быстрый справочник всех команд для управления ботом на VPS.

---

## 🔗 ПОДКЛЮЧЕНИЕ К VPS

```bash
# Подключиться по SSH
ssh root@194.33.35.18
```

---

## ⚙️ УПРАВЛЕНИЕ СЕРВИСОМ

### Запустить сервис

```bash
systemctl start way-clans-bot
```

### Остановить сервис

```bash
systemctl stop way-clans-bot
```

### Перезагрузить сервис

```bash
systemctl restart way-clans-bot
```

### Проверить статус сервиса

```bash
systemctl status way-clans-bot
```

### Перезагрузить все сразу (после обновления .env)

```bash
systemctl daemon-reload && systemctl restart way-clans-bot
```

---

## 📋 ЛОГИ И ОТЛАДКА

### Просмотреть последние 50 строк логов

```bash
journalctl -u way-clans-bot -n 50
```

### Смотреть логи в реальном времени (live)

```bash
journalctl -u way-clans-bot -f
```

Нажмите **Ctrl+C** для выхода.

### Просмотреть логи за последние 24 часа

```bash
journalctl -u way-clans-bot --since "24 hours ago"
```

### Просмотреть логи за сегодня

```bash
journalctl -u way-clans-bot --since today
```

### Просмотреть все логи (больше памяти)

```bash
journalctl -u way-clans-bot --no-pager | less
```

---

## 🖥️ ИНФОРМАЦИЯ О СЕРВЕРЕ

### Проверить использование ресурсов (интерактивно)

```bash
htop
```

Нажмите **q** для выхода.

### Быстро проверить память и CPU

```bash
free -h
ps aux | grep node
```

### Проверить место на диске

```bash
df -h
```

### Проверить, какой процесс занимает порт 3000

```bash
lsof -i :3000
```

или

```bash
netstat -tuln | grep 3000
```

### Проверить все открытые порты

```bash
netstat -tuln
```

---

## 📁 ФАЙЛОВАЯ СИСТЕМА

### Перейти в директорию приложения

```bash
cd /home/way-clans/app
```

### Просмотреть структуру проекта

```bash
ls -la /home/way-clans/app/
```

### Просмотреть содержимое .env файла

```bash
cat /home/way-clans/app/.env
```

### Отредактировать .env файл

```bash
nano /home/way-clans/app/.env
```

После редактирования нажмите **Ctrl+X**, затем **Y**, затем **Enter**.

### Просмотреть размер файлов

```bash
du -sh /home/way-clans/app/*
```

---

## 🔄 ОБНОВЛЕНИЕ КОДА

### Обновить код из GitHub

```bash
cd /home/way-clans/app
git pull origin main
```

### Обновить npm пакеты

```bash
cd /home/way-clans/app
npm install
```

### Полное обновление и перезапуск

```bash
cd /home/way-clans/app && \
git pull origin main && \
npm install && \
systemctl restart way-clans-bot
```

### Проверить статус git репозитория

```bash
cd /home/way-clans/app
git status
```

### Просмотреть историю коммитов

```bash
cd /home/way-clans/app
git log --oneline -10
```

---

## 🌐 NGINX И HTTPS

### Проверить синтаксис Nginx конфига

```bash
nginx -t
```

### Перезагрузить Nginx

```bash
systemctl restart nginx
```

### Просмотреть логи Nginx (ошибки)

```bash
tail -f /var/log/nginx/way-clans-error.log
```

### Просмотреть логи Nginx (доступ)

```bash
tail -f /var/log/nginx/way-clans-access.log
```

### Проверить все конфиги Nginx

```bash
ls -la /etc/nginx/sites-enabled/
```

### Просмотреть конфиг Way Clans

```bash
cat /etc/nginx/sites-available/way-clans
```

---

## 🔐 SSL СЕРТИФИКАТ (Let's Encrypt)

### Просмотреть информацию о сертификатах

```bash
certbot certificates
```

### Обновить сертификат вручную

```bash
certbot renew
```

### Просмотреть когда истекает сертификат

```bash
certbot certificates | grep -i "expir"
```

### Проверить статус автообновления

```bash
systemctl status certbot.timer
```

---

## 🐛 ОТЛАДКА ПРОБЛЕМ

### Проверить, слушает ли приложение порт 3000

```bash
curl http://localhost:3000
```

Должна быть ошибка (нужен HTTPS через Nginx), но это значит, что приложение слушает.

### Проверить, доступен ли сайт по HTTPS

```bash
curl -I https://way.clans.idlebat.online
```

Должен быть статус `200 OK`.

### Проверить DNS

```bash
nslookup way.clans.idlebat.online
```

или

```bash
dig way.clans.idlebat.online
```

### Проверить соединение с Supabase

```bash
curl https://your-project.supabase.co/rest/v1/users
```

Должна быть ошибка о доступе (это нормально), но соединение должно быть.

### Проверить переменные окружения в сервисе

```bash
systemctl show-environment way-clans-bot
```

---

## 🚨 БЫСТРЫЕ РЕШЕНИЯ ПРОБЛЕМ

### Проблема: "Бот не отвечает"

**Решение:**

```bash
# 1. Проверить логи
journalctl -u way-clans-bot -f

# 2. Проверить статус
systemctl status way-clans-bot

# 3. Перезагрузить сервис
systemctl restart way-clans-bot

# 4. Проверить переменные окружения в .env
cat /home/way-clans/app/.env
```

### Проблема: "MiniApp черный экран"

**Решение:**

```bash
# 1. Проверить Nginx
nginx -t
tail -f /var/log/nginx/way-clans-error.log

# 2. Проверить, доступен ли сайт
curl -I https://way.clans.idlebat.online

# 3. Перезагрузить Nginx
systemctl restart nginx
```

### Проблема: "Port 3000 already in use"

**Решение:**

```bash
# 1. Найти процесс на портe 3000
lsof -i :3000

# 2. Убить процесс (если нужно)
kill -9 <PID>

# 3. Перезагрузить сервис
systemctl restart way-clans-bot
```

### Проблема: "Супермется дополнительное место на диске"

**Решение:**

```bash
# 1. Очистить npm кэш
npm cache clean --force

# 2. Очистить логи (будьте осторожны!)
journalctl --disk-usage
journalctl --vacuum-time=7d  # Оставить логи за 7 дней

# 3. Удалить старые логи Node.js
rm -rf /var/log/journal/*
```

### Проблема: "Too many open files"

**Решение:**

```bash
# 1. Увеличить лимит
ulimit -n 4096

# 2. Постоянно (в /etc/security/limits.conf)
# Добавить:
# * soft nofile 4096
# * hard nofile 4096
```

---

## 📊 МОНИТОРИНГ

### Один раз в 5 секунд проверить статус

```bash
watch -n 5 'systemctl status way-clans-bot | grep -E "Active|Since"'
```

### Следить за логами и статусом одновременно

```bash
# В одном терминале
journalctl -u way-clans-bot -f

# В другом терминале
systemctl status way-clans-bot
```

### Получить сумму ошибок в логах

```bash
journalctl -u way-clans-bot -p err
```

---

## 🔄 АВТОМАТИЗАЦИЯ

### Создать скрипт для быстрого рестарта

```bash
cat > /usr/local/bin/restart-bot << 'EOF'
#!/bin/bash
systemctl restart way-clans-bot
journalctl -u way-clans-bot -n 10
EOF

chmod +x /usr/local/bin/restart-bot
```

Теперь можно просто набрать: `restart-bot`

### Создать скрипт для обновления с GitHub

```bash
cat > /usr/local/bin/update-bot << 'EOF'
#!/bin/bash
cd /home/way-clans/app
git pull origin main
npm install
systemctl restart way-clans-bot
echo "✅ Bot updated and restarted"
EOF

chmod +x /usr/local/bin/update-bot
```

Теперь можно просто набрать: `update-bot`

---

## 💾 РЕЗЕРВНАЯ КОПИЯ

### Создать резервную копию приложения

```bash
tar -czf way-clans-backup-$(date +%Y%m%d).tar.gz /home/way-clans/app
```

### Создать резервную копию базы данных (экспорт из Supabase)

```bash
# Используйте Supabase Dashboard для экспорта
# https://app.supabase.com → Project Settings → Database → Backups
```

---

## 🚀 ПОЛЕЗНЫЕ ОДНОРУЧНЫЕ КОМАНДЫ

### Проверить все и вывести статус

```bash
echo "=== SERVICE ===" && systemctl status way-clans-bot --no-pager && \
echo -e "\n=== NGINX ===" && nginx -t && \
echo -e "\n=== DISK ===" && df -h / && \
echo -e "\n=== MEMORY ===" && free -h
```

### Полный рестарт и проверка логов

```bash
systemctl restart way-clans-bot && sleep 2 && journalctl -u way-clans-bot -n 20
```

### Проверить, доступен ли бот

```bash
curl -s https://way.clans.idlebat.online | head -5
```

---

## 📝 ПРИМЕРЫ СКРИПТОВ

### Скрипт для выполнения после каждого обновления

```bash
#!/bin/bash
cd /home/way-clans/app
git pull origin main
npm install
npm run build  # если есть build скрипт
systemctl restart way-clans-bot
journalctl -u way-clans-bot -f
```

### Скрипт для автоматической очистки

```bash
#!/bin/bash
# Очистить старые логи
journalctl --vacuum-time=7d
# Очистить npm кэш
npm cache clean --force
# Перезагрузить сервис
systemctl restart way-clans-bot
echo "✅ Cleanup complete"
```

---

## 📞 КОНТАКТЫ

**VPS IP:** 194.33.35.18  
**Домен:** way.clans.idlebat.online  
**GitHub:** g3638114-glitch/Way-Clans

---

✨ **Готово! Используйте эту шпаргалку для управления ботом!**
