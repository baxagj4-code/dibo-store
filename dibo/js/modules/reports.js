// ========================================
// Reports — Отчёты (только админ)
// ========================================

const Reports = {
    async render(root) {
        if (!Auth.isAdmin()) {
            root.innerHTML = `<div class="empty-state"><h3>Доступ запрещён</h3></div>`;
            return;
        }

        root.innerHTML = `
            <div class="tabs">
                <button class="tab active" data-tab="sales">Продажи</button>
                <button class="tab" data-tab="cash">Касса</button>
                <button class="tab" data-tab="stock">Остатки</button>
            </div>
            <div id="rep-content"></div>
        `;

        const content = document.getElementById('rep-content');
        const activate = (tab) => {
            root.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
            if (tab==='sales') this.renderSales(content);
            if (tab==='cash') this.renderCash(content);
            if (tab==='stock') this.renderStock(content);
        };

        root.querySelectorAll('.tab').forEach(t => t.onclick = ()=> activate(t.dataset.tab));
        activate('sales');
    },

    async renderSales(el) {
        const periods = [
            { id: 'today', name: 'Сегодня' },
            { id: 'week', name: 'Неделя' },
            { id: 'month', name: 'Месяц' }
        ];

        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Период</div></div>
                <div class="filter-bar" id="rep-sales-filter">
                    ${periods.map((p,i)=>`<button class="filter-chip ${i===0?'active':''}" data-p="${p.id}">${p.name}</button>`).join('')}
                </div>
                <div id="rep-sales-body"></div>
            </div>
        `;

        const body = document.getElementById('rep-sales-body');
        const render = async (period) => {
            const sales = await Database.getSales(Utils.getDateRange(period));
            let revenue = 0, cost = 0, profit = 0;
            sales.forEach(s => { revenue += s.totalAmountUSD||0; cost += s.totalCostUSD||0; profit += s.totalProfitUSD||0; });

            body.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-label">Выручка</div><div class="stat-value">${Utils.formatCurrency(revenue)}</div></div>
                    <div class="stat-card"><div class="stat-label">Себестоимость</div><div class="stat-value">${Utils.formatCurrency(cost)}</div></div>
                    <div class="stat-card success"><div class="stat-label">Прибыль</div><div class="stat-value">${Utils.formatCurrency(profit)}</div></div>
                    <div class="stat-card"><div class="stat-label">Продаж</div><div class="stat-value">${sales.length}</div></div>
                </div>

                <div class="chart-container"><canvas id="rep-sales-pie"></canvas></div>
                <div class="chart-container"><canvas id="rep-cat-pie"></canvas></div>

                <div class="card mt-md">
                    <div class="card-header"><div class="card-title">Список продаж</div></div>
                    <div class="list">
                        ${sales.sort((a,b)=>b.createdAt-a.createdAt).map(s=>`
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Продажа #${s.id.slice(-6)}</div>
                                    <div class="list-item-subtitle">${Utils.formatDate(s.createdAt,'datetime')} — ${s.payment}</div>
                                </div>
                                <div class="list-item-value">
                                    <div class="list-item-amount">${Utils.formatCurrency(s.totalAmountUSD||0)}</div>
                                    <div class="list-item-date">Прибыль: ${Utils.formatCurrency(s.totalProfitUSD||0)}</div>
                                </div>
                            </div>
                        `).join('') || `<div class="empty-state"><h3>Нет данных</h3></div>`}
                    </div>
                </div>
            `;

            // Pie: Топ продаваемых товаров
            const byItem = {};
            sales.forEach(s => s.items?.forEach(it => {
                byItem[it.name] = (byItem[it.name]||0) + it.qty;
            }));
            const topItems = Object.entries(byItem).sort((a,b)=>b[1]-a[1]).slice(0,7);
            new Chart(document.getElementById('rep-sales-pie'), {
                type: 'pie',
                data: {
                    labels: topItems.map(x=>x[0]),
                    datasets: [{ data: topItems.map(x=>x[1]), backgroundColor: ['#2563eb','#16a34a','#ca8a04','#dc2626','#0891b2','#7c3aed','#f97316'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            // Pie: Продажи по категориям
            const byCat = {};
            sales.forEach(s => s.items?.forEach(it => {
                const cat = (it.category || 'Без категории');
                byCat[cat] = (byCat[cat]||0) + (it.priceUSD * it.qty);
            }));
            const catPairs = Object.entries(byCat);
            new Chart(document.getElementById('rep-cat-pie'), {
                type: 'pie',
                data: {
                    labels: catPairs.map(x=>x[0]),
                    datasets: [{ data: catPairs.map(x=>Number(x[1].toFixed(2))), backgroundColor: ['#0ea5e9','#22c55e','#eab308','#ef4444','#8b5cf6','#f59e0b'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        };

        document.getElementById('rep-sales-filter').querySelectorAll('.filter-chip').forEach(btn=>{
            btn.onclick = ()=>{
                document.querySelectorAll('#rep-sales-filter .filter-chip').forEach(b=>b.classList.remove('active'));
                btn.classList.add('active');
                render(btn.dataset.p);
            };
        });

        await render('today');
    },

    async renderCash(el) {
        const ops = await Database.getCashOperations();
        const income = ops.filter(o=>o.type==='income' || o.type==='debt_payment').reduce((s,o)=>s+(o.amount||0),0);
        const expense = ops.filter(o=>o.type==='expense').reduce((s,o)=>s+(o.amount||0),0);
        const closeCnt = ops.filter(o=>o.type==='close_shift').length;

        el.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card success"><div class="stat-label">Поступления</div><div class="stat-value">${Utils.formatCurrency(Utils.uzsToUsd(income))}</div></div>
                <div class="stat-card danger"><div class="stat-label">Расходы</div><div class="stat-value">${Utils.formatCurrency(Utils.uzsToUsd(expense))}</div></div>
                <div class="stat-card"><div class="stat-label">Сдач кассы</div><div class="stat-value">${closeCnt}</div></div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><div class="card-title">Операции</div></div>
                <div class="list">
                    ${ops.sort((a,b)=>b.createdAt-a.createdAt).map(op=>`
                        <div class="list-item">
                            <div class="list-item-content">
                                <div class="list-item-title">${Utils.escapeHtml(op.comment||op.type)}</div>
                                <div class="list-item-subtitle">${Utils.formatDate(op.createdAt,'datetime')}</div>
                            </div>
                            <div class="list-item-value">
                                <div class="list-item-amount ${op.type==='expense'?'negative':'positive'}">
                                    ${op.amount ? Utils.formatCurrency(Utils.uzsToUsd(op.amount)) : '—'}
                                </div>
                                <div class="list-item-date">${op.type}</div>
                            </div>
                        </div>
                    `).join('') || `<div class="empty-state"><h3>Нет данных</h3></div>`}
                </div>
            </div>
        `;
    },

    async renderStock(el) {
        const products = await Database.getProducts();
        const byCategory = {};
        products.forEach(p => {
            const cat = p.category || 'Без категории';
            if (!byCategory[cat]) byCategory[cat] = { qty: 0, costSum: 0 };
            byCategory[cat].qty += (p.quantity || 0);
            byCategory[cat].costSum += (p.quantity || 0) * (p.costUSD || 0);
        });

        const pairs = Object.entries(byCategory);

        el.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Позиций</div>
                    <div class="stat-value">${products.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Сумма остатков (с/с)</div>
                    <div class="stat-value">
                        ${Utils.formatCurrency(pairs.reduce((s, x)=> s + x[1].costSum, 0))} 
                    </div>
                </div>
            </div>

            <div class="chart-container"><canvas id="rep-stock-pie"></canvas></div>

            <div class="card mt-md">
                <div class="card-header"><div class="card-title">Остатки по категориям</div></div>
                <div class="list">
                    ${pairs.map(([cat, v])=>`
                        <div class="list-item">
                            <div class="list-item-content">
                                <div class="list-item-title">${Utils.escapeHtml(cat)}</div>
                                <div class="list-item-subtitle">Кол-во: ${v.qty}</div>
                            </div>
                            <div class="list-item-value">
                                <div class="list-item-amount">${Utils.formatCurrency(v.costSum)}</div>
                                <div class="list-item-date">С/с, $</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        new Chart(document.getElementById('rep-stock-pie'), {
            type: 'pie',
            data: {
                labels: pairs.map(x=>x[0]),
                datasets: [{ data: pairs.map(x=>Number(x[1].costSum.toFixed(2))), backgroundColor: ['#0ea5e9','#22c55e','#eab308','#ef4444','#8b5cf6','#f59e0b'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
};
