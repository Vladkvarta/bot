/**
 * googleSheets.js
 * Модуль для чтения и записи данных в Google Таблицы.
 */
const { google } = require('googleapis');
const path = require('path');
const logger = require('./logger'); // Используем наш логгер

// --- НАСТРОЙКИ ---
const KEYFILEPATH = path.join(__dirname, 'credentials.json');
// Обновляем права доступа, чтобы разрешить и чтение, и запись
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Аутентификация
const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

/**
 * Преобразует массив массивов (ответ от Google Sheets) в массив объектов.
 * Первая строка массива используется как ключи для объектов.
 * @param {Array<Array<string>>} rows - Массив строк из таблицы.
 * @returns {Array<Object>} - Массив объектов.
 */
function rowsToObjects(rows) {
    if (!rows || rows.length < 2) {
        return [];
    }
    const headers = rows[0];
    const dataRows = rows.slice(1);

    return dataRows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        return obj;
    });
}

/**
 * Получает данные из указанного листа и диапазона Google Таблицы.
 * @param {string} spreadsheetId - ID вашей таблицы (из URL).
 * @param {string} range - Диапазон для чтения (например, 'Users!A:Z').
 * @returns {Promise<Array<Object>>} - Массив объектов с данными из таблицы.
 */
async function getSheetData(spreadsheetId, range) {
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: range,
        });

        const rows = response.data.values;
        if (rows && rows.length) {
            logger.info(`Успешно получено ${rows.length - 1} строк из диапазона "${range}"`);
            const dataObjects = rowsToObjects(rows);

            // Пример парсинга JSON из ячейки
            const parsedData = dataObjects.map(item => {
                // Предположим, у вас есть колонка 'userData' с JSON-строкой
                if (item.userData && typeof item.userData === 'string') {
                    try {
                        return JSON.parse(item.userData);
                    } catch (e) {
                        logger.error(`Не удалось распарсить JSON в строке для диапазона "${range}"`, { rowData: item.userData });
                        return null;
                    }
                }
                return item;
            }).filter(item => item !== null);

            return parsedData;
        } else {
            logger.warn(`Данные не найдены в диапазоне "${range}"`);
            return [];
        }
    } catch (err) {
        logger.error(`Ошибка при чтении данных из Google Sheets. Диапазон: "${range}"`, { error: err.message });
        throw err;
    }
}

/**
 * Добавляет новую строку с данными в конец указанного листа.
 * @param {string} spreadsheetId - ID вашей таблицы.
 * @param {string} range - Диапазон для добавления (например, 'Users!A1'). Google сам найдет последнюю пустую строку.
 * @param {Array<string|number>} rowData - Массив со значениями для новой строки. Порядок должен соответствовать столбцам.
 * @returns {Promise<Object>} - Ответ от Google Sheets API.
 */
async function appendSheetData(spreadsheetId, range, rowData) {
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: 'USER_ENTERED', // Обрабатывать данные так, как будто их ввел пользователь
            resource: {
                values: [rowData], // Данные для добавления должны быть массивом массивов
            },
        });
        logger.info(`Успешно добавлена 1 строка в диапазон "${range}"`);
        return response.data;
    } catch (err) {
        logger.error(`Ошибка при добавлении данных в Google Sheets. Диапазон: "${range}"`, { error: err.message });
        throw err;
    }
}

module.exports = { getSheetData, appendSheetData };


// ### Как использовать новую функцию

// Теперь вы можете импортировать `appendSheetData` и использовать её для добавления новых записей.

// #### Пример регистрации нового пользователя:

// javascript
// В вашем файле, отвечающем за регистрацию
const { appendSheetData } = require('./googleSheets');
const SPREADSHEET_ID = 'ВАШ_ID_ТАБЛИЦЫ';

async function registerNewUser(userObject) {
    try {
        // Превращаем объект пользователя в JSON-строку
        const userJsonString = JSON.stringify(userObject);

        // Создаем массив для новой строки.
        // Предполагается, что все данные пользователя хранятся в первой колонке (A).
        const newRow = [userJsonString]; 

        // Добавляем новую строку на лист 'Users'
        await appendSheetData(SPREADSHEET_ID, 'Users!A1', newRow);
        
        console.log('Пользователь успешно зарегистрирован в Google Sheets!');

    } catch (error) {
        console.error('Не удалось зарегистрировать пользователя:', error);
    }
}

// Пример вызова
const newUser = { /* ... объект с данными нового пользователя ... */ };
registerNewUser(newUser);
