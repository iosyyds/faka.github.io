// ============================================
// 自动发卡商城 - 店铺商城风格
// ============================================

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

let currentOrder = null;
let pollTimer = null;
let siteSettings = {};
let allProducts = [];
let currentCategory = '全部';
let currentPayMethod = 'alipay';
let selectedProduct = null;

document.addEventListener('DOMContentLoaded', () => {
    loadSiteSettings();
    loadProducts();
    bindEvents();
});

function bindEvents() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('query-order-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') doQueryOrder();
    });
    document.getElementById('order-contact').addEventListener('keypress', e => {
        if (e.key === 'Enter') submitOrder();
    });
}

// ========== 网站设置 ==========
async function loadSiteSettings() {
    try {
        const res = await fetch(`${API_BASE}/settings`);
        const data = await res.json();
        if (data.success && data.settings) {
            siteSettings = data.settings;
            applySettings();
        }
    } catch (err) {
        console.warn('加载设置失败:', err);
    }
}

function applySettings() {
    const s = siteSettings;
    if (s.site_name) {
        document.title = s.site_name;
        document.getElementById('nav-site-name').textContent = s.site_name;
        document.getElementById('shop-name').textContent = s.site_name;
    }
    if (s.announcement && s.announcement.trim()) {
        document.getElementById('shop-announcement-text').textContent = s.announcement;
    }
    if (s.payment_tip) {
        document.getElementById('payment-tip').textContent = s.payment_tip;
    }
}

// ========== 商品列表 ==========
async function loadProducts() {
    const grid = document.getElementById('product-grid');
    try {
        const res = await fetch(`${API_BASE}/products`);
        const data = await res.json();
        if (data.success && data.products.length > 0) {
            allProducts = data.products;
            document.getElementById('product-count').textContent = data.products.length;
            renderCategories();
            renderProducts();
        } else {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;padding:40px;">
                    <div class="icon" style="font-size:40px;opacity:0.4;">📦</div>
                    <p style="margin-top:10px;color:#8c8c8c;">暂无商品，请进入后台添加</p>
                </div>`;
            document.getElementById('product-count').textContent = '0';
        }
    } catch (err) {
        console.error('加载商品失败:', err);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;padding:40px;">
                <div class="icon" style="font-size:40px;opacity:0.4;">⚠️</div>
                <p style="margin-top:10px;color:#ff4d4f;">商品加载失败</p>
            </div>`;
    }
}

function renderCategories() {
    const categories = {};
    allProducts.forEach(p => {
        const cat = p.category || '全部';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    const tabs = document.getElementById('category-tabs');
    let html = `<button class="category-tab ${currentCategory === '全部' ? 'active' : ''}" onclick="switchCategory('全部')">全部 <span class="cat-count">${allProducts.length}</span></button>`;
    for (const [cat, count] of Object.entries(categories)) {
        if (cat !== '全部') {
            html += `<button class="category-tab ${currentCategory === cat ? 'active' : ''}" onclick="switchCategory('${escapeHtml(cat)}')">${escapeHtml(cat)} <span class="cat-count">${count}</span></button>`;
        }
    }
    tabs.innerHTML = html;
}

function switchCategory(cat) {
    currentCategory = cat;
    renderCategories();
    renderProducts();
}

function filterProducts() {
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    const search = document.getElementById('search-input').value.toLowerCase().trim();
    let filtered = allProducts;
    if (currentCategory !== '全部') {
        filtered = filtered.filter(p => (p.category || '全部') === currentCategory);
    }
    if (search) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(search) ||
            (p.description || '').toLowerCase().includes(search)
        );
    }
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;padding:40px;">
                <div class="icon" style="font-size:40px;opacity:0.4;">🔍</div>
                <p style="margin-top:10px;color:#8c8c8c;">没有找到相关商品</p>
            </div>`;
        return;
    }
    grid.innerHTML = filtered.map(p => {
        const inStock = p.stock > 0;
        return `
        <div class="product-card-v3" onclick="${inStock ? `openOrderModal('${p.id}')` : ''}">
            <div class="pc-top">
                <div class="pc-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
                <span class="stock-tag ${inStock ? 'in-stock' : 'out-stock'}">${inStock ? '有货' : '缺货'}</span>
            </div>
            <div class="pc-bottom">
                <span class="pc-price">¥${Number(p.price).toFixed(2)}</span>
                <button class="cart-btn" ${inStock ? '' : 'disabled'} onclick="event.stopPropagation();openOrderModal('${p.id}')" title="立即购买">🛒</button>
            </div>
        </div>`;
    }).join('');
}

// ========== 下单弹窗 ==========
function openOrderModal(productId) {
    selectedProduct = allProducts.find(p => p.id === productId);
    if (!selectedProduct || selectedProduct.stock <= 0) return;
    document.getElementById('order-modal-product').textContent = selectedProduct.name;
    document.getElementById('order-modal-amount').textContent = `¥${Number(selectedProduct.price).toFixed(2)}`;
    document.getElementById('order-contact').value = '';
    document.getElementById('order-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('order-contact').focus(), 100);
}

function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
    selectedProduct = null;
}

function selectPayMethod(method) {
    if (method === 'wechat') {
        showToast('微信支付暂未开通，请使用支付宝', 'warning');
        return;
    }
    currentPayMethod = method;
    document.querySelectorAll('#order-modal .pay-channel').forEach(el => {
        el.classList.toggle('active', el.dataset.method === method);
    });
}

async function submitOrder() {
    if (!selectedProduct) return;
    const contact = document.getElementById('order-contact').value.trim();
    if (!contact) {
        showToast('请输入联系方式', 'warning');
        return;
    }
    const btn = document.getElementById('order-submit-btn');
    btn.disabled = true;
    btn.textContent = '创建订单中...';
    try {
        const res = await fetch(`${API_BASE}/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: selectedProduct.id, quantity: 1, contact })
        });
        const data = await res.json();
        if (data.success) {
            currentOrder = data.order;
            closeOrderModal();
            showQrModal(data.order, data.qrCode);
            startPolling();
        } else {
            showToast(data.message || '创建订单失败', 'error');
        }
    } catch (err) {
        console.error('创建订单失败:', err);
        showToast('网络错误，请稍后重试', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '立即安全支付购买';
    }
}

// ========== 二维码支付 ==========
function showQrModal(order, qrCodeUrl) {
    document.getElementById('qr-modal-product').textContent = order.product_name;
    document.getElementById('qr-modal-amount').textContent = `¥${Number(order.amount).toFixed(2)}`;
    document.getElementById('qr-order-no').textContent = `订单号：${order.order_no}`;
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: qrCodeUrl,
        width: 200,
        height: 200,
        correctLevel: QRCode.CorrectLevel.H
    });
    document.getElementById('qr-modal').style.display = 'flex';
}

function closeQrModal() {
    stopPolling();
    currentOrder = null;
    document.getElementById('qr-modal').style.display = 'none';
}

// ========== 订单状态轮询 ==========
function startPolling() {
    stopPolling();
    pollTimer = setInterval(checkOrderStatus, 3000);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

async function checkOrderStatus() {
    if (!currentOrder) return;
    try {
        const res = await fetch(`${API_BASE}/query-order?orderNo=${currentOrder.order_no}`);
        const data = await res.json();
        if (data.success && data.order.status === 'paid') {
            stopPolling();
            closeQrModal();
            showSuccessPage(data.order);
        }
    } catch (err) {
        console.error('查询订单失败:', err);
    }
}

// ========== 支付成功 ==========
function showSuccessPage(order) {
    document.getElementById('main-page').style.display = 'none';
    document.getElementById('success-page').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const cardList = document.getElementById('card-list');
    if (order.cards && order.cards.length > 0) {
        cardList.innerHTML = order.cards.map((card, idx) => `
            <div class="card-item">
                <div class="card-item-label">
                    <span>卡密 ${idx + 1}${card.card_type && card.card_type !== 'default' ? `（${escapeHtml(card.card_type)}）` : ''}</span>
                    <button class="copy-single-btn" onclick="copySingleCard(this)">复制</button>
                </div>
                <p class="card-item-value">${escapeHtml(card.card_content)}</p>
            </div>
        `).join('');
    } else {
        cardList.innerHTML = '<p style="text-align:center;color:#8c8c8c;padding:20px;">卡密发放异常，请联系客服</p>';
    }
}

function copySingleCard(btn) {
    const valueEl = btn.closest('.card-item').querySelector('.card-item-value');
    copyToClipboard(valueEl.textContent).then(() => {
        btn.textContent = '已复制';
        setTimeout(() => btn.textContent = '复制', 1500);
    });
}

function copyAllCards() {
    const cards = document.querySelectorAll('.card-item-value');
    const text = Array.from(cards).map((el, i) => `卡密${i + 1}：${el.textContent}`).join('\n');
    copyToClipboard(text).then(() => showToast('卡密已复制到剪贴板', 'success'));
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

function backToHome() {
    stopPolling();
    currentOrder = null;
    selectedProduct = null;
    document.getElementById('success-page').style.display = 'none';
    document.getElementById('main-page').style.display = 'block';
    currentCategory = '全部';
    document.getElementById('search-input').value = '';
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== 订单查询 ==========
function showQueryModal() {
    document.getElementById('query-modal').style.display = 'flex';
    document.getElementById('query-order-input').value = '';
    document.getElementById('query-result').innerHTML = '';
    setTimeout(() => document.getElementById('query-order-input').focus(), 100);
}

function closeQueryModal() {
    document.getElementById('query-modal').style.display = 'none';
}

async function doQueryOrder() {
    const orderNo = document.getElementById('query-order-input').value.trim();
    const resultEl = document.getElementById('query-result');
    if (!orderNo) { showToast('请输入订单编号', 'warning'); return; }
    resultEl.innerHTML = '<div style="text-align:center;padding:20px;"><span class="loading"></span> 查询中...</div>';
    try {
        const res = await fetch(`${API_BASE}/query-order?orderNo=${encodeURIComponent(orderNo)}`);
        const data = await res.json();
        if (data.success) {
            const order = data.order;
            let html = `
                <div style="background:#f5f7fa;border-radius:8px;padding:14px;margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                        <span style="color:#8c8c8c;">商品</span><span style="font-weight:500;">${escapeHtml(order.product_name)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                        <span style="color:#8c8c8c;">数量</span><span>${order.quantity}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                        <span style="color:#8c8c8c;">金额</span><span style="color:#ff4d4f;font-weight:600;">¥${Number(order.amount).toFixed(2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                        <span style="color:#8c8c8c;">状态</span><span>${statusText(order.status)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                        <span style="color:#8c8c8c;">下单时间</span><span style="font-size:12px;">${formatDate(order.created_at)}</span>
                    </div>
                </div>`;
            if (order.status === 'paid' && order.cards && order.cards.length > 0) {
                html += '<div style="font-size:13px;color:#595959;margin-bottom:8px;font-weight:600;">卡密信息：</div>';
                html += order.cards.map((card, idx) => `
                    <div style="background:#f5f7fa;border:1px solid #f0f0f0;border-radius:8px;padding:12px;margin-bottom:8px;">
                        <div style="font-size:12px;color:#8c8c8c;margin-bottom:4px;">卡密 ${idx + 1}${card.card_type && card.card_type !== 'default' ? `（${escapeHtml(card.card_type)}）` : ''}</div>
                        <div style="font-size:13px;font-family:monospace;word-break:break-all;user-select:all;">${escapeHtml(card.card_content)}</div>
                    </div>
                `).join('');
            } else if (order.status === 'pending') {
                html += '<div style="text-align:center;padding:12px;color:#faad14;font-size:13px;">订单待支付，请完成支付后再查询</div>';
            }
            resultEl.innerHTML = html;
        } else {
            resultEl.innerHTML = `<div style="text-align:center;padding:20px;color:#ff4d4f;font-size:14px;">${escapeHtml(data.message || '查询失败')}</div>`;
        }
    } catch (err) {
        resultEl.innerHTML = '<div style="text-align:center;padding:20px;color:#ff4d4f;font-size:14px;">网络错误，请稍后重试</div>';
    }
}

// ========== 其他功能 ==========
function showContact() {
    const s = siteSettings;
    const contacts = [];
    if (s.contact_qq) contacts.push(`QQ：${s.contact_qq}`);
    if (s.contact_wechat) contacts.push(`微信：${s.contact_wechat}`);
    if (s.contact_email) contacts.push(`邮箱：${s.contact_email}`);
    if (contacts.length === 0) {
        showToast('卖家暂未设置联系方式', 'warning');
    } else {
        showModal(contacts.join('\n'));
    }
}

function shareShop() {
    const url = window.location.href;
    copyToClipboard(url).then(() => showToast('店铺链接已复制', 'success'));
}

// ========== 工具函数 ==========
function statusText(s) {
    return { pending: '待支付', paid: '已支付', failed: '已失败' }[s] || s;
}
function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('zh-CN');
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function showModal(message) {
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal').classList.remove('hidden');
}
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}
