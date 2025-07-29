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
const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL; // Загружаем секретный URL

if (!ADMIN_PANEL_URL) {
    console.error('Ошибка: ADMIN_PANEL_URL не задан в файле .env');
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

// --- ИЗМЕНЕНИЕ: Главная страница теперь index.html ---
// Этот обработчик будет отдавать index.html при заходе на корневой URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get(`/${ADMIN_PANEL_URL}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});


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
app.get('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const productsData = await fs.readFile(PRODUCTS_DB_PATH, 'utf8');
        const products = JSON.parse(productsData);
        
        const product = products.find(p => p.productId === id);
        
        if (product) {
            res.status(200).json(product);
        } else {
            res.status(404).json({ message: 'Товар не найден' });
        }
    } catch (error) {
        console.error("Ошибка получения товара по ID:", error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера', error: error.message });
    }
});

// Эндпоинт для входа пользователя
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email и пароль обязательны' });
        }
        
        const userData = await fs.readFile(USERS_DB_PATH, 'utf8');
        const user = JSON.parse(userData);

        if (user.profile.email.toLowerCase() !== email.toLowerCase()) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        const { salt, hash } = user.auth.providers.local;
        const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

        if (hash === verifyHash) {
            res.status(200).json({
                message: 'Вход успешен',
                user: {
                    userId: user.userId,
                    name: user.profile.displayName,
                    email: user.profile.email,
                    addresses: user.ownedVenues.map(v => ({ 
                        id: v.venueId, 
                        name: v.venueName, 
                        address: `${v.city}, ${v.street}` 
                    }))
                }
            });
        } else {
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
            status: 'new',
            items: cart,
            totalAmount,
            deliveryAddress
        };

        const ordersData = await fs.readFile(ORDERS_DB_PATH, 'utf8');
        const orders = JSON.parse(ordersData);
        orders.push(newOrder);
        await fs.writeFile(ORDERS_DB_PATH, JSON.stringify(orders, null, 2));

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

// =======================================================
// --- API ЭНДПОИНТЫ ДЛЯ АДМИН-ПАНЕЛИ (НОВЫЙ БЛОК) ---
// =======================================================

// Добавить новый товар
app.post('/api/admin/products', async (req, res) => {
    try {
        const productData = req.body;
        
        const newProduct = {
            ...productData,
            productId: `prod_${Date.now()}`,
            stock: {
                ...productData.stock,
                orderedQuantity: 0,
                availableQuantity: productData.stock.initialQuantity || 0,
            },
            images: [{ 
                imageId: `img_${Date.now()}`,
                ...productData.images[0]
            }],
            timestamps: { 
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };

        const productsData = await fs.readFile(PRODUCTS_DB_PATH, 'utf8');
        const products = JSON.parse(productsData);
        products.push(newProduct);
        await fs.writeFile(PRODUCTS_DB_PATH, JSON.stringify(products, null, 2));
        
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при добавлении товара', error: error.message });
    }
});

// Обновить существующий товар по ID
app.put('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        
        const productsData = await fs.readFile(PRODUCTS_DB_PATH, 'utf8');
        let products = JSON.parse(productsData);
        
        const productIndex = products.findIndex(p => p.productId === id);
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Товар не найден' });
        }
        
        const oldProduct = products[productIndex];
        
        products[productIndex] = {
            ...updatedData,
            stock: {
                ...updatedData.stock,
                orderedQuantity: oldProduct.stock.orderedQuantity || 0,
                availableQuantity: (updatedData.stock.initialQuantity || 0) - (oldProduct.stock.orderedQuantity || 0),
            },
            timestamps: {
                ...updatedData.timestamps,
                updatedAt: new Date().toISOString()
            }
        };

        await fs.writeFile(PRODUCTS_DB_PATH, JSON.stringify(products, null, 2));
        res.status(200).json(products[productIndex]);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении товара', error: error.message });
    }
});

// Удалить товар по ID
app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const productsData = await fs.readFile(PRODUCTS_DB_PATH, 'utf8');
        let products = JSON.parse(productsData);
        
        const updatedProducts = products.filter(p => p.productId !== id);
        
        if (products.length === updatedProducts.length) {
            return res.status(404).json({ message: 'Товар не найден' });
        }

        await fs.writeFile(PRODUCTS_DB_PATH, JSON.stringify(updatedProducts, null, 2));
        res.status(200).json({ message: 'Товар успешно удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении товара', error: error.message });
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

// --- ИЗМЕНЕНИЕ: Кнопка в меню теперь ведет на index.html ---
bot.start((ctx) => {
    ctx.reply(
        'Вітаю! 👋\n\nНатисніть кнопку нижче, щоб відкрити каталог продукції.',
        Markup.keyboard([
            [Markup.button.webApp('🍰 Каталог', `${WEB_APP_URL}/index.html`)],
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
