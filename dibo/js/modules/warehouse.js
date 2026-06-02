// ========================================
// Warehouse — Склад
// ========================================

const Warehouse = {
    products: [],
    filtered: [],
    category: 'all',
    search: '',

    async render(root) {
        this.products = await Database.getProducts();
        this.filtered = this.products;

        root.innerHTML = `
            <div class="search-bar">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input id="wh-search" type="text" placeholder="Поиск по названию...">
            </div>

            <div class="filter-bar" id="wh-filters">
                <button class="filter-chip ${this.category==='all'?'active':''}" data-cat="all">Все</button>
                ${Utils.categories.map(c => `
                    <button class="filter-chip" data-cat="${c}">${c}</button>
                `).join('')}
            </div>

            ${Auth.isAdmin() ? `
            <div class="btn-group mb-md">
                <button id="add-product" class="btn btn-primary">Добавить товар</button>
                <button id="bulk-photo" class="btn btn-secondary">Массовая загрузка фото</button>
            </div>
            `: ''}

            <div id="wh-list" class="product-list"></div>
        `;

        document.getElementById('wh-search').addEventListener('input', Utils.debounce((e) => {
            this.search = e.target.value.toLowerCase().trim();
            this.applyFilters(root);
        }, 200));

        document.getElementById('wh-filters').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-cat]');
            if (!btn) return;
            this.category = btn.dataset.cat;
            document.querySelectorAll('#wh-filters .filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.applyFilters(root);
        });

        if (Auth.isAdmin()) {
            document.getElementById('add-product').addEventListener('click', () => this.showAddProductModal());
            document.getElementById('bulk-photo').addEventListener('click', () => this.showBulkPhotoModal());
        }

        this.renderList();
    },

    applyFilters() {
        this.filtered = this.products.filter(p => {
            const byCat = this.category === 'all' || (p.category === this.category);
            const byText = !this.search || (p.name || '').toLowerCase().includes(this.search);
            return byCat && byText;
        });
        this.renderList();
    },

    renderList() {
        const list = document.getElementById('wh-list');
        if (!this.filtered.length) {
            list.innerHTML = `<div class="empty-state"><h3>Товары не найдены</h3></div>`;
            return;
        }

        list.innerHTML = this.filtered.map(p => {
            const low = (p.quantity || 0) <= 2 && (p.quantity || 0) > 0;
            const out = (p.quantity || 0) === 0;
            const priceUsd = p.priceUSD || null; // рекомендованная цена продажи (может отсутствовать)
            const costUsd = p.costUSD || 0;

            return `
                <div class="product-item" data-id="${p.id}">
                    <img class="product-image" src="${p.photoUrl || Storage.getPlaceholder()}" alt="">
                    <div class="product-info">
                        <div class="product-name">${Utils.escapeHtml(p.name || '')}</div>
                        <div class="product-category">${Utils.escapeHtml(p.category || '')}</div>
                        <div class="product-meta">
                            <div class="product-price">${priceUsd ? Utils.formatCurrency(priceUsd) : `<span class="text-muted">без цены</span>`}</div>
                            <div class="product-stock ${out ? 'out' : (low ? 'low' : '')}">Остаток: ${p.quantity || 0}</div>
                            <div class="text-muted">С/с: ${Utils.formatCurrency(costUsd)}</div>
                        </div>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-sm btn-outline" data-action="view">Открыть</button>
                        ${Auth.isAdmin() ? `<button class="btn btn-sm btn-secondary" data-action="edit">Редакт.</button>
                        <button class="btn btn-sm btn-danger" data-action="delete">Удалить</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.product-item').forEach(row => {
            const id = row.dataset.id;
            row.querySelector('[data-action="view"]').addEventListener('click', () => this.showProductCard(id));
            if (Auth.isAdmin()) {
                row.querySelector('[data-action="edit"]').addEventListener('click', () => this.showEditProductModal(id));
                row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
                    const ok = await Utils.confirm('Удалить товар? Это действие необратимо.');
                    if (!ok) return;
                    await Database.deleteProduct(id);
                    await Database.logAction({ action: 'delete_product', id });
                    Utils.showToast('Товар удалён', 'success');
                    Router.navigate('warehouse');
                });
            }
        });
    },

    showProductCard(id) {
        const p = this.products.find(x => x.id === id);
        if (!p) return;

        const modal = Utils.createModal({
            title: p.name || 'Товар',
            content: `
                <div class="flex gap-md">
                    <img class="product-image" style="width:96px;height:96px" src="${p.photoUrl || Storage.getPlaceholder()}" alt="">
                    <div class="flex flex-col gap-sm">
                        <div><b>Категория:</b> ${Utils.escapeHtml(p.category || '-')}</div>
                        <div><b>Остаток:</b> ${p.quantity || 0}</div>
                        <div><b>Себестоимость:</b> ${Utils.formatCurrency(p.costUSD || 0)} (${Utils.formatCurrency(Utils.usdToUzs(p.costUSD || 0), 'UZS')})</div>
                        <div><b>Цена продажи:</b> ${p.priceUSD ? Utils.formatCurrency(p.priceUSD) : '—'}</div>
                    </div>
                </div>
                ${Auth.isAdmin() ? `
                <div class="form-group mt-md">
                    <label>Фото</label>
                    <div class="image-upload" id="prod-photo">
                        <input type="file" accept="image/*">
                        <img class="image-upload-preview" src="${p.photoUrl || ''}" style="${p.photoUrl?'':'display:none'}">
                        <div class="image-upload-placeholder" style="${p.photoUrl?'display:none':''}">
                            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Загрузить</span>
                        </div>
                    </div>
                </div>`:''}
            `,
            footer: `
                <button class="btn btn-secondary" data-action="close">Закрыть</button>
                ${Auth.isAdmin() ? `<button class="btn btn-primary" data-action="save">Сохранить</button>`:''}
            `
        });

        modal.element.querySelector('[data-action="close"]').onclick = modal.close;

        if (Auth.isAdmin()) {
            const input = modal.element.querySelector('#prod-photo input');
            const preview = modal.element.querySelector('.image-upload-preview');
            const placeholder = modal.element.querySelector('.image-upload-placeholder');
            let selectedFile = null;

            input.addEventListener('change', (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                selectedFile = f;
                const url = URL.createObjectURL(f);
                preview.src = url;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            });

            modal.element.querySelector('[data-action="save"]').onclick = async () => {
                try {
                    Utils.showLoading();
                    let photoUrl = p.photoUrl || null;
                    if (selectedFile) {
                        photoUrl = await Storage.uploadProductImage(p.id, selectedFile);
                    }
                    await Database.updateProduct(p.id, { photoUrl });
                    await Database.logAction({ action: 'update_product_photo', id: p.id });
                    Utils.showToast('Сохранено', 'success');
                    modal.close();
                    Router.navigate('warehouse');
                } finally {
                    Utils.hideLoading();
                }
            };
        }
    },

    showAddProductModal() {
        const modal = Utils.createModal({
            title: 'Новый товар',
            content: `
                <div class="form-group">
                    <label>Название</label>
                    <input id="np-name" type="text" required>
                </div>
                <div class="form-group">
                    <label>Категория</label>
                    <select id="np-cat">
                        ${Utils.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Себестоимость ($)</label>
                        <input id="np-cost" type="number" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Цена продажи ($)</label>
                        <input id="np-price" type="number" min="0" step="0.01">
                    </div>
                </div>
                <div class="form-group">
                    <label>Количество</label>
                    <input id="np-qty" type="number" min="0" step="1" value="0">
                </div>
                <div class="form-group">
                    <label>Фото</label>
                    <div class="image-upload" id="np-photo">
                        <input type="file" accept="image/*">
                        <img class="image-upload-preview" style="display:none">
                        <div class="image-upload-placeholder">
                            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Загрузить</span>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" data-action="cancel">Отмена</button>
                <button class="btn btn-primary" data-action="create">Создать</button>
            `,
            center: true
        });

        let photoFile = null;
        const input = modal.element.querySelector('#np-photo input');
        const preview = modal.element.querySelector('.image-upload-preview');
        const placeholder = modal.element.querySelector('.image-upload-placeholder');

        input.addEventListener('change', (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            photoFile = f;
            const url = URL.createObjectURL(f);
            preview.src = url;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        });

        modal.element.querySelector('[data-action="cancel"]').onclick = modal.close;
        modal.element.querySelector('[data-action="create"]').onclick = async () => {
            const name = document.getElementById('np-name').value.trim();
            const category = document.getElementById('np-cat').value;
            const costUSD = Number(document.getElementById('np-cost').value || 0);
            const priceUSD = Number(document.getElementById('np-price').value || 0);
            const quantity = Number(document.getElementById('np-qty').value || 0);
            if (!name) return Utils.showToast('Укажите название', 'warning');

            const id = await Database.addProduct({ name, category, costUSD, priceUSD, quantity });
            let photoUrl = null;
            if (photoFile) {
                photoUrl = await Storage.uploadProductImage(id, photoFile);
                await Database.updateProduct(id, { photoUrl });
            }
            await Database.logAction({ action: 'add_product', id, name });
            Utils.showToast('Товар создан', 'success');
            modal.close();
            Router.navigate('warehouse');
        };
    },

    showEditProductModal(id) {
        const p = this.products.find(x => x.id === id);
        if (!p) return;

        const modal = Utils.createModal({
            title: 'Редактировать товар',
            content: `
                <div class="form-group">
                    <label>Название</label>
                    <input id="ep-name" type="text" value="${Utils.escapeHtml(p.name || '')}">
                </div>
                <div class="form-group">
                    <label>Категория</label>
                    <select id="ep-cat">
                        ${Utils.categories.map(c => `<option value="${c}" ${p.category===c?'selected':''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Себестоимость ($)</label>
                        <input id="ep-cost" type="number" min="0" step="0.01" value="${p.costUSD || 0}">
                    </div>
                    <div class="form-group">
                        <label>Цена продажи ($)</label>
                        <input id="ep-price" type="number" min="0" step="0.01" value="${p.priceUSD || 0}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Количество</label>
                    <input id="ep-qty" type="number" min="0" step="1" value="${p.quantity || 0}">
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
            const name = document.getElementById('ep-name').value.trim();
            const category = document.getElementById('ep-cat').value;
            const costUSD = Number(document.getElementById('ep-cost').value || 0);
            const priceUSD = Number(document.getElementById('ep-price').value || 0);
            const quantity = Number(document.getElementById('ep-qty').value || 0);
            await Database.updateProduct(p.id, { name, category, costUSD, priceUSD, quantity });
            await Database.logAction({ action: 'update_product', id: p.id });
            Utils.showToast('Изменения сохранены', 'success');
            modal.close();
            Router.navigate('warehouse');
        };
    },

    showBulkPhotoModal() {
        const modal = Utils.createModal({
            title: 'Массовая загрузка фото',
            content: `
                <p class="mb-md">Загрузите ZIP или выберите несколько изображений. Имя файла должно содержать название товара для сопоставления.</p>
                <input id="bp-files" type="file" accept="image/*" multiple>
                <div id="bp-result" class="mt-md text-muted"></div>
            `,
            footer: `
                <button class="btn btn-secondary" data-action="close">Закрыть</button>
                <button class="btn btn-primary" data-action="start">Загрузить</button>
            `,
            center: true
        });

        const input = modal.element.querySelector('#bp-files');
        modal.element.querySelector('[data-action="close"]').onclick = modal.close;
        modal.element.querySelector('[data-action="start"]').onclick = async () => {
            const files = Array.from(input.files || []);
            if (!files.length) return;
            let updated = 0;
            for (const f of files) {
                const name = f.name.toLowerCase();
                const match = this.products.find(p => (p.name || '').toLowerCase().includes(name.replace(/\.(jpg|jpeg|png|webp)$/i, '')));
                if (!match) continue;
                const url = await Storage.uploadProductImage(match.id, f);
                await Database.updateProduct(match.id, { photoUrl: url });
                updated++;
            }
            await Database.logAction({ action: 'bulk_photos', count: updated });
            modal.element.querySelector('#bp-result').textContent = `Обновлено: ${updated}`;
            Utils.showToast(`Фото обновлены: ${updated}`, 'success');
            Router.navigate('warehouse');
        };
    }
};
