// Инициализация объекта Web App
const tg = window.Telegram.WebApp;

// Функция для загрузки и отображения продуктов
async function loadProducts() {
    try {
        // Запрос к нашему API для получения списка продуктов
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const products = await response.json();
        
        const container = document.getElementById('products-container');
        container.innerHTML = ''; // Очищаем контейнер

        for (const key in products) {
            const product = products[key];
            const productElement = document.createElement('div');
            productElement.className = 'product';
            
            // Используем относительный путь к изображениям
            const imageUrl = `../img/${key}.jpg`;

            productElement.innerHTML = `
                <img src="${imageUrl}" alt="${product.name}" class="product-img">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>Склад: ${product.Compound}</p>
                    <p>Вага: ${product.weight} гр.</p>
                </div>
                <div class="product-price">${product.price} грн</div>
            `;
            container.appendChild(productElement);
        }

    } catch (error) {
        console.error('Failed to load products:', error);
        const container = document.getElementById('products-container');
        container.textContent = 'Не вдалося завантажити товари. Спробуйте пізніше.';
    }
}

// Приветствие пользователя
function greetUser() {
    const user = tg.initDataUnsafe?.user;
    if (user && user.first_name) {
        const greetingElement = document.getElementById('user-greeting');
        greetingElement.textContent = `Вітаємо, ${user.first_name}!`;
    }
}

// Вызываем функции при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    tg.ready(); // Сообщаем Telegram, что приложение готово
    greetUser();
    loadProducts();
});