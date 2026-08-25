const { createClient } = require('@supabase/supabase-js');

/**
 * 数据库操作层（基于 Supabase）
 * 表结构：
 * - products: id, name, description, price, stock, created_at
 * - cards: id, product_id, card_type, card_content, status(available/used), order_id, used_at, created_at
 * - orders: id, order_no, product_id, product_name, quantity, amount, status(pending/paid/failed), 
 *           alipay_trade_no, created_at, paid_at
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

    /**
     * 检查客户端是否就绪
     */
    checkReady() {
        if (!this.client) {
            throw new Error('数据库未配置，请设置 SUPABASE_URL 和 SUPABASE_SERVICE_KEY 环境变量');
        }
    }

    // ========== 商品相关 ==========

    /**
     * 获取所有在售商品（含库存统计）
     */
    async getProducts() {
        this.checkReady();
        const { data, error } = await this.client
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 统计每个商品的可用卡密数
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

    /**
     * 根据ID获取商品
     */
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

    /**
     * 添加商品
     */
    async addProduct(name, description, price) {
        this.checkReady();
        const { data, error } = await this.client
            .from('products')
            .insert({ name, description, price })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ========== 卡密相关 ==========

    /**
     * 批量添加卡密
     */
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

    /**
     * 获取并锁定可用卡密（事务方式：先查询再更新）
     * 注意：Supabase不支持复杂事务，这里用RPC函数或简单的先查后更
     * 为避免并发问题，建议在Supabase中创建RPC函数
     */
    async consumeCards(productId, quantity, orderId) {
        this.checkReady();

        // 先查询可用卡密
        const { data: availableCards, error: queryError } = await this.client
            .from('cards')
            .select('*')
            .eq('product_id', productId)
            .eq('status', 'available')
            .limit(quantity);

        if (queryError) throw queryError;
        if (!availableCards || availableCards.length < quantity) {
            throw new Error('库存不足');
        }

        const cardIds = availableCards.map(c => c.id);

        // 标记为已使用
        const { error: updateError } = await this.client
            .from('cards')
            .update({ status: 'used', order_id: orderId, used_at: new Date().toISOString() })
            .in('id', cardIds);

        if (updateError) throw updateError;

        return availableCards;
    }

    /**
     * 根据订单ID获取卡密
     */
    async getCardsByOrderId(orderId) {
        this.checkReady();
        const { data, error } = await this.client
            .from('cards')
            .select('*')
            .eq('order_id', orderId);

        if (error) throw error;
        return data;
    }

    // ========== 订单相关 ==========

    /**
     * 创建订单
     */
    async createOrder(orderNo, productId, productName, quantity, amount) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .insert({
                order_no: orderNo,
                product_id: productId,
                product_name: productName,
                quantity,
                amount,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * 根据订单号查询订单
     */
    async getOrderByNo(orderNo) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .select('*')
            .eq('order_no', orderNo)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // 未找到
            throw error;
        }
        return data;
    }

    /**
     * 更新订单为已支付
     */
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
            .eq('status', 'pending') // 只有待支付状态才能更新，防止重复处理
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // 可能已经处理过
            throw error;
        }
        return data;
    }

    /**
     * 获取所有订单（管理后台）
     */
    async getOrders(limit = 50) {
        this.checkReady();
        const { data, error } = await this.client
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
}

// 单例
let instance = null;
function getDB() {
    if (!instance) {
        instance = new Database();
    }
    return instance;
}

module.exports = { Database, getDB };
