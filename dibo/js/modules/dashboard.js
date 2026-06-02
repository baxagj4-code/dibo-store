// ========================================
// Dashboard — Главное
// ========================================

const Dashboard = {
    async render(root) {
        const [exchangeRate, cashBalance, salesToday, salesWeek, salesMonth] = await Promise.all([
            Utils.loadExchangeRate(),
            Database.getCashBalance(),
            Database.getSales(Utils.getDateRange('today')),
            Database.getSales(Utils.getDateRange('week')),
            Database.getSales(Utils.getDateRange('month'))
        ]);

        const calcAgg = (sales) => {
            let revenue = 0;
            let cost = 0;
            let profit = 0;
            sales.forEach(s => {
                revenue += s.totalAmountUSD || 0;
                cost += s.totalCostUSD || 0;
                profit += (s.totalProfitUSD || 0);
            });
            return { revenue, cost, profit, count: sales.length };
        };

        const today = calcAgg(salesToday);
        const week = calcAgg(salesWeek);
        const month = calcAgg(salesMonth);

        root.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Касса и курс</div>
                    ${Auth.isAdmin() ? `
                        <button id="edit-rate" class="btn btn-sm btn-outline">Курс: ${Utils.formatNumber(exchangeRate)} сум</button>
                    ` : `<span class="text-muted">Курс: ${Utils.formatNumber(exchangeRate)} сум</span>`}
                </div>
                <div class="stats-grid">
                    <div class="stat-card primary">
                        <div class="stat-label">Касса</div>
                        <div class="stat-value currency">
                            <span class="currency-usd">${Utils.formatCurrency(Utils.uzsToUsd(cashBalance), 'USD')}</span>
                            <span class="currency-uzs">${Utils.formatCurrency(cashBalance, 'UZS')}</span>
                        </div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-label">Сегодня — прибыль</div>
                        <div class="stat-value currency">
                            <span class="currency-usd">${Utils.formatCurrency(today.profit)}</span>
                            <span class="currency-uzs">${Utils.formatCurrency(Utils.usdToUzs(today.profit), 'UZS')}</span>
                        </div>
                        <div class="stat-sub">${today.count} продаж</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Неделя — выручка</div>
                        <div class="stat-value currency">
                            <span class="currency-usd">${Utils.formatCurrency(week.revenue)}</span>
                            <span class="currency-uzs">${Utils.formatCurrency(Utils.usdToUzs(week.revenue), 'UZS')}</span>
                        </div>
                        <div class="stat-sub">${week.count} продаж</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-label">Месяц — прибыль</div>
                        <div class="stat-value currency">
                            <span class="currency-usd">${Utils.formatCurrency(month.profit)}</span>
                            <span class="currency-uzs">${Utils.formatCurrency(Utils.usdToUzs(month.profit), 'UZS')}</span>
                        </div>
                        <div class="stat-sub">${month.count} продаж</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Динамика продаж (30 дней)</div>
                </div>
                <div class="chart-container">
                    <canvas id="sales-chart"></canvas>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><div class="card-title">Последние операции кассы</div></div>
                <div id="last-cash" class="list"></div>
            </div>
        `;

        // Кнопка редактирования курса
        const rateBtn = document.getElementById('edit-rate');
        if (rateBtn) {
            rateBtn.addEventListener('click', async () => {
                const modal = Utils.createModal({
                    title: 'Изменить курс',
                    content: `
                        <div class="form-group">
                            <label>Курс USD → UZS</label>
                            <input type="number" id="rate-input" value="${exchangeRate}" min="1000" step="1">
                        </div>
                    `,
                    footer: `
                        <button class="btn btn-secondary" data-action="cancel">Отмена</button>
                        <button class="btn btn-primary" data-action="save">Сохранить</button>
                    `,
                    center: true
                });
                modal.element.querySelector('[data-action="cancel"]').onclick = modal.close;
                modal.element.querySelector('[data-action="save"]').onclick = async () => {
                    const val = Number(document.getElementById('rate-input').value || 0);
                    if (val > 0) {
                        await Utils.saveExchangeRate(val);
                        Utils.showToast('Курс обновлён', 'success');
                        modal.close();
                        Router.navigate('dashboard');
                    }
                };
            });
        }

        // График за 30 дней (по дням)
        const thirtyDaysAgo = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 29);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        })();

        const sales30 = (await Database.getSales({ start: thirtyDaysAgo, end: Date.now() }))
            .sort((a, b) => a.createdAt - b.createdAt);

        const days = [];
        const rev = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date(thirtyDaysAgo);
            d.setDate(d.getDate() + i);
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            const end = start + 24 * 60 * 60 * 1000 - 1;
            const sum = sales30
                .filter(s => s.createdAt >= start && s.createdAt <= end)
                .reduce((acc, s) => acc + (s.totalAmountUSD || 0), 0);
            days.push(`${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`);
            rev.push(Number(sum.toFixed(2)));
        }

        new Chart(document.getElementById('sales-chart'), {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Выручка, $',
                    data: rev,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    tension: 0.25,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }
        });

        // Последние операции кассы
        const ops = (await Database.getCashOperations()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
        const list = document.getElementById('last-cash');
        if (ops.length === 0) {
            list.innerHTML = `<div class="empty-state"><h3>Нет операций</h3></div>`;
        } else {
            list.innerHTML = ops.map(op => `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">${Utils.escapeHtml(op.comment || op.type)}</div>
                        <div class="list-item-subtitle">${Utils.formatDate(op.createdAt, 'datetime')}</div>
                    </div>
                    <div class="list-item-value list-item-amount ${op.type === 'expense' ? 'negative' : 'positive'}">
                        ${Utils.formatCurrency(Utils.uzsToUsd(op.amount))}
                    </div>
                </div>
            `).join('');
        }
    }
};
