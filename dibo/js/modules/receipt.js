// ========================================
// Receipt — Оприходование товаров
// ========================================

const Receipt = {
    state: {
        step: 1,
        supplierId: null,
        lines: [] // [{existingId|null, name, category, costUSD, priceUSD, qty, photoFile?}]
    },

    async render(root) {
        this.state = { step: 1, supplierId: null, lines: [] };
        root.innerHTML = `<div id="rc-steps"></div>`;
        await this.renderStep();
    },

    async renderStep() {
        const container = document.getElementById('rc-steps');
        const s = this.state;

        const stepper = `
            <div class="stepper">
                <div class="step ${s.step>=1?'active':''}"><div class="step-number">1</div><span>Поставщик</span></div>
                <div class="step-line ${s.step>1?'completed':''}"></div>
                <div class="step ${s.step>=2?'active':''}"><div class="step-number">2</div><span>Товары</span></div>
                <div class="step-line ${s.step>2?'completed':''}"></div>
                <div class="step ${s.step>=3?'active':''}"><div class="step-number">3</div><span>Подтверждение</span></div>
            </div>
        `;

        if (s.step === 1) {
            container.innerHTML = `
                ${stepper}
                <div class="card">
                    <div class="card-header"><div class="card-title">Выбор поставщика</div></div>
                    <div class="card-body">
                        <div class="btn-group">
                            <button id="pick-sup" class="btn btn-primary">Выбрать</button>
                            <button id="next1" class="btn btn-secondary" ${s.supplierId?'':'disabled'}>Далее</button>
                        </div>
                        <div class="mt-md text-muted" id="sup-info">
                            ${s.supplierId ? `Поставщик выбран: ${s.supplierId}` : 'Не выбран'}
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('pick-sup').onclick = async ()=>{
                const picked = await Suppliers.pickSupplier();
                if (picked) {
                    this.state.supplierId = picked.id;
                    this.renderStep();
                }
            };
            document.getElementById('next1').onclick = ()=>{ this.state.step = 2; this.renderStep(); };
        }

        if (s.step === 2) {
            const products = await Database.getProducts();
            container.innerHTML = `
                ${stepper}
                <div class="card">
                    <div class="card-header"><div class="card-title">Товары в оприходовании</div></div>
                    <div class="btn-group mb-md">
                        <button id="add-existing" class="btn btn-secondary">Существующий товар</button>
                        <button id="add-new" class="btn btn-primary">Новый товар</button>
                    </div>
                    <div id="rc-lines"></div>
                    <div class="btn-group mt-md">
                        <button id="back1" class="btn btn-secondary">Назад</button>
                        <button id="next2" class="btn btn-primary" ${s.lines.length?'':'disabled'}>Далее</button>
                    </div>
                </div>
            `;

            const renderLines = () => {
                const wrap = document.getElementById('rc-lines');
                if (!s.lines.length) {
                    wrap.innerHTML = `<div class="empty-state"><h3>Нет позиций</h3></div>`;
                    return;
                }
                wrap.innerHTML = s.lines.map((l, i)=>`
                    <div class="card mb-sm">
                        <div class="card-header">
                            <div class="card-title">${Utils.escapeHtml(l.name)} ${l.existingId?'(существ.)':'(новый)'}</div>
                            <button class="btn btn-sm btn-danger" data-del="${i}">Удалить</button>
                        </div>
                        <div class="card-body">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Категория</label>
                                    <select data-i="${i}" data-f="category">
                                        ${Utils.categories.map(c => `<option value="${c}" ${l.category===c?'selected':''}>${c}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Кол-во</label>
                                    <input type="number" min="1" step="1" value="${l.qty}" data-i="${i}" data-f="qty">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Себестоимость ($)</label>
                                    <input type="number" min="0" step="0.01" value="${l.costUSD}" data-i="${i}" data-f="costUSD">
                                </div>
                                <div class="form-group">
                                    <label>Цена продаж ($)</label>
                                    <input type="number" min="0" step="0.01" value="${l.priceUSD}" data-i="${i}" data-f="priceUSD">
                                </div>
                            </div>
                            ${!l.existingId ? `
                            <div class="form-group">
                                <label>Фото (опц.)</label>
                                <div class="image-upload">
                                    <input type="file" accept="image/*" data-i="${i}" data-f="photo">
                                    <div class="image-upload-placeholder">
                                        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                                        <span>Загрузить</span>
                                    </div>
                                </div>
                            </div>`:''}
                        </div>
                    </div>
                `).join('');

                wrap.querySelectorAll('[data-del]').forEach(btn=>{
                    btn.onclick = ()=>{ s.lines.splice(Number(btn.dataset.del),1); renderLines(); };
                });
                wrap.querySelectorAll('input,select').forEach(el=>{
                    el.onchange = (e)=>{
                        const i = Number(e.target.dataset.i);
                        const f = e.target.dataset.f;
                        if (f==='photo') {
                            s.lines[i].photoFile = e.target.files?.[0] || null;
                        } else {
                            let val = e.target.value;
                            if (['qty'].includes(f)) val = Number(val||1);
                            if (['costUSD','priceUSD'].includes(f)) val = Number(val||0);
                            s.lines[i][f] = val;
                        }
                    };
                });
            };

            const addExisting = () => {
                const modal = Utils.createModal({
                    title: 'Добавить существующий товар',
                    content: `
                        <div class="search-bar">
                            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input id="se-search" type="text" placeholder="Поиск...">
                        </div>
                        <div id="se-list" class="list"></div>
                    `,
                    footer: `<button class="btn btn-secondary" data-action="close">Закрыть</button>`,
                    center: true
                });
                const render = (q='') => {
                    const ql = q.toLowerCase();
                    const arr = products.filter(p => (p.name||'').toLowerCase().includes(ql));
                    const el = modal.element.querySelector('#se-list');
                    el.innerHTML = arr.map(p=>`
                        <div class="list-item" data-id="${p.id}">
                            <div class="list-item-content">
                                <div class="list-item-title">${Utils.escapeHtml(p.name)}</div>
                                <div class="list-item-subtitle">${p.category||''}</div>
                            </div>
                            <div class="list-item-value">
                                <div class="list-item-amount">${Utils.formatCurrency(p.costUSD||0)}</div>
                                <div class="list-item-date">С/с</div>
                            </div>
                        </div>
                    `).join('') || `<div class="empty-state"><h3>Не найдено</h3></div>`;
                    el.querySelectorAll('.list-item').forEach(row=>{
                        row.onclick = ()=>{
                            const p = products.find(x=>x.id===row.dataset.id);
                            s.lines.push({
                                existingId: p.id, name: p.name, category: p.category,
                                costUSD: p.costUSD||0, priceUSD: p.priceUSD||0, qty: 1
                            });
                            modal.close();
                            renderLines();
                        };
                    });
                };
                modal.element.querySelector('[data-action="close"]').onclick = modal.close;
                modal.element.querySelector('#se-search').addEventListener('input', Utils.debounce((e)=>render(e.target.value), 200));
                render();
            };

            const addNew = () => {
                s.lines.push({ existingId: null, name: 'Новый товар', category: Utils.categories[0], costUSD: 0, priceUSD: 0, qty: 1, photoFile: null });
                renderLines();
                // Переименовать сразу
                const idx = s.lines.length - 1;
                const rename = Utils.createModal({
                    title: 'Название товара',
                    content: `
                        <div class="form-group">
                            <label>Название</label>
                            <input id="nn-name" type="text" placeholder="Введите название">
                        </div>
                    `,
                    footer: `
                        <button class="btn btn-secondary" data-action="cancel">Позже</button>
                        <button class="btn btn-primary" data-action="save">Сохранить</button>
                    `,
                    center: true
                });
                rename.element.querySelector('[data-action="cancel"]').onclick = rename.close;
                rename.element.querySelector('[data-action="save"]').onclick = ()=>{
                    const val = document.getElementById('nn-name').value.trim();
                    if (val) s.lines[idx].name = val;
                    rename.close();
                    renderLines();
                };
            };

            document.getElementById('add-existing').onclick = addExisting;
            document.getElementById('add-new').onclick = addNew;
            document.getElementById('back1').onclick = ()=>{ this.state.step = 1; this.renderStep(); };
            document.getElementById('next2').onclick = ()=>{ this.state.step = 3; this.renderStep(); };

            renderLines();
        }

        if (s.step === 3) {
            let totalUsd = 0;
            s.lines.forEach(l => { totalUsd += (l.costUSD || 0) * (l.qty || 0); });

            container.innerHTML = `
                ${stepper}
                <div class="card">
                    <div class="card-header"><div class="card-title">Подтверждение оприходования</div></div>
                    <div class="list">
                        ${s.lines.map(l=>`
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">${Utils.escapeHtml(l.name)}</div>
                                    <div class="list-item-subtitle">${l.category} • Кол-во: ${l.qty}</div>
                                </div>
                                <div class="list-item-value">
                                    <div class="list-item-amount">${Utils.formatCurrency(l.costUSD)}</div>
                                    <div class="list-item-date">С/с, $</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="cart-summary mt-md">
                        <div class="cart-summary-row">
                            <span>Итого по себестоимости</span><span>${Utils.formatCurrency(totalUsd)} (${Utils.formatCurrency(Utils.usdToUzs(totalUsd),'UZS')})</span>
                        </div>
                    </div>
                    <div class="btn-group mt-md">
                        <button id="back2" class="btn btn-secondary">Назад</button>
                        <button id="finish-rc" class="btn btn-success">Подтвердить</button>
                    </div>
                </div>
            `;
            document.getElementById('back2').onclick = ()=>{ this.state.step = 2; this.renderStep(); };
            document.getElementById('finish-rc').onclick = ()=> this.finishReceipt();
        }
    },

    async finishReceipt() {
        try {
            Utils.showLoading();
            // Создать записи/обновить остатки
            for (const l of this.state.lines) {
                let productId = l.existingId;
                if (!productId) {
                    productId = await Database.addProduct({
                        name: l.name,
                        category: l.category,
                        costUSD: l.costUSD || 0,
                        priceUSD: l.priceUSD || 0,
                        quantity: 0
                    });
                    if (l.photoFile) {
                        const url = await Storage.uploadProductImage(productId, l.photoFile);
                        await Database.updateProduct(productId, { photoUrl: url });
                    }
                }
                // Увеличить остаток
                await Database.updateProductStock(productId, l.qty || 0, 'add');

                // При необходимости обновить цену/себестоимость
                await Database.updateProduct(productId, {
                    costUSD: l.costUSD || 0,
                    priceUSD: l.priceUSD || 0
                });
            }

            // Запись оприходования
            const id = await Database.addReceipt({
                supplierId: this.state.supplierId,
                lines: this.state.lines.map(l => ({
                    productId: l.existingId || 'new',
                    name: l.name,
                    qty: l.qty,
                    costUSD: l.costUSD,
                    priceUSD: l.priceUSD,
                    category: l.category
                }))
            });

            await Database.logAction({ action: 'add_receipt', receiptId: id, supplierId: this.state.supplierId, lines: this.state.lines.length });
            Utils.showToast('Оприходование завершено', 'success');
            Router.navigate('warehouse');
        } catch (e) {
            console.error(e);
            Utils.showToast('Ошибка оприходования', 'error');
        } finally {
            Utils.hideLoading();
        }
    }
};
