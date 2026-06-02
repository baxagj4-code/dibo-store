// ========================================
// DIBO Store - Database Operations
// ========================================

const Database = {
    // ========== PRODUCTS ==========
    async getProducts() {
        try {
            const snapshot = await db.ref('products').once('value');
            const data = snapshot.val() || {};
            return Object.entries(data).map(([id, product]) => ({ id, ...product }));
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    },

    async getProduct(id) {
        try {
            const snapshot = await db.ref(`products/${id}`).once('value');
            if (snapshot.exists()) {
                return { id, ...snapshot.val() };
            }
            return null;
        } catch (error) {
            console.error('Error getting product:', error);
            return null;
        }
    },

    async addProduct(product) {
        try {
            const ref = db.ref('products').push();
            await ref.set({
                ...product,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            return ref.key;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    },

    async updateProduct(id, updates) {
        try {
            await db.ref(`products/${id}`).update({
                ...updates,
                updatedAt: Date.now()
            });
            return true;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },

    async deleteProduct(id) {
        try {
            await db.ref(`products/${id}`).remove();
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    },

    async updateProductStock(id, quantity, operation = 'subtract') {
        try {
            const productRef = db.ref(`products/${id}/quantity`);
            await productRef.transaction((currentQty) => {
                if (currentQty === null) return 0;
                if (operation === 'subtract') {
                    return Math.max(0, currentQty - quantity);
                } else {
                    return currentQty + quantity;
                }
            });
            return true;
        } catch (error) {
            console.error('Error updating stock:', error);
            throw error;
        }
    },

    // ========== CUSTOMERS ==========
    async getCustomers() {
        try {
            const snapshot = await db.ref('customers').once('value');
            const data = snapshot.val() || {};
            return Object.entries(data).map(([id, customer]) => ({ id, ...customer }));
        } catch (error) {
            console.error('Error getting customers:', error);
            return [];
        }
    },

    async getCustomer(id) {
        try {
            const snapshot = await db.ref(`customers/${id}`).once('value');
            if (snapshot.exists()) {
                return { id, ...snapshot.val() };
            }
            return null;
        } catch (error) {
            console.error('Error getting customer:', error);
            return null;
        }
    },

    async addCustomer(customer) {
        try {
            const ref = db.ref('customers').push();
            await ref.set({
                ...customer,
                totalPurchases: 0,
                totalDebt: 0,
                createdAt: Date.now()
            });
            return ref.key;
        } catch (error) {
            console.error('Error adding customer:', error);
            throw error;
        }
    },

    async updateCustomer(id, updates) {
        try {
            await db.ref(`customers/${id}`).update(updates);
            return true;
        } catch (error) {
            console.error('Error updating customer:', error);
            throw error;
        }
    },

    async updateCustomerDebt(id, amount, operation = 'add') {
        try {
            const customerRef = db.ref(`customers/${id}/totalDebt`);
            await customerRef.transaction((currentDebt) => {
                if (currentDebt === null) currentDebt = 0;
                if (operation === 'add') {
                    return currentDebt + amount;
                } else {
                    return Math.max(0, currentDebt - amount);
                }
            });
            return true;
        } catch (error) {
            console.error('Error updating customer debt:', error);
            throw error;
        }
    },

    // ========== SUPPLIERS ==========
    async getSuppliers() {
        try {
            const snapshot = await db.ref('suppliers').once('value');
            const data = snapshot.val() || {};
            return Object.entries(data).map(([id, supplier]) => ({ id, ...supplier }));
        } catch (error) {
            console.error('Error getting suppliers:', error);
            return [];
        }
    },

    async addSupplier(supplier) {
        try {
            const ref = db.ref('suppliers').push();
            await ref.set({
                ...supplier,
                createdAt: Date.now()
            });
            return ref.key;
        } catch (error) {
            console.error('Error adding supplier:', error);
            throw error;
        }
    },

    // ========== SALES ==========
    async getSales(dateRange = null) {
        try {
            let query = db.ref('sales').orderByChild('createdAt');
            
            if (dateRange) {
                query = query.startAt(dateRange.start).endAt(dateRange.end);
            }
            
            const snapshot = await query.once('value');
            const data = snapshot.val() || {};
            return Object.entries(data).map(([id, sale]) => ({ id, ...sale }));
        } catch (error) {
            console.error('Error getting sales:', error);
            return [];
        }
    },

    async getSale(id) {
        try {
            const snapshot = await db.ref(`sales/${id}`).once('value');
            if (snapshot.exists()) {
                return { id, ...snapshot.val() };
            }
            return null;
        } catch (error) {
            console.error('Error getting sale:', error);
            return null;
        }
    },

    async addSale(sale) {
        try {
            const ref = db.ref('sales').push();
            await ref.set({
                ...sale,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            return ref.key;
        } catch (error) {
            console.error('Error adding sale:', error);
            throw error;
        }
    },

    async updateSale(id, updates) {
        try {
            await db.ref(`sales/${id}`).update({
                ...updates,
                updatedAt: Date.now()
            });
            return true;
        } catch (error) {
            console.error('Error updating sale:', error);
            throw error;
        }
    },

    async deleteSale(id) {
        try {
            await db.ref(`sales/${id}`).remove();
            return true;
        } catch (error) {
            console.error('Error deleting sale:', error);
            throw error;
        }
    },

    // ========== CASH OPERATIONS ==========
    async getCashOperations(dateRange = null) {
        try {
            let query = db.ref('cashOperations').orderByChild('createdAt');
            
            if (dateRange) {
                query = query.startAt(dateRange.start).endAt(dateRange.end);
            }
            
            const snapshot = await query.once('value');
            const data = snapshot.val() || {};
            return Object.entries(data).map(([id, op]) => ({ id, ...op }));
        } catch (error) {
            console.error('Error getting cash operations:', error);
            return [];
        }
    },

    async addCashOperation(operation) {
        try {
            const ref = db.ref('cashOperations').push();
            await ref.set({
                ...operation,
                createdAt: Date.now()
            });
            
            // Update cash balance
            const balanceRef = db.ref('settings/cashBalance');
            await balanceRef.transaction((currentBalance) => {
                if (currentBalance === null) currentBalance = 0;
                if (operation.type === 'income' || operation.type === 'debt_payment') {
                    return currentBalance + operation.amount;
                } else {
                    return currentBalance - operation.amount;
                }
            });
            
            return ref.key;
        } catch (error) {
            console.error('Error adding cash operation:', error);
            throw error;
        }
    },

    async getCashBalance() {
        try {
            const snapshot = await db.ref('settings/cashBalance').once('value');
            return snapshot.val() || 0;
        } catch (error) {
            console.error('Error getting cash balance:', error);
            return 0;
        }
    },

    // ========== RECEIPTS (OПРИХОДОВАНИЕ) ==========
    async getReceipts() {
        try {
            const snapshot = await db.ref('receipts').orderByChild('createdAt').once('value');
            const data = snapshot.val() || {};
            return Object.entries(data).map(([id, receipt]) => ({ id, ...receipt }));
        } catch (error) {
            console.error('Error getting receipts:', error);
            return [];
        }
    },

    async addReceipt(receipt) {
        try {
            const ref = db.ref('receipts').push();
            await ref.set({
                ...receipt,
                createdAt: Date.now()
            });
            return ref.key;
        } catch (error) {
            console.error('Error adding receipt:', error);
            throw error;
        }
    },

    // ========== INVENTORY ==========
    async getInventories() {
        try {
            const snapshot = await db.ref('inventories').orderByChild('createdAt').once('value');
            const data = snapshot.val() || {};
            return Object.entries(data).map(([id, inv]) => ({ id, ...inv }));
        } catch (error) {
            console.error('Error getting inventories:', error);
            return [];
        }
    },

    async addInventory(inventory) {
        try {
            const ref = db.ref('inventories').push();
            await ref.set({
                ...inventory,
                createdAt: Date.now()
            });
            return ref.key;
        } catch (error) {
            console.error('Error adding inventory:', error);
            throw error;
        }
    },

    // ========== ACTION LOG ==========
    async logAction(action) {
        try {
            const ref = db.ref('actionLog').push();
            await ref.set({
                ...action,
                timestamp: Date.now(),
                user: App.currentUser?.login || 'unknown'
            });
            return ref.key;
        } catch (error) {
            console.error('Error logging action:', error);
        }
    },

    async getActionLog(limit = 100) {
        try {
            const snapshot = await db.ref('actionLog')
                .orderByChild('timestamp')
                .limitToLast(limit)
                .once('value');
            const data = snapshot.val() || {};
            return Object.entries(data)
                .map(([id, log]) => ({ id, ...log }))
                .sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Error getting action log:', error);
            return [];
        }
    },

    // ========== DEBT PAYMENTS ==========
    async addDebtPayment(payment) {
        try {
            const ref = db.ref('debtPayments').push();
            await ref.set({
                ...payment,
                createdAt: Date.now()
            });
            return ref.key;
        } catch (error) {
            console.error('Error adding debt payment:', error);
            throw error;
        }
    },

    async getDebtPayments(customerId = null) {
        try {
            let query = db.ref('debtPayments').orderByChild('createdAt');
            const snapshot = await query.once('value');
            const data = snapshot.val() || {};
            let payments = Object.entries(data).map(([id, payment]) => ({ id, ...payment }));
            
            if (customerId) {
                payments = payments.filter(p => p.customerId === customerId);
            }
            
            return payments;
        } catch (error) {
            console.error('Error getting debt payments:', error);
            return [];
        }
    },

    // ========== IMPORT PRODUCTS ==========
    async importProducts(products) {
        try {
            const updates = {};
            products.forEach(product => {
                const key = db.ref('products').push().key;
                updates[`products/${key}`] = {
                    ...product,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
            });
            
            await db.ref().update(updates);
            return true;
        } catch (error) {
            console.error('Error importing products:', error);
            throw error;
        }
    }
};
