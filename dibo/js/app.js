// ========================================
// DIBO Store - Main Application
// ========================================

const App = {
    currentUser: null,

    // Initialize application
    async init() {
        console.log('Initializing DIBO Store...');

        // Initialize Telegram Web App
        this.initTelegram();

        // Initialize theme
        this.initTheme();

        // Check authentication
        if (Auth.isLoggedIn()) {
            this.currentUser = Auth.getUser();
            this.showMainApp();
        } else {
            this.showLogin();
        }

        // Setup event listeners
        this.setupEventListeners();
    },

    // Initialize Telegram Web App
    initTelegram() {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            
            // Apply Telegram theme
            if (tg.colorScheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
            
            document.body.classList.add('tg-theme');
        }
    },

    // Initialize theme
    initTheme() {
        const savedTheme = localStorage.getItem('diboTheme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            this.updateThemeIcon(savedTheme);
        }
    },

    // Toggle theme
    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('diboTheme', newTheme);
        this.updateThemeIcon(newTheme);
    },

    // Update theme icon
    updateThemeIcon(theme) {
        const icon = document.getElementById('theme-icon');
        if (theme === 'dark') {
            icon.innerHTML = `
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            `;
        } else {
            icon.innerHTML = `
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            `;
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
    },

    // Handle login
    handleLogin() {
        const login = document.getElementById('login').value;
        const password = document.getElementById('password').value;
        
        const user = Auth.login(login, password);
        
        if (user) {
            this.currentUser = user;
            document.getElementById('login-error').textContent = '';
            this.showMainApp();
            Utils.showToast(`Добро пожаловать, ${user.name}!`, 'success');
        } else {
            document.getElementById('login-error').textContent = 'Неверный логин или пароль';
        }
    },

    // Handle logout
    handleLogout() {
        Auth.logout();
        this.currentUser = null;
        this.showLogin();
        Utils.showToast('Вы вышли из системы', 'info');
    },

    // Show login screen
    showLogin() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('main-app').classList.remove('active');
        document.getElementById('login').value = '';
        document.getElementById('password').value = '';
    },

    // Show main app
    showMainApp() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('main-app').classList.add('active');
        
        // Update user badge
        document.getElementById('user-name').textContent = this.currentUser.name;
        
        // Show/hide admin-only elements
        const adminOnly = document.querySelectorAll('.admin-only');
        adminOnly.forEach(el => {
            el.classList.toggle('hidden', !Auth.isAdmin());
        });
        
        // Initialize router
        Router.init();
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
