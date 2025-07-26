document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand();

    let products = [];
    let cart = JSON.parse(localStorage.getItem('cart')) || {};

    // --- РОУТЕР ПРИЛОЖЕНИЯ ---
    if (document.getElementById('products-grid')) {
        initMainPage();
    } else if (document.getElementById('cart-items-container')) {
        // Логика для страницы confirm.html будет здесь
    }

    // --- ЛОГИКА ГЛАВНОЙ СТРАНИЦЫ ---
    async function initMainPage() {
        await fetchProducts();
        renderProducts();
        updateHeader();

        document.getElementById('view-order-btn').addEventListener('click', () => {
            if (Object.keys(cart).length === 0) {
                tg.showAlert('Ваш кошик порожній!');
            } else {
                window.location.href = '/confirm.html';
            }
        });
        
        document.getElementById('close-btn').addEventListener('click', () => {
            tg.close();
        });
    }

    async function fetchProducts() {
        try {
            const response = await fetch('/api/products');
            products = await response.json();
            localStorage.setItem('products', JSON.stringify(products));
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    }

    // --- ФУНКЦИИ ОТРИСОВКИ (RENDER) ---
    function renderProducts() {
        const grid = document.getElementById('products-grid');
        grid.innerHTML = '';
        products.forEach(product => {
            const isOutOfStock = product.stock.status === 'out_of_stock';
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-sm overflow-hidden flex flex-col';
            card.setAttribute('data-product-id', product.productId);

            // Используем ВАШ шаблон карточки
            card.innerHTML = `
                <div class="relative">
                    <img src="${product.images[0].url}" alt="${product.name}" class="w-full h-32 object-cover object-top ${isOutOfStock ? 'grayscale' : ''}">
                    ${product.isNew ? `<div class="absolute top-2 right-2 bg-primary text-secondary text-xs px-2 py-1 rounded-full font-medium">НОВИНКА</div>` : ''}
                    ${isOutOfStock ? `<div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"><span class="text-white font-bold text-center">Немає в наявності</span></div>` : ''}
                </div>
                <div class="p-3 flex flex-col flex-1">
                    <div class="flex-1">
                        <h3 class="font-medium text-sm mb-1">${product.name}</h3>
                        <p class="text-gray-600 text-xs">₴ ${product.price}</p>
                    </div>
                    <div class="flex items-center justify-center pt-2">
                        ${!isOutOfStock ? `
                        <div class="quantity-controls hidden flex items-center space-x-2">
                            <button class="quantity-decrease bg-gray-200 text-gray-700 w-7 h-7 rounded flex items-center justify-center text-sm cursor-pointer">-</button>
                            <span class="quantity text-sm font-medium min-w-[20px] text-center">1</span>
                            <button class="quantity-increase bg-primary text-secondary w-7 h-7 rounded flex items-center justify-center text-sm cursor-pointer">+</button>
                        </div>
                        <button class="add-to-cart bg-primary text-secondary px-3 py-1 rounded-lg text-xs font-medium cursor-pointer w-full">ДОДАТИ</button>
                        ` : ''}
                    </div>
                </div>
            `;
            grid.appendChild(card);
            updateProductCardUI(product.productId);
        });
        addCardEventListeners();
    }

    // --- УПРАВЛЕНИЕ КОРЗИНОЙ И UI ---
    function handleCartChange(productId, action) {
        const currentQuantity = cart[productId] || 0;
        switch (action) {
            case 'add': // Срабатывает при клике на "ДОДАТИ"
                cart[productId] = 1;
                break;
            case 'increase':
                cart[productId]++;
                break;
            case 'decrease':
                if (currentQuantity > 1) {
                    cart[productId]--;
                } else {
                    delete cart[productId];
                }
                break;
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateProductCardUI(productId);
        updateHeader();
    }

    function addCardEventListeners() {
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            const card = btn.closest('[data-product-id]');
            const productId = card.dataset.productId;
            btn.addEventListener('click', () => handleCartChange(productId, 'add'));
        });
        document.querySelectorAll('.quantity-increase').forEach(btn => {
            const card = btn.closest('[data-product-id]');
            const productId = card.dataset.productId;
            btn.addEventListener('click', () => handleCartChange(productId, 'increase'));
        });
        document.querySelectorAll('.quantity-decrease').forEach(btn => {
            const card = btn.closest('[data-product-id]');
            const productId = card.dataset.productId;
            btn.addEventListener('click', () => handleCartChange(productId, 'decrease'));
        });
    }

    function updateProductCardUI(productId) {
        const card = document.querySelector(`[data-product-id="${productId}"]`);
        if (!card) return;

        const quantity = cart[productId];
        const controls = card.querySelector('.quantity-controls');
        const addBtn = card.querySelector('.add-to-cart');
        const quantitySpan = card.querySelector('.quantity');

        if (quantity > 0) {
            quantitySpan.textContent = quantity;
            controls.classList.remove('hidden');
            addBtn.classList.add('hidden');
        } else {
            controls.classList.add('hidden');
            addBtn.classList.remove('hidden');
        }
    }

    function updateHeader() {
        const cartTotalEl = document.getElementById('cart-total');
        const cartBadgeEl = document.getElementById('cart-badge');

        const uniqueItemsCount = Object.keys(cart).length;
        
        if (uniqueItemsCount > 0) {
            const totalSum = Object.keys(cart).reduce((sum, productId) => {
                const product = products.find(p => p.productId === productId);
                return sum + (product.price * cart[productId]);
            }, 0);

            cartTotalEl.textContent = `₴ ${totalSum}`;
            cartTotalEl.classList.remove('hidden');
            
            cartBadgeEl.textContent = uniqueItemsCount;
            cartBadgeEl.classList.remove('hidden');
        } else {
            cartTotalEl.classList.add('hidden');
            cartBadgeEl.classList.add('hidden');
        }
    }
});
