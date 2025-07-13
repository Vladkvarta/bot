// --- ЗАВИСИМОСТИ ---
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
require('dotenv').config();

// --- КОНФИГУРАЦИЯ ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL; // This is now the base URL
const PORT = process.env.PORT || 3000;
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

if (!BOT_TOKEN || !WEB_APP_URL || !GITHUB_SECRET) {
    console.error('Ошибка: Не все переменные окружения заданы в файле .env (BOT_TOKEN, WEB_APP_URL, GITHUB_WEBHOOK_SECRET)');
    process.exit(1);
}

// --- ИНИЦИАЛИЗАЦИЯ EXPRESS ---
const app = express();
app.use(express.raw({ type: 'application/json' }));
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Serve images from the 'img' directory
app.use('/img', express.static(path.join(__dirname, 'img')));


// --- API ЭНДПОИНТЫ ---

// API endpoint to get the list of products
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

// Endpoint for GitHub webhook
app.post('/webhook/github', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        return res.status(401).send('No signature provided.');
    }

    const hmac = crypto.createHmac('sha256', GITHUB_SECRET);
    const digest = 'sha256=' + hmac.update(req.body).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        return res.status(401).send('Invalid signature.');
    }

    console.log('Получен валидный вебхук. Запуск развертывания...');
    exec('bash ./deploy.sh', (error, stdout, stderr) => {
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

// Function to create the main menu keyboard
const createMainMenu = () => {
    return Markup.keyboard([
        [Markup.button.webApp('🍰 Каталог', `${WEB_APP_URL}`)],
        [
            Markup.button.webApp('👤 Профіль', `${WEB_APP_URL}/login.html`),
            Markup.button.webApp('📋 Мої замовлення', `${WEB_APP_URL}/orders.html`)
        ]
    ]).resize();
};

// Handler for the /start and /menu commands
const sendMenu = (ctx) => {
    ctx.reply(
        'Вітаю! 👋\n\nОберіть опцію в меню нижче, щоб переглянути каталог або увійти до особистого кабінету.',
        createMainMenu()
    );
};

bot.start(sendMenu);
bot.command('menu', sendMenu);

// --- ЗАПУСК ПРИЛОЖЕНИЯ ---
async function startApp() {
    try {
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        });
        await bot.launch();
        console.log('Бот успешно запущен');
    } catch (error) {
        console.error('Не удалось запустить приложение:', error);
    }
}

startApp();

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
