// ========================================
// DIBO Store - Router
// ========================================

const Router = {
    currentPage: 'dashboard',
    pageHistory: [],

    // Page modules mapping
    pages: {
        dashboard: Dashboard,
        warehouse: Warehouse,
        sales: Sales,
        receipt: Receipt,
        customers: Customers,
        cash: Cash,
        reports: Reports
    },

    // Initialize router
    init() {
        // Set up navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.navigate(page);
            });
        });

        // Back button
        document.getElementById('back-btn').addEventListener('click', () => {
            this.back();
        });

        // Navigate to initial page
        this.navigate('dashboard');
    },

    // Navigate to page
    async navigate(page, params = {}, addToHistory = true) {
        // Check admin access for reports
        if (page === 'reports' && !Auth.isAdmin()) {
            Utils.showToast('Доступ запрещён', 'error');
            return;
        }

        // Update history
        if (addToHistory && this.currentPage !== page) {
            this.pageHistory.push({ page: this.currentPage, params: {} });
        }

        this.currentPage = page;

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update header
        const titles = {
            dashboard: 'Главное',
            warehouse: 'Склад',
            sales: 'Продажа',
            receipt: 'Оприходование',
            customers: 'Покупатели',
            cash: 'Касса',
            reports: 'Отчёты'
        };
        
        document.getElementById('page-title').textContent = titles[page] || page;

        // Show/hide back button
        const backBtn = document.getElementById('back-btn');
        backBtn.classList.toggle('hidden', this.pageHistory.length === 0 || !params.showBack);

        // Load page content
        const contentArea = document.getElementById('content-area');
        
        if (this.pages[page]) {
            try {
                Utils.showLoading();
                contentArea.innerHTML = '';
                await this.pages[page].render(contentArea, params);
            } catch (error) {
                console.error(`Error loading page ${page}:`, error);
                contentArea.innerHTML = `
                    <div class="empty-state">
                        <h3>Ошибка загрузки</h3>
                        <p>Попробуйте обновить страницу</p>
                    </div>
                `;
            } finally {
                Utils.hideLoading();
            }
        }
    },

    // Go back
    back() {
        if (this.pageHistory.length > 0) {
            const prev = this.pageHistory.pop();
            this.navigate(prev.page, prev.params, false);
        }
    },

    // Clear history
    clearHistory() {
        this.pageHistory = [];
        document.getElementById('back-btn').classList.add('hidden');
    }
};
