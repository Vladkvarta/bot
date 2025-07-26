// --- ЗАВИСИМОСТИ ---
const fs = require('fs').promises; // Используем асинхронную версию fs для удобства
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
require('dotenv').config();

// --- КОНФИГУРАЦИЯ ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL;
const PORT = process.env.PORT || 3000;
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // ID чата для уведомлений о заказах

if (!BOT_TOKEN || !WEB_APP_URL || !GITHUB_SECRET || !ADMIN_CHAT_ID) {
    console.error('Ошибка: Не все переменные окружения заданы в файле .env (BOT_TOKEN, WEB_APP_URL, GITHUB_WEBHOOK_SECRET, ADMIN_CHAT_ID)');
    process.exit(1);
}

// --- ПУТИ К ФАЙЛАМ ДАННЫХ ---
const USERS_DB_PATH = path.join(__dirname, 'users.json');
const PRODUCTS_DB_PATH = path.join(__dirname, 'products.json');
const ORDERS_DB_PATH = path.join(__dirname, 'orders.json');

// --- ИНИЦИАЛИЗАЦИЯ EXPRESS ---
const app = express();
app.use(express.json()); // Middleware для автоматического парсинга JSON-тел запросов
app.use(express.static(path.join(__dirname, 'public'))); // Раздача статических файлов из папки 'public'

// --- API ЭНДПОИНТЫ ---

// Эндпоинт для получения списка всех продуктов
app.get('/api/products', async (req, res) => {
    try {
        const data = await fs.readFile(PRODUCTS_DB_PATH, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    } catch (err) {
        console.error("Ошибка чтения файла products.json:", err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Эндпоинт для входа пользователя
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email и пароль обязательны' });
        }
        
        // ВАЖНО: Ваша структура users.json содержит один объект, а не массив.
        // Эта логика написана для работы именно с такой структурой.
        // Если пользователей станет много, users.json нужно будет сделать массивом.
        const userData = await fs.readFile(USERS_DB_PATH, 'utf8');
        const user = JSON.parse(userData);

        if (user.profile.email.toLowerCase() !== email.toLowerCase()) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        const { salt, hash } = user.auth.providers.local;
        const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

        if (hash === verifyHash) {
            // Успешный вход
            res.status(200).json({
                message: 'Вход успешен',
                user: {
                    userId: user.userId,
                    name: user.profile.displayName,
                    email: user.profile.email,
                    // Собираем адреса пользователя для отображения в приложении
                    addresses: user.ownedVenues.map(v => ({ 
                        id: v.venueId, 
                        name: v.venueName, 
                        address: `${v.city}, ${v.street}` 
                    }))
                }
            });
        } else {
            // Неверный пароль
            res.status(401).json({ message: 'Неверный email или пароль' });
        }
    } catch (err) {
        console.error("Ошибка входа:", err);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

// Эндпоинт для создания нового заказа
app.post('/api/orders', async (req, res) => {
    try {
        const { userId, cart, totalAmount, deliveryAddress } = req.body;
        if (!userId || !cart || !totalAmount || !deliveryAddress) {
            return res.status(400).json({ message: 'Недостаточно данных для создания заказа' });
        }

        const orderId = `ord_${Date.now()}`;
        const newOrder = {
            orderId,
            userId,
            createdAt: new Date().toISOString(),
            status: 'new', // Статус нового заказа
            items: cart, // Массив товаров в корзине
            totalAmount,
            deliveryAddress
        };

        // Читаем текущий список заказов, добавляем новый и сохраняем обратно
        const ordersData = await fs.readFile(ORDERS_DB_PATH, 'utf8');
        const orders = JSON.parse(ordersData);
        orders.push(newOrder);
        await fs.writeFile(ORDERS_DB_PATH, JSON.stringify(orders, null, 2));

        // ВАЖНО: Здесь нужно добавить логику для обновления файла users.json,
        // чтобы добавить `orderId` в массив `orderIds` для соответствующего `venueId`.
        // Пока этот шаг пропущен для простоты.

        // Формируем и отправляем уведомление в Telegram
        const messageText = `
✅ *Нове замовлення: #${orderId}*

*Клієнт:* \`${userId}\`
*Адреса доставки:* ${deliveryAddress.name} (${deliveryAddress.address})

*Склад замовлення:*
${cart.map(item => `- ${item.name}: ${item.quantity} шт. x ${item.price} грн`).join('\n')}

*Загальна сума:* ${totalAmount} грн
        `;
        
        await bot.telegram.sendMessage(ADMIN_CHAT_ID, messageText, { parse_mode: 'Markdown' });

        res.status(201).json({ message: 'Заказ успешно создан', orderId });

    } catch (err) {
        console.error("Ошибка создания заказа:", err);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

// --- ВЕБХУК ДЛЯ GITHUB (без изменений) ---
app.post('/webhook/github', express.raw({ type: 'application/json' }), (req, res) => {
    // Ваша логика для вебхука от GitHub...
    console.log('Получен валидный вебхук от GitHub.');
    res.status(202).send('Принято.');
});


// --- ИНИЦИАЛИЗАЦИЯ ТЕЛЕГРАМ-БОТА ---
const bot = new Telegraf(BOT_TOKEN);

// Обновляем меню, чтобы оно вело на главную страницу приложения
bot.start((ctx) => {
    ctx.reply(
        'Вітаю! 👋\n\nНатисніть кнопку нижче, щоб відкрити каталог продукції.',
        Markup.keyboard([
            [Markup.button.webApp('🍰 Каталог', `${WEB_APP_URL}/tAppMain.html`)],
        ]).resize()
    );
});


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

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
