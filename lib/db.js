import { createClient } from '@supabase/supabase-js';

/**
 * 数据库操作层（基于 Supabase）
 */
class Database {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        if (!supabaseUrl || !supabaseKey) {
            console.warn('Supabase 环境变量未配置，数据库功能不可用');
            this.client = null;
        } else {
            this.client = createClient(supabaseUrl, supabaseKey, {
                auth: { persistSession: false }
            });
        }
    }

    checkReady() {
        if (!this.client) {
            throw new Error('数据库未配置，请设置 SUPABASE_URL 和 SUPABASE_SERVICE_KEY 环境变量');
        }
    }

    // ========== 商品相关 ==========

    async getProducts(includeInactive = false) {
        this.checkReady();
        let query = this.client.from('products').select('*');
        if (!includeInactive) {
            query = query.eq('status', 'active');
        }
        const { data, error } = await query.order('sort_order', { ascending: true }).order('created_at', { ascending: false });
        if (error) throw error;
        // 始终从cards表统计可用卡密数量，确保库存准确
        for (const product of data) {
            const { count } = await this.client
                .from('cards')
                .select('id', { count: 'exact' })
                .eq('product_id', product.id)
                .eq('status', 'available');
            product.stock = count || 0;
        }
        return data;
    }

    async getProductById(id) {
        this.checkReady();
        const { data, error } = await this.client
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    async addProduct(name, description, price, sortOrder = 0, category = '全部', extra = {}) {
        this.checkReady();
        const insertData = { name, description, price, sort_order: sortOrder, category, ...extra };
        const { data, error } = await this.client
            .from('products')
            .insert(insertData)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateProduct(id, updates) {
        this.checkReady();
        const allowed = ['name', 'description', 'price', 'sort_order', 'is_active', 'category', 'tag', 'image', 'images', 'detail', 'original_price', 'stock', 'sales', 'sort', 'status'];
        const clean = {};
        for (const key of allowed) {
            if (updates[key] !== undefined) clean[key] = updates[key];
        }
        const { data, error } = await this.client
            .from('products')
            .update(clean)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteProduct(id) {
        this.checkReady();
        const { error } = await this.client
            .from('products')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    // ========== 卡密相关 ==========

    async addCards(productId, cards) {
        this.checkReady();
        const rows = cards.map(c => ({
            product_id: productId,
            card_type: c.type || 'default',
            card_content: c.content,
            status: 'available'
        }));
        const { data, error } = await this.client
            .from('cards')
            .insert(rows)
            .select();
        if (error) throw error;
        return data;
    }

    async consumeCards(productId, quantity, orderId) {
        this.checkReady();
        const { data: availableCards, error: queryError } = await this.client
            .from('cards')
            .select('*')
            .eq('product_id', productId)
            .eq('status', 'available')
            .order('created_at', { ascending: true })
            .limit(quantity);
        if (queryError) throw queryError;
        if (!availableCards || availableCards.length < quantity) {
            throw new Error('库存不足');
        }
        const cardIds = availableCards.map(c => c.id);
        const { error: updateError } = await this.client
            .from('cards')
            .update({ status: 'used', order_id: orderId, used_at: new Date().toISOString() })
            .in('id', cardIds);
        if (updateError) throw updateError;
        return availableCards;
    }

    async getCardsByOrderId(orderId) {
        this.checkReady();
        const { data, error } = await this.client
            .from('cards')
            .select('*')
            .eq('order_id', orderId);
        if (error) throw error;
        return data;
    }

    async getCardsByProductId(productId, status = null, limit = 100) {
        this.checkReady();
        let query = this.client.from('cards').select('*').eq('product_id', productId);
        if (status) query = query.eq('status', status);
        const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        return data;
    }

    async deleteCard(cardId) {
        this.checkReady();
        const { error } = await this.client.from('cards').delete().eq('id', cardId);
        if (error) throw error;
        return true;
    }

    async getCardStats(productId) {
        this.checkReady();
        const { count: available } = await this.client
            .from('cards').select('id', { count: 'exact' })
            .eq('product_id', productId).eq('status', 'available');
        const { count: used } = await this.client
            .from('cards').select('id', { count: 'exact' })
            .eq('product_id', productId).eq('status', 'used');
        return { available: available || 0, used: used || 0 };
    }

    // ========== 订单相关 ==========

    async createOrder(orderNo, productId, productName, quantity, amount, contact = '', userId = null) {
        this.checkReady();
        const insertData = {
            order_no: orderNo,
            product_id: productId,
            product_name: productName,
            quantity,
            amount,
            remark: contact ? `联系方式: ${contact}` : '',
            status: 'pending'
        };
        if (userId) insertData.user_id = userId;
        const { data, error } = await this.client
            .from('orders')
            .insert(insertData)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async getOrderByNo(orderNo) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .select('*')
            .eq('order_no', orderNo)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    async getOrderById(id) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    async markOrderPaid(orderNo, alipayTradeNo) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .update({
                status: 'paid',
                alipay_trade_no: alipayTradeNo,
                paid_at: new Date().toISOString()
            })
            .eq('order_no', orderNo)
            .eq('status', 'pending')
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    async manualMarkPaid(orderId) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', orderId)
            .eq('status', 'pending')
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    async markOrderFailed(orderId) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .update({ status: 'failed' })
            .eq('id', orderId)
            .eq('status', 'pending')
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteOrder(orderId) {
        this.checkReady();
        const { error } = await this.client.from('orders').delete().eq('id', orderId);
        if (error) throw error;
        return true;
    }

    async updateOrderRemark(orderId, remark) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .update({ remark })
            .eq('id', orderId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async getOrders(limit = 50, status = null) {
        this.checkReady();
        let query = this.client.from('orders').select('*');
        if (status) query = query.eq('status', status);
        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    }

    // ========== 网站设置相关 ==========

    async getSettings() {
        this.checkReady();
        const { data, error } = await this.client.from('settings').select('*');
        if (error) throw error;
        const result = {};
        for (const item of data) {
            result[item.setting_key] = item.setting_value;
        }
        return result;
    }

    async getSetting(key) {
        this.checkReady();
        const { data, error } = await this.client
            .from('settings')
            .select('*')
            .eq('setting_key', key)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data ? data.setting_value : null;
    }

    async updateSettings(settings) {
        this.checkReady();
        const updates = [];
        for (const [key, value] of Object.entries(settings)) {
            updates.push({
                setting_key: key,
                setting_value: String(value),
                updated_at: new Date().toISOString()
            });
        }
        // 使用 upsert
        const { data, error } = await this.client
            .from('settings')
            .upsert(updates, { onConflict: 'setting_key' });
        if (error) throw error;
        return true;
    }

    // ===== 用户相关 =====
    async getUserByUsername(username) {
        this.checkReady();
        const { data, error } = await this.client
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    }

    async getUserById(id) {
        this.checkReady();
        const { data, error } = await this.client
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    }

    async createUser(username, password, email = '') {
        this.checkReady();
        const { data, error } = await this.client
            .from('users')
            .insert({ username, password, email, nickname: username })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateUser(id, updates) {
        this.checkReady();
        const { data, error } = await this.client
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async getUserOrders(userId, limit = 50) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    }

    async updateOrderUserId(orderNo, userId) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .update({ user_id: userId })
            .eq('order_no', orderNo);
        if (error) throw error;
        return true;
    }
}

let instance = null;
function getDB() {
    if (!instance) {
        instance = new Database();
    }
    return instance;
}

export { Database, getDB };
