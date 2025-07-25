// --- ЗАВИСИМОСТИ ---
const fs = require('fs');
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

if (!BOT_TOKEN || !WEB_APP_URL || !GITHUB_SECRET) {
    console.error('Ошибка: Не все переменные окружения заданы в файле .env (BOT_TOKEN, WEB_APP_URL, GITHUB_WEBHOOK_SECRET)');
    process.exit(1);
}

// --- ИНИЦИАЛИЗАЦИЯ EXPRESS ---
const app = express();
// Этот обработчик перехватывает запросы к корневому URL ('/')
// и отдает tAppMain.html в качестве главной страницы.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tAppMain.html'));
});

// Middleware для обработки raw JSON (для вебхуков)
app.use(express.raw({ type: 'application/json' }));

// Middleware для раздачи всех остальных статических файлов
app.use(express.static(path.join(__dirname, 'public')));



// --- API ЭНДПОИНТЫ ---

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
app.get('/api/reviews', (req, res) => {
    fs.readFile(path.join(__dirname, 'reviews.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Ошибка чтения файла reviews.json:", err);
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

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        return res.status(401).send('Invalid signature.');
    }

    console.log('Получен валидный вебхук. Запуск развертывания в фоновом режиме...');
    
    // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
    // Открываем лог-файл для записи вывода скрипта
    const logStream = fs.openSync('deploy.log', 'a');

    // Запускаем скрипт как отдельный, отсоединенный процесс
    const subprocess = spawn('bash', ['./deploy.sh'], {
        detached: true,
        // Перенаправляем стандартный вывод и вывод ошибок в лог-файл
        stdio: ['ignore', logStream, logStream] 
    });

    // Позволяем родительскому процессу (боту) завершиться независимо от дочернего
    subprocess.unref(); 

    // Немедленно отвечаем GitHub, что мы приняли вебхук
    res.status(202).send('Развертывание начато в фоновом режиме.');
});


// --- ИНИЦИАЛИЗАЦИЯ ТЕЛЕГРАМ-БОТА ---
const bot = new Telegraf(BOT_TOKEN);

const createMainMenu = () => {
    return Markup.keyboard([
        [Markup.button.webApp('🍰 Каталог', `${WEB_APP_URL}/tAppMain.html`)],
        // [
        //     Markup.button.webApp('👤 Профіль', `${WEB_APP_URL}/login.html`),
        //     Markup.button.webApp('📋 Мої замовлення', `${WEB_APP_URL}/orders.html`)
        // ]
    ]).resize();
};

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

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
