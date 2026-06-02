// ========================================
—
// Suppliers — Поставщики (для оприходования)
// ========================================

const Suppliers = {
    async pickSupplier() {
        const suppliers = await Database.getSuppliers();

        return new Promise((resolve) => {
            const modal = Utils.createModal({
                title: 'Выбор поставщика',
                content: `
                    <div class="list" id="sup-list">
                        ${suppliers.map(s => `
                            <div class="list-item" data-id="${s.id}">
                                <div class="list-item-content">
                                    <div class="list-item-title">${Utils.escapeHtml(s.name||'')}</div>
                                    <div class="list-item-subtitle">${s.phone || ''}</div>
                                </div>
                                <div class="list-item-value">
                                    <span class="badge ${s.flag ? 'badge-success' : 'badge-primary'}">
                                        ${s.flag ? 'Sotib berishga olindi' : 'Стандарт'}
                                    </span>
                                </div>
                            </div>
                        `).join('') || `<div class="empty-state"><h3>Нет поставщиков</h3></div>`}
                    </div>
                `,
                footer: `
                    <button class="btn btn-secondary" data-action="cancel">Отмена</button>
                    <button class="btn btn-primary" data-action="new">Новый</button>
                `,
                center: true
            });

            modal.element.querySelectorAll('#sup-list .list-item').forEach(row=>{
                row.onclick = ()=> {
                    const id = row.dataset.id;
                    modal.close();
                    resolve({ id, type: 'existing' });
                };
            });
            modal.element.querySelector('[data-action="cancel"]').onclick = ()=>{ modal.close(); resolve(null); };
            modal.element.querySelector('[data-action="new"]').onclick = async ()=> {
                modal.close();
                const created = await this.createSupplier();
                resolve(created ? { id: created, type: 'new' } : null);
            };
        });
    },

    async createSupplier() {
        return new Promise((resolve)=>{
            const modal = Utils.createModal({
                title: 'Новый поставщик',
                content: `
                    <div class="form-group">
                        <label>Имя</label>
                        <input id="sup-name" type="text" required>
                    </div>
                    <div class="form-group">
                        <label>Телефон</label>
                        <input id="sup-phone" type="tel" placeholder="+998">
                    </div>
                    <div class="form-group">
                        <label><input id="sup-flag" type="checkbox"> Sotib berishga olindi</label>
                    </div>
                `,
                footer: `
                    <button class="btn btn-secondary" data-action="cancel">Отмена</button>
                    <button class="btn btn-primary" data-action="save">Сохранить</button>
                `,
                center: true
            });

            modal.element.querySelector('[data-action="cancel"]').onclick = ()=>{ modal.close(); resolve(null); };
            modal.element.querySelector('[data-action="save"]').onclick = async ()=> {
                const name = document.getElementById('sup-name').value.trim();
                const phone = document.getElementById('sup-phone').value.trim();
                const flag = document.getElementById('sup-flag').checked;
                if (!name) return Utils.showToast('Имя обязательное', 'warning');
                const id = await Database.addSupplier({ name, phone, flag });
                await Database.logAction({ action: 'add_supplier', id, name, flag });
                Utils.showToast('Поставщик добавлен', 'success');
                modal.close();
                resolve(id);
            };
        });
    }
};
