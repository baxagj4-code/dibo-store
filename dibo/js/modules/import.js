// ========================================
// Import — Импорт начальных остатков из Excel
// Формат: Название | Себестоимость | Категория | Количество
// ========================================

const Import = {
    async render(root) {
        // Встраиваем в Склад для админа через кнопку — отдельной страницы нет
        // Этот модуль предоставляет UI-функцию:
        this.openModal();
    },

    openModal() {
        if (!Auth.isAdmin()) {
            return Utils.showToast('Доступ запрещён', 'error');
        }

        const modal = Utils.createModal({
            title: 'Импорт остатков (Excel)',
            content: `
                <p class="mb-md">Формат колонок: Название | Себестоимость ($) | Категория | Количество.</p>
                <input id="imp-file" type="file" accept=".xlsx,.xls">
                <div class="mt-md" id="imp-preview"></div>
            `,
            footer: `
                <button class="btn btn-secondary" data-action="cancel">Закрыть</button>
                <button class="btn btn-primary" data-action="import" disabled id="imp-start">Импортировать</button>
            `,
            center: true
        });

        let parsed = [];

        const fileInput = modal.element.querySelector('#imp-file');
        const preview = modal.element.querySelector('#imp-preview');
        const startBtn = modal.element.querySelector('#imp-start');

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

            // Найти заголовки
            // Допускаем порядок и регистронезависимо
            const header = rows[0].map(h => h.toString().trim().toLowerCase());
            const nameIdx = header.findIndex(h => h.includes('назван'));
            const costIdx = header.findIndex(h => h.includes('себесто'));
            const catIdx  = header.findIndex(h => h.includes('категор'));
            const qtyIdx  = header.findIndex(h => h.includes('количес'));

            if (nameIdx < 0 || costIdx < 0 || catIdx < 0 || qtyIdx < 0) {
                preview.innerHTML = `<div class="empty-state"><h3>Неверные заголовки колонок</h3></div>`;
                return;
            }

            const items = [];
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                if (!r[nameIdx]) continue;
                items.push({
                    name: String(r[nameIdx]).trim(),
                    costUSD: Number(Utils.parsePrice(r[costIdx]) || 0),
                    category: Utils.normalizeCategory(String(r[catIdx]).trim() || 'Аксессуары для ПК'),
                    quantity: Number(r[qtyIdx] || 0)
                });
            }

            parsed = items;

            preview.innerHTML = `
                <div class="card">
                    <div class="card-header"><div class="card-title">Будет импортировано: ${parsed.length} позиций</div></div>
                    <div class="list" style="max-height:240px;overflow:auto">
                        ${parsed.slice(0,50).map(p=>`
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">${Utils.escapeHtml(p.name)}</div>
                                    <div class="list-item-subtitle">${p.category} • Кол-во: ${p.quantity}</div>
                                </div>
                                <div class="list-item-value">
                                    <div class="list-item-amount">${Utils.formatCurrency(p.costUSD)}</div>
                                    <div class="list-item-date">С/с</div>
                                </div>
                            </div>
                        `).join('')}
                        ${parsed.length > 50 ? `<div class="text-center text-muted mt-sm">…и ещё ${parsed.length - 50}</div>` : ''}
                    </div>
                </div>
            `;
            startBtn.disabled = parsed.length === 0;
        });

        modal.element.querySelector('[data-action="cancel"]').onclick = modal.close;
        startBtn.onclick = async () => {
            if (!parsed.length) return;
            try {
                Utils.showLoading();
                await Database.importProducts(parsed);
                await Database.logAction({ action: 'import_products', count: parsed.length });
                Utils.showToast(`Импортировано: ${parsed.length}`, 'success');
                modal.close();
                Router.navigate('warehouse');
            } catch (e) {
                console.error(e);
                Utils.showToast('Ошибка импорта', 'error');
            } finally {
                Utils.hideLoading();
            }
        };
    }
};
