// ========================================
// Cash — Касса
// ========================================

const Cash = {
    async render(root) {
        const [balance, ops] = await Promise.all([
            Database.getCashBalance(),
            Database.getCashOperations()
        ]);

        root.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Текущий остаток</div></div>
                <div class="stats-grid">
                    <div class="stat-card primary">
                        <div class="stat-label">Касса</div>
                        <div class="stat-value currency">
                            <span class="currency-usd">${Utils.formatCurrency(Utils.uzsToUsd(balance))}</span>
                            <span class="currency-uzs">${Utils.formatCurrency(balance, 'UZS')}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Действия</div>
                        <div class="btn-group mt-sm">
                            <button id="income" class="btn btn-success btn-sm">Поступление</button>
                            <button id="expense" class="btn btn-danger btn-sm">Расход</button>
                            <button id="close-shift" class="btn btn-secondary btn-sm">Сдача кассы</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><div class="card-title">История операций</div></div>
                <div class="list" id="cash-list"></div>
            </div>
        `;

        const list = document.getElementById('cash-list');
        const sorted = ops.sort((a,b)=>b.createdAt-a.createdAt);
        list.innerHTML = sorted.map(op => `
            <div class="list-item">
                <div class="list-item-content">
                    <div class="list-item-title">${Utils.escapeHtml(op.comment || op.type)}</div>
                    <div class="list-item-subtitle">${Utils.formatDate(op.createdAt, 'datetime')}</div>
                </div>
                <div class="list-item-value">
                    <div class="list-item-amount ${op.type==='expense' ? 'negative' : 'positive'}">
                        ${op.amount ? Utils.formatCurrency(Utils.uzsToUsd(op.amount)) : '—'}
                    </div>
                    <div class="list-item-date">${op.type}</div>
                </div>
            </div>
        `).join('') || `<div class="empty-state"><h3>Нет операций</h3></div>`;

        document.getElementById('income').onclick = ()=> this.addOperation('income');
        document.getElementById('expense').onclick = ()=> this.addOperation('expense');
        document.getElementById('close-shift').onclick = ()=> this.addOperation('close_shift');
    },

    addOperation(type) {
        const titles = {
            income: 'Поступление',
            expense: 'Расход',
            close_shift: 'Сдача кассы'
        };

        const modal = Utils.createModal({
            title: titles[type],
            content: `
                ${type !== 'close_shift' ? `
                <div class="form-group">
                    <label>Сумма (UZS)</label>
                    <input id="co-amount" type="number" min="0" step="1000">
                </div>` : ''}
                <div class="form-group">
                    <label>Комментарий</label>
                    <textarea id="co-comment" rows="2" required></textarea>
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
            const comment = document.getElementById('co-comment').value.trim();
            let amount = 0;
            if (type !== 'close_shift') {
                amount = Number(document.getElementById('co-amount').value || 0);
                if (amount <= 0) return Utils.showToast('Введите сумму', 'warning');
            }
            await Database.addCashOperation({
                type: type === 'close_shift' ? 'close_shift' : (type === 'income' ? 'income' : 'expense'),
                amount,
                comment
            });
            await Database.logAction({ action: 'cash_op', subtype: type, amount });
            Utils.showToast('Операция сохранена', 'success');
            modal.close();
            Router.navigate('cash');
        };
    }
};
