// --- ЗАВИСИМОСТИ ---
// Встроенные модули Node.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

// Установленные пакеты
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
require('dotenv').config();

// --- КОНФИГУРАЦИЯ ---
// Загружаем переменные из .env файла
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL;
const PORT = process.env.PORT || 3000;
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

// Проверяем, что все необходимые переменные окружения заданы
if (!BOT_TOKEN || !WEB_APP_URL || !GITHUB_SECRET) {
    console.error('Ошибка: Не все переменные окружения заданы в файле .env (BOT_TOKEN, WEB_APP_URL, GITHUB_WEBHOOK_SECRET)');
    process.exit(1);
}


// --- ИНИЦИАЛИЗАЦИЯ EXPRESS ---
const app = express();

// Middleware для обработки "сырого" тела запроса, это нужно для проверки подписи вебхука
app.use(express.raw({ type: 'application/json' }));

// Middleware для обслуживания статических файлов (HTML, CSS, JS) из папки 'public'
app.use(express.static(path.join(__dirname, 'public')));
// Middleware для обслуживания изображений из папки 'img'
app.use('/img', express.static(path.join(__dirname, 'img')));


// --- API ЭНДПОИНТЫ ---

// API эндпоинт для получения списка продуктов
app.get('/api/products', (req, res) => {
    fs.readFile(path.join(__dirname, 'options.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Ошибка чтения файла options.json:", err);
            return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    });
});

// Эндпоинт для вебхука от GitHub
app.post('/webhook/github', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        return res.status(401).send('No signature provided.');
    }

    const hmac = crypto.createHmac('sha256', GITHUB_SECRET);
    const digest = 'sha256=' + hmac.update(req.body).digest('hex');

    // Сравниваем подписи для безопасности
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        return res.status(401).send('Invalid signature.');
    }

    // Если подпись верна, запускаем скрипт развертывания
    console.log('Получен валидный вебхук. Запуск развертывания...');
    exec('sh ./deploy.sh', (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка скрипта развертывания: ${error}`);
            return;
        }
        console.log(`Вывод скрипта развертывания: ${stdout}`);
        if (stderr) {
            console.error(`Ошибки скрипта развертывания: ${stderr}`);
        }
    });

    res.status(200).send('Развертывание начато.');
});


// --- ИНИЦИАЛИЗАЦИЯ ТЕЛЕГРАМ-БОТА ---
const bot = new Telegraf(BOT_TOKEN);

// Обработчик команды /start
bot.start((ctx) => {
    ctx.reply(
        'Вітаю! Натисніть кнопку нижче, щоб відкрити наш магазин та зробити замовлення.',
        Markup.keyboard([
            [Markup.button.webApp('Відкрити магазин 🍰', WEB_APP_URL)]
        ]).resize()
    );
});


// --- ЗАПУСК ПРИЛОЖЕНИЯ ---
async function startApp() {
    try {
        // Запускаем веб-сервер
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        });
        // Запускаем бота
        await bot.launch();
        console.log('Бот успешно запущен');
    } catch (error) {
        console.error('Не удалось запустить приложение:', error);
    }
}

startApp();

// Обработка сигналов для корректного завершения работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
