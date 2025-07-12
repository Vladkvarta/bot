const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// --- НАСТРОЙКИ ---
const BOT_TOKEN = process.env.bot_token;
const WEB_APP_URL = process.env.WEB_APP_URL; // Важно: URL должен быть HTTPS!
const PORT = process.env.PORT || 3000;

// --- ИНИЦИАЛИЗАЦИЯ БОТА ---
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply(
        'Вітаю! Натисніть кнопку нижче, щоб відкрити наш магазин та зробити замовлення.',
        Markup.keyboard([
            [Markup.button.webApp('Відкрити магазин 🍰', WEB_APP_URL)]
        ]).resize()
    );
});

// --- ИНИЦИАЛИЗАЦИЯ ВЕБ-СЕРВЕРА EXPRESS ---
const app = express();

// Middleware для обслуживания статических файлов (HTML, CSS, JS, изображения)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'img'))); // Отдельно для картинок

// API эндпоинт для получения списка продуктов
app.get('/api/products', (req, res) => {
    fs.readFile(path.join(__dirname, 'options.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading options.json:", err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(JSON.parse(data));
    });
});

// --- ЗАПУСК ---
async function startApp() {
    try {
        // Запускаем веб-сервер
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
        // Запускаем бота
        await bot.launch();
        console.log('Bot started successfully');
    } catch (error) {
        console.error('Failed to start the application:', error);
    }
}

startApp();

// Обработка сигналов для корректного завершения работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));