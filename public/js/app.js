// --- CENTRAL APP LOGIC ---

const App = {
    // Mock product data based on your main page design
    products: [
        { id: 1, name: 'Шоколадний торт "Велюр"', price: 890, wholesalePrice: 650 },
        { id: 2, name: 'Французькі макаруни', price: 450, wholesalePrice: 320 },
        { id: 3, name: 'Чізкейк "Полуниця"', price: 320, wholesalePrice: 240 },
        { id: 4, name: 'Капкейки "Ваніль"', price: 280, wholesalePrice: 200 },
        { id: 5, name: 'Тірамісу класичне', price: 180, wholesalePrice: 130 },
        { id: 6, name: 'Фруктовий тарт', price: 420, wholesalePrice: 310 },
    ],

    // --- AUTHENTICATION MODULE ---
    Auth: {
        // Mock login. In a real app, this would be a server call.
        login(email) {
            // Determine user status based on email for this demo
            const isWholesale = email.includes('opt');
            const user = {
                email: email,
                status: isWholesale ? 'опт' : 'розница',
                discount: isWholesale ? 0 : 5 // 5% discount for retail users
            };
            localStorage.setItem('user', JSON.stringify(user));
            alert('Вход выполнен успешно!');
            window.location.href = '/account.html';
        },

        logout() {
            localStorage.removeItem('user');
            localStorage.removeItem('cart'); // Also clear cart on logout
            alert('Вы вышли из системы.');
            // window.location.href = '/index.html';
             window.location.href = '/tAppMain.html';
        },

        getUser() {
            try {
                return JSON.parse(localStorage.getItem('user'));
            } catch (e) {
                return null;
            }
        },

        isLoggedIn() {
            return !!this.getUser();
        },

        // This function checks login status and redirects if necessary
        handleAccountLink(e) {
            e.preventDefault();
            if (App.Auth.isLoggedIn()) {
                window.location.href = '/account.html';
            } else {
                window.location.href = '/login.html';
            }
        }
    },

    // --- CART MODULE ---
    Cart: {
        get() {
            try {
                return JSON.parse(localStorage.getItem('cart')) || [];
            } catch (e) {
                return [];
            }
        },

        save(cart) {
            localStorage.setItem('cart', JSON.stringify(cart));
            this.updateCartCount();
        },

        add(productId) {
            let cart = this.get();
            const product = App.products.find(p => p.id === productId);
            if (!product) return;

            const existingItem = cart.find(item => item.id === productId);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({ ...product, quantity: 1 });
            }
            this.save(cart);
            alert(`"${product.name}" добавлен в корзину!`);
        },
        
        updateCartCount() {
            const cartCountEl = document.getElementById('cart-count');
            if(cartCountEl) {
                const cart = this.get();
                const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
                cartCountEl.textContent = totalItems;
            }
        }
    },

    // --- INITIALIZATION ---
    init() {
        // This function runs on every page
        document.addEventListener('DOMContentLoaded', () => {
            // Update cart counter in the header
            App.Cart.updateCartCount();

            // Attach event listener to the account link
            const accountLink = document.getElementById('account-link');
            if (accountLink) {
                accountLink.addEventListener('click', App.Auth.handleAccountLink);
            }
        });
    }
};

// Start the app logic
App.init();
