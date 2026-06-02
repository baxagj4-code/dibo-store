// ========================================
// Inventory — Инвентаризация (только админ)
// ========================================

const Inventory = {
    async render(root) {
        if (!Auth.isAdmin()) {
            root.innerHTML = `<div class="empty-state"><h3>Доступ запрещён</h3></div>`;
            return;
        }

        const products = await Database.getProducts();
        root.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Инвентаризация</div></div>
                <div class="filter-bar" id="inv-filters">
                    <button class="filter-chip active" data-cat="all">Все</button>
                    ${Utils.categories.map(c => `<button class="filter-chip" data-cat="${c}">${c}</button>`).join('')}
                </div>
                <div class="list" id="inv-list"></div>
                <div class="btn-group mt-md">
                    <button id="save-inv" class="btn btn-primary">Завершить и сохранить акт</button>
                </div>
            </div>
        `;

        let category = 'all';
        const current = products.map(p => ({ id: p.id, name: p.name, category: p.category, systemQty: p.quantity || 0, factQty: p.quantity || 0 }));

        const render = () => {
            const el = document.getElementById('inv-list');
            const arr = current.filter(x => category==='all' || x.category===category);
            el.innerHTML = arr.map((r,i)=>`
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">${Utils.escapeHtml(r.name)}</div>
                        <div class="list-item-subtitle">${r.category}</div>
                    </div>
                    <div class="list-item-value" style="min-width:160px">
                        <div class="text-muted">В системе: ${r.systemQty}</div>
                        <div class="form-group" style="margin:0">
                            <input type="number" min="0" step="1" value="${r.factQty}" data-i="${i}" style="width:100px">
                        </div>
                    </div>
                </div>
            `).join('') || `<div class="empty-state"><h3>Нет товаров</h3></div>`;

            el.querySelectorAll('input[type="number"]').forEach(inp=>{
                inp.onchange = ()=> {
                    const i = Number(inp.dataset.i);
                    current[i].factQty = Math.max(0, Number(inp.value||0));
                };
            });
        };

        render();

        document.getElementById('inv-filters').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-cat]');
            if (!btn) return;
            category = btn.dataset.cat;
            document.querySelectorAll('#inv-filters .filter-chip').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            render();
        });

        document.getElementById('save-inv').onclick = async () => {
            // Рассчитать разницу, записать акт и обновить остатки
            const diff = current
                .map(r => ({ productId: r.id, name: r.name, systemQty: r.systemQty, factQty: r.factQty, delta: (r.factQty - r.systemQty) }))
                .filter(x => x.delta !== 0);

            await Database.addInventory({
                items: diff,
                summary: {
                    changed: diff.length
                }
            });

            // Обновить остатки по дельте
            for (const d of diff) {
                const op = d.delta >= 0 ? 'add' : 'subtract';
                await Database.updateProductStock(d.productId, Math.abs(d.delta), op);
            }

            await Database.logAction({ action: 'inventory', changed: diff.length });
            Utils.showToast('Инвентаризация сохранена', 'success');
            Router.navigate('warehouse');
        };
    }
};
