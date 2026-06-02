// ========================================
// Customers — Покупатели и должники
// ========================================

const Customers = {
    list: [],

    async render(root) {
        this.list = await Database.getCustomers();
        root.innerHTML = `
            <div class="search-bar">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input id="cu-search" type="text" placeholder="Поиск по имени/телефону">
            </div>
            <div class="filter-bar">
                <button class="filter-chip active" data-mode="all">Все</button>
                <button class="filter-chip" data-mode="debt">Только должники</button>
                <button class="filter-chip" data-mode="new">Создать</button>
            </div>
            <div id="cu-list" class="list"></div>
        `;

        let mode = 'all';
        const renderList = (q = '') => {
            let arr = this.list;
            if (mode === 'debt') arr = arr.filter(c => (c.totalDebt || 0) > 0);
            const ql = q.toLowerCase();
            arr = arr.filter(c => (c.name||'').toLowerCase().includes(ql) || (c.phone||'').toLowerCase().includes(ql));
            const el = document.getElementById('cu-list');
            el.innerHTML = arr.map(c => `
                <div class="list-item" data-id="${c.id}">
                    <div class="list-item-content">
                        <div class="list-item-title">${Utils.escapeHtml(c.name||'Без имени')}</div>
                        <div class="list-item-subtitle">${c.phone || ''}</div>
                    </div>
                    <div class="list-item-value">
                        <div class="list-item-amount ${ (c.totalDebt||0) > 0 ? 'negative' : 'positive'}">
                            ${Utils.formatCurrency(Utils.uzsToUsd(c.totalDebt || 0))}
                        </div>
                        <div class="list-item-date">Долг</div>
                    </div>
                </div>
            `).join('') || `<div class="empty-state"><h3>Нет данных</h3></div>`;

            el.querySelectorAll('.list-item').forEach(row=>{
                row.onclick = ()=> this.openCard(row.dataset.id);
            });
        };

        document.getElementById('cu-search').addEventListener('input', Utils.debounce((e)=>renderList(e.target.value), 200));
        document.querySelectorAll('.filter-chip').forEach(btn=>{
            btn.onclick = ()=>{
                document.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));
                btn.classList.add('active');
                mode = btn.dataset.mode;
                if (mode==='new') this.createCustomer(); else renderList(document.getElementById('cu-search').value);
            };
        });

        renderList();
    },

    createCustomer() {
        const modal = Utils.createModal({
            title: 'Создать покупателя',
            content: `
                <div class="form-group">
                    <label>Имя</label>
                    <input id="cc-name" type="text">
                </div>
                <div class="form-group">
                    <label>Телефон</label>
                    <input id="cc-phone" type="tel" placeholder="+998">
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
            const name = document.getElementById('cc-name').value.trim();
            const phone = document.getElementById('cc-phone').value.trim();
            if (!name) return Utils.showToast('Имя обязательно', 'warning');
            await Database.addCustomer({ name, phone });
            await Database.logAction({ action: 'add_customer', name });
            Utils.showToast('Покупатель создан', 'success');
            modal.close();
            Router.navigate('customers');
        };
    },

    async openCard(id) {
        const c = await Database.getCustomer(id);
        const payments = await Database.getDebtPayments(id);
        const sales = (await Database.getSales()).filter(s=>s.customerId===id).sort((a,b)=>b.createdAt-a.createdAt);

        const modal = Utils.createModal({
            title: c.name || 'Покупатель',
            content: `
                <div class="list">
                    <div class="list-item">
                        <div class="list-item-content">
                            <div class="list-item-title">Телефон</div>
                            <div class="list-item-subtitle">${c.phone || ''}</div>
                        </div>
                        <div class="list-item-value">
                            <div class="list-item-amount">${Utils.formatCurrency(Utils.uzsToUsd(c.totalPurchases || 0))}</div>
                            <div class="list-item-date">Покупки</div>
                        </div>
                    </div>
                    <div class="list-item">
                        <div class="list-item-content">
                            <div class="list-item-title">Текущий долг</div>
                            <div class="list-item-subtitle">Сумма к оплате</div>
                        </div>
                        <div class="list-item-value">
                            <div class="list-item-amount negative">${Utils.formatCurrency(Utils.uzsToUsd(c.totalDebt || 0))}</div>
                            <div class="list-item-date">USD</div>
                        </div>
                    </div>
                </div>

                <div class="tabs">
                    <button class="tab active" data-tab="history">Покупки</button>
                    <button class="tab" data-tab="payments">Оплаты</button>
                </div>
                <div id="cu-tab"></div>
            `,
            footer: `
                <button class="btn btn-secondary" data-action="close">Закрыть</button>
                <button class="btn btn-success" data-action="pay">Оплатить долг</button>
            `
        });

        const renderHistory = () => {
            const el = modal.element.querySelector('#cu-tab');
            if (!sales.length) {
                el.innerHTML = `<div class="empty-state"><h3>Нет покупок</h3></div>`;
                return;
            }
            el.innerHTML = sales.map(s => `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">Продажа #${s.id.slice(-6)}</div>
                        <div class="list-item-subtitle">${Utils.formatDate(s.createdAt, 'datetime')} — ${s.payment}</div>
                    </div>
                    <div class="list-item-value">
                        <div class="list-item-amount">${Utils.formatCurrency(s.totalAmountUSD || 0)}</div>
                        <div class="list-item-date">Прибыль: ${Utils.formatCurrency(s.totalProfitUSD || 0)}</div>
                    </div>
                </div>
            `).join('');
        };

        const renderPayments = () => {
            const el = modal.element.querySelector('#cu-tab');
            if (!payments.length) {
                el.innerHTML = `<div class="empty-state"><h3>Нет оплат</h3></div>`;
                return;
            }
            el.innerHTML = payments.sort((a,b)=>b.createdAt-a.createdAt).map(p=>`
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">Оплата долга</div>
                        <div class="list-item-subtitle">${Utils.escapeHtml(p.comment||'')}</div>
                    </div>
                    <div class="list-item-value">
                        <div class="list-item-amount positive">${Utils.formatCurrency(Utils.uzsToUsd(p.amount || 0))}</div>
                        <div class="list-item-date">${Utils.formatDate(p.createdAt, 'datetime')}</div>
                    </div>
                </div>
            `).join('');
        };

        renderHistory();

        modal.element.querySelectorAll('.tab').forEach(t=>{
            t.onclick = ()=>{
                modal.element.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
                t.classList.add('active');
                if (t.dataset.tab==='history') renderHistory(); else renderPayments();
            };
        });

        modal.element.querySelector('[data-action="close"]').onclick = modal.close;
        modal.element.querySelector('[data-action="pay"]').onclick = ()=> this.payDebt(c, modal);
    },

    payDebt(customer, parentModal) {
        const modal = Utils.createModal({
            title: 'Погашение долга',
            content: `
                <div class="form-group">
                    <label>Сумма (UZS)</label>
                    <input id="pd-amount" type="number" min="0" step="1000" value="${Math.min(customer.totalDebt||0, customer.totalDebt||0)}">
                </div>
                <div class="form-group">
                    <label>Комментарий</label>
                    <textarea id="pd-comment" rows="2" placeholder="Например: частичное погашение"></textarea>
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" data-action="cancel">Отмена</button>
                <button class="btn btn-success" data-action="save">Оплатить</button>
            `,
            center: true
        });

        modal.element.querySelector('[data-action="cancel"]').onclick = modal.close;
        modal.element.querySelector('[data-action="save"]').onclick = async () => {
            const amount = Number(document.getElementById('pd-amount').value || 0);
            const comment = document.getElementById('pd-comment').value.trim();
            if (amount <= 0) return Utils.showToast('Введите сумму', 'warning');

            // уменьшить долг, записать оплату, поступление в кассу
            await Database.updateCustomerDebt(customer.id, amount, 'subtract');
            await Database.addDebtPayment({ customerId: customer.id, amount, comment });
            await Database.addCashOperation({ type: 'debt_payment', amount, comment: `Погашение долга: ${comment}` });
            await Database.logAction({ action: 'debt_payment', customerId: customer.id, amount });

            Utils.showToast('Оплата зафиксирована', 'success');
            modal.close();
            if (parentModal) { parentModal.close(); Router.navigate('customers'); }
        };
    }
};
