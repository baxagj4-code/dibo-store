// ========================================
// Sales — Продажа (пошагово)
// ========================================

const Sales = {
    state: {
        step: 1,
        customerId: null,
        cart: [], // [{productId, qty, name, priceUSD, costUSD}]
        payment: null, // 'cash' | 'click' | 'debt'
        debtDue: null,
        debtComment: ''
    },

    async render(root) {
        this.state = { step: 1, customerId: null, cart: [], payment: null, debtDue: null, debtComment: '' };
        root.innerHTML = `<div id="sales-steps"></div>`;
        await this.renderStep();
    },

    async renderStep() {
        const container = document.getElementById('sales-steps');
        const s = this.state;

        // Stepper
        const stepper = `
            <div class="stepper">
                <div class="step ${s.step>=1?'active':''}"><div class="step-number">1</div><span>Покупатель</span></div>
                <div class="step-line ${s.step>1?'completed':''}"></div>
                <div class="step ${s.step>=2?'active':''}"><div class="step-number">2</div><span>Товары</span></div>
                <div class="step-line ${s.step>2?'completed':''}"></div>
                <div class="step ${s.step>=3?'active':''}"><div class="step-number">3</div><span>Подтверждение</span></div>
                <div class="step-line ${s.step>3?'completed':''}"></div>
                <div class="step ${s.step>=4?'active':''}"><div class="step-number">4</div><span>Оплата</span></div>
            </div>
        `;

        if (s.step === 1) {
            const customers = await Database.getCustomers();
            container.innerHTML = `
                ${stepper}
                <div class="card">
                    <div class="card-header"><div class="card-title">Выбор покупателя</div></div>
                    <div class="search-bar">
                        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input id="c-search" type="text" placeholder="Поиск по имени или телефону">
                    </div>
                    <div id="c-list" class="list"></div>
                    <div class="card-body mt-md">
                        <button id="new-customer" class="btn btn-primary btn-full">Создать нового</button>
                    </div>
                </div>
            `;

            const renderList = (q = '') => {
                const ql = q.toLowerCase();
                const filtered = customers.filter(c =>
                    (c.name||'').toLowerCase().includes(ql) ||
                    (c.phone||'').toLowerCase().includes(ql)
                );
                const list = document.getElementById('c-list');
                list.innerHTML = filtered.map(c => `
                    <div class="list-item" data-id="${c.id}">
                        <div class="list-item-content">
                            <div class="list-item-title">${Utils.escapeHtml(c.name || 'Без имени')}</div>
                            <div class="list-item-subtitle">${c.phone || ''}</div>
                        </div>
                        <div class="list-item-value">
                            <div class="list-item-amount">${Utils.formatCurrency(Utils.uzsToUsd(c.totalDebt || 0))}</div>
                            <div class="list-item-date">Долг</div>
                        </div>
                    </div>
                `).join('') || `<div class="empty-state"><h3>Покупатели не найдены</h3></div>`;
                list.querySelectorAll('.list-item').forEach(li => {
                    li.addEventListener('click', () => {
                        this.state.customerId = li.dataset.id;
                        this.state.step = 2;
                        this.renderStep();
                    });
                });
            };
            renderList();
            document.getElementById('c-search').addEventListener('input', Utils.debounce((e)=>renderList(e.target.value), 200));
            document.getElementById('new-customer').addEventListener('click', () => this.showNewCustomerModal(customers));
        }

        if (s.step === 2) {
            const products = await Database.getProducts();
            container.innerHTML = `
                ${stepper}
                <div class="card">
                    <div class="card-header"><div class="card-title">Выбор товаров</div></div>
                    <div class="search-bar">
                        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input id="p-search" type="text" placeholder="Поиск товара...">
                    </div>
                    <div id="p-list" class="product-list"></div>

                    <div class="card-body">
                        <div class="cart-items" id="cart-items"></div>
                        <div class="btn-group">
                            <button id="back1" class="btn btn-secondary">Назад</button>
                            <button id="next2" class="btn btn-primary">Далее</button>
                        </div>
                    </div>
                </div>
            `;

            const renderProducts = (q='') => {
                const ql = q.toLowerCase();
                const list = document.getElementById('p-list');
                const filtered = products.filter(p =>
                    (p.name||'').toLowerCase().includes(ql) &&
                    (p.quantity || 0) > 0
                );
                list.innerHTML = filtered.map(p => `
                    <div class="product-item" data-id="${p.id}">
                        <img class="product-image" src="${p.photoUrl || Storage.getPlaceholder()}">
                        <div class="product-info">
                            <div class="product-name">${Utils.escapeHtml(p.name||'')}</div>
                            <div class="product-category">${Utils.escapeHtml(p.category||'')}</div>
                            <div class="product-meta">
                                <div class="product-price">${Utils.formatCurrency(p.priceUSD || p.costUSD || 0)}</div>
                                <div class="product-stock">Остаток: ${p.quantity || 0}</div>
                            </div>
                        </div>
                        <div class="qty-input">
                            <button class="qty-btn" data-action="minus">-</button>
                            <input class="qty-value" type="number" min="1" step="1" value="1" style="width:56px">
                            <button class="qty-btn" data-action="plus">+</button>
                            <button class="btn btn-sm btn-outline" data-action="add">Добавить</button>
                        </div>
                    </div>
                `).join('') || `<div class="empty-state"><h3>Нет доступных товаров</h3></div>`;

                list.querySelectorAll('.product-item').forEach(row => {
                    const input = row.querySelector('.qty-value');
                    row.querySelector('[data-action="minus"]').onclick = () => input.value = Math.max(1, Number(input.value)-1);
                    row.querySelector('[data-action="plus"]').onclick = () => input.value = Number(input.value)+1;
                    row.querySelector('[data-action="add"]').onclick = () => {
                        const id = row.dataset.id;
                        const prod = products.find(x => x.id === id);
                        const qty = Math.min(Number(input.value || 1), prod.quantity || 0);
                        if (qty <= 0) return;
                        const ex = this.state.cart.find(c => c.productId === id);
                        if (ex) ex.qty = Math.min((ex.qty + qty), prod.quantity || 0);
                        else this.state.cart.push({
                            productId: id,
                            name: prod.name,
                            qty,
                            priceUSD: prod.priceUSD || prod.costUSD || 0,
                            costUSD: prod.costUSD || 0
                        });
                        renderCart();
                    };
                });
            };

            const renderCart = () => {
                const wrap = document.getElementById('cart-items');
                if (!this.state.cart.length) {
                    wrap.innerHTML = `<div class="empty-state"><h3>Корзина пуста</h3></div>`;
                    return;
                }
                wrap.innerHTML = this.state.cart.map((c, i) => `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${Utils.escapeHtml(c.name)}</div>
                            <div class="cart-item-price">Цена: ${Utils.formatCurrency(c.priceUSD)} | С/с: ${Utils.formatCurrency(c.costUSD)}</div>
                        </div>
                        <div class="qty-input">
                            <button class="qty-btn" data-index="${i}" data-act="m">-</button>
                            <input class="qty-value" data-index="${i}" type="number" min="1" value="${c.qty}">
                            <button class="qty-btn" data-index="${i}" data-act="p">+</button>
                        </div>
                        <button class="cart-item-remove" data-index="${i}">
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                `).join('');

                // handlers
                wrap.querySelectorAll('.qty-btn').forEach(b=>{
                    const i = Number(b.dataset.index);
                    const act = b.dataset.act;
                    b.onclick = () => {
                        const item = this.state.cart[i];
                        if (!item) return;
                        item.qty = Math.max(1, item.qty + (act==='p'?1:-1));
                        renderCart();
                    };
                });
                wrap.querySelectorAll('.qty-value').forEach(inp=>{
                    const i = Number(inp.dataset.index);
                    inp.onchange = () => {
                        const val = Math.max(1, Number(inp.value||1));
                        this.state.cart[i].qty = val;
                    };
                });
                wrap.querySelectorAll('.cart-item-remove').forEach(btn=>{
                    const i = Number(btn.dataset.index);
                    btn.onclick = () => {
                        this.state.cart.splice(i,1);
                        renderCart();
                    };
                });
            };

            renderProducts();
            renderCart();
            document.getElementById('p-search').addEventListener('input', Utils.debounce((e)=>renderProducts(e.target.value), 200));
            document.getElementById('back1').onclick = ()=>{ this.state.step = 1; this.renderStep(); };
            document.getElementById('next2').onclick = ()=>{
                if (!this.state.cart.length) return Utils.showToast('Добавьте товары', 'warning');
                this.state.step = 3; this.renderStep();
            };
        }

        if (s.step === 3) {
            // Подтверждение
            const totals = this.calculateTotals();
            container.innerHTML = `
                ${stepper}
                <div class="card">
                    <div class="card-header"><div class="card-title">Подтверждение продажи</div></div>
                    <div class="cart-items">
                        ${this.state.cart.map(c => `
                            <div class="cart-item">
                                <div class="cart-item-info">
                                    <div class="cart-item-name">${Utils.escapeHtml(c.name)}</div>
                                    <div class="cart-item-price">
                                        Кол-во: ${c.qty} | С/с: ${Utils.formatCurrency(c.costUSD)} | Цена: 
                                        <input type="number" class="price-input" data-id="${c.productId}" value="${c.priceUSD}" style="width:96px">
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div>Итого: ${Utils.formatCurrency(c.qty * c.priceUSD)}</div>
                                    <div class="text-muted">Прибыль: ${Utils.formatCurrency((c.priceUSD - c.costUSD) * c.qty)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="cart-summary">
                        <div class="cart-summary-row">
                            <span>Себестоимость</span><span>${Utils.formatCurrency(totals.cost)}</span>
                        </div>
                        <div class="cart-summary-row">
                            <span>Сумма продажи</span><span>${Utils.formatCurrency(totals.amount)}</span>
                        </div>
                        <div class="cart-summary-row total">
                            <span>Прибыль</span><span>${Utils.formatCurrency(totals.profit)}</span>
                        </div>
                    </div>
                    <div class="btn-group mt-md">
                        <button id="back2" class="btn btn-secondary">Назад</button>
                        <button id="next3" class="btn btn-primary">Далее</button>
                    </div>
                </div>
            `;

            container.querySelectorAll('.price-input').forEach(inp=>{
                inp.onchange = () => {
                    const id = inp.dataset.id;
                    const val = Number(inp.value || 0);
                    const item = this.state.cart.find(x => x.productId === id);
                    if (item) {
                        item.priceUSD = Math.max(0, val);
                        this.renderStep(); // перерисовать, чтобы обновились итоги
                    }
                };
            });

            document.getElementById('back2').onclick = ()=>{ this.state.step = 2; this.renderStep(); };
            document.getElementById('next3').onclick = ()=>{ this.state.step = 4; this.renderStep(); };
        }

        if (s.step === 4) {
            const totals = this.calculateTotals();
            container.innerHTML = `
                ${stepper}
                <div class="card">
                    <div class="card-header"><div class="card-title">Способ оплаты</div></div>
                    <div class="payment-methods">
                        <div class="payment-method" data-pay="cash">
                            <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/></svg>
                            <span>Наличные</span>
                        </div>
                        <div class="payment-method" data-pay="click">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
                            <span>Click</span>
                        </div>
                        <div class="payment-method" data-pay="debt">
                            <svg viewBox="0 0 24 24"><path d="M12 8v8M8 12h8"/></svg>
                            <span>В долг</span>
                        </div>
                    </div>

                    <div id="debt-fields" class="hidden">
                        <div class="form-group">
                            <label>Дата возврата (необязательно)</label>
                            <input id="debt-date" type="date">
                        </div>
                        <div class="form-group">
                            <label>Комментарий</label>
                            <textarea id="debt-comment" rows="2" placeholder="Комментарий..."></textarea>
                        </div>
                    </div>

                    <div class="cart-summary mt-md">
                        <div class="cart-summary-row">
                            <span>Сумма продажи</span><span>${Utils.formatCurrency(totals.amount)} (${Utils.formatCurrency(Utils.usdToUzs(totals.amount), 'UZS')})</span>
                        </div>
                        <div class="cart-summary-row total">
                            <span>Прибыль</span><span>${Utils.formatCurrency(totals.profit)}</span>
                        </div>
                    </div>

                    <div class="btn-group mt-md">
                        <button id="back3" class="btn btn-secondary">Назад</button>
                        <button id="finish" class="btn btn-success">Завершить продажу</button>
                    </div>
                </div>
            `;

            const pick = (type) => {
                this.state.payment = type;
                document.querySelectorAll('.payment-method').forEach(el=>{
                    el.classList.toggle('selected', el.dataset.pay === type);
                });
                document.getElementById('debt-fields').classList.toggle('hidden', type !== 'debt');
            };
            document.querySelectorAll('.payment-method').forEach(el=>{
                el.onclick = ()=> pick(el.dataset.pay);
            });

            document.getElementById('back3').onclick = ()=>{ this.state.step = 3; this.renderStep(); };
            document.getElementById('finish').onclick = ()=> this.finishSale();
        }
    },

    calculateTotals() {
        let amount = 0, cost = 0;
        this.state.cart.forEach(c => {
            amount += c.qty * c.priceUSD;
            cost += c.qty * c.costUSD;
        });
        return { amount, cost, profit: amount - cost };
    },

    async finishSale() {
        if (!this.state.payment) return Utils.showToast('Выберите способ оплаты', 'warning');

        const totals = this.calculateTotals();
        const items = this.state.cart.map(c => ({
            productId: c.productId,
            name: c.name,
            qty: c.qty,
            priceUSD: c.priceUSD,
            costUSD: c.costUSD,
            profitUSD: (c.priceUSD - c.costUSD) * c.qty
        }));

        const sale = {
            customerId: this.state.customerId,
            items,
            totalAmountUSD: Number(totals.amount.toFixed(2)),
            totalCostUSD: Number(totals.cost.toFixed(2)),
            totalProfitUSD: Number((totals.amount - totals.cost).toFixed(2)),
            payment: this.state.payment,
            status: 'completed',
            canEditUntil: Date.now() + 60*60*1000 // 1 час
        };

        // Транзакция: списание остатков, добавление продажи, касса/долг
        try {
            Utils.showLoading();
            const saleId = await Database.addSale(sale);

            // Списать остатки
            for (const it of items) {
                await Database.updateProductStock(it.productId, it.qty, 'subtract');
            }

            // Касса/долги
            if (sale.payment === 'debt') {
                // увеличить долг клиента
                await Database.updateCustomerDebt(sale.customerId, Utils.usdToUzs(totals.amount), 'add');
                // запись "долг"
                await Database.addCashOperation({
                    type: 'debt', // для отчета по кассе как не-поступление
                    amount: 0,
                    comment: `Продажа в долг #${saleId}`
                });
            } else {
                // Поступление в кассу
                await Database.addCashOperation({
                    type: 'income',
                    amount: Utils.usdToUzs(totals.amount),
                    comment: `Продажа #${saleId} (${sale.payment})`
                });
            }

            // Обновить сумму покупок клиента
            const customer = await Database.getCustomer(sale.customerId);
            if (customer) {
                await Database.updateCustomer(customer.id, {
                    totalPurchases: (customer.totalPurchases || 0) + Utils.usdToUzs(totals.amount)
                });
            }

            await Database.logAction({ action: 'add_sale', saleId, payment: sale.payment, amountUSD: totals.amount });

            Utils.showToast('Продажа завершена', 'success');
            Router.navigate('dashboard');
        } catch (e) {
            console.error(e);
            Utils.showToast('Ошибка завершения продажи', 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    showNewCustomerModal(existing) {
        const modal = Utils.createModal({
            title: 'Новый покупатель',
            content: `
                <div class="form-group">
                    <label>Имя</label>
                    <input id="nc-name" type="text" required>
                </div>
                <div class="form-group">
                    <label>Телефон</label>
                    <input id="nc-phone" type="tel" placeholder="+998">
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" data-action="cancel">Отмена</button>
                <button class="btn btn-primary" data-action="create">Создать</button>
            `,
            center: true
        });

        modal.element.querySelector('[data-action="cancel"]').onclick = modal.close;
        modal.element.querySelector('[data-action="create"]').onclick = async () => {
            const name = document.getElementById('nc-name').value.trim();
            const phone = document.getElementById('nc-phone').value.trim();
            if (!name) return Utils.showToast('Укажите имя', 'warning');
            const id = await Database.addCustomer({ name, phone });
            await Database.logAction({ action: 'add_customer', id });
            this.state.customerId = id;
            this.state.step = 2;
            modal.close();
            this.renderStep();
        };
    }
};
