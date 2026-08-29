// ============================================
// 自动发卡商城 - 前台交互逻辑
// ============================================

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

// 全局状态
let currentOrder = null;
let pollTimer = null;
let siteSettings = {};

// DOM 元素
const productSection = document.getElementById('product-section');
const orderSection = document.getElementById('order-section');
const resultSection = document.getElementById('result-section');
const productList = document.getElementById('product-list');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadSiteSettings();
    loadProducts();
    bindEvents();
});

// 绑定事件
function bindEvents() {
    document.getElementById('check-status-btn').addEventListener('click', checkOrderStatus);
    document.getElementById('back-btn').addEventListener('click', backToHome);
    document.getElementById('back-home-btn').addEventListener('click', backToHome);
    document.getElementById('copy-all-btn').addEventListener('click', copyAllCards);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('query-order-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') doQueryOrder();
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
        console.warn('加载网站设置失败，使用默认值:', err);
    }
}

function applySettings() {
    const s = siteSettings;
    // 网站名称
    if (s.site_name) {
        document.title = s.site_name;
        document.getElementById('nav-site-name').textContent = s.site_name;
        document.getElementById('hero-title').textContent = s.site_name;
    }
    // 副标题
    if (s.site_subtitle) {
        document.getElementById('hero-subtitle').textContent = s.site_subtitle;
    }
    // 公告
    if (s.announcement && s.announcement.trim()) {
        document.getElementById('announcement-bar').style.display = 'flex';
        document.getElementById('announcement-text').textContent = s.announcement;
    }
    // 支付提示
    if (s.payment_tip) {
        document.getElementById('payment-tip').textContent = s.payment_tip;
    }
    // 页脚
    if (s.footer_text) {
        document.getElementById('footer-text').textContent = s.footer_text;
    }
    if (s.icp_number) {
        document.getElementById('footer-icp').textContent = s.icp_number;
    }
    // 联系方式
    const contacts = [];
    if (s.contact_qq) contacts.push(`QQ：${s.contact_qq}`);
    if (s.contact_wechat) contacts.push(`微信：${s.contact_wechat}`);
    if (s.contact_email) contacts.push(`邮箱：${s.contact_email}`);
    if (contacts.length > 0) {
        document.getElementById('footer-contact').innerHTML = contacts.map(c =>
            `<span>${escapeHtml(c)}</span>`
        ).join('');
    }
}

// ========== 商品列表 ==========
async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        const data = await res.json();
        if (data.success && data.products.length > 0) {
            renderProducts(data.products);
        } else {
            productList.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <div class="icon">📦</div>
                    <p>暂无商品，请先在管理后台添加商品和卡密</p>
                </div>`;
        }
    } catch (err) {
        console.error('加载商品失败:', err);
        productList.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="icon">⚠️</div>
                <p>商品加载失败，请检查后端服务是否正常</p>
            </div>`;
    }
}

function renderProducts(products) {
    const warningStock = parseInt(siteSettings.stock_warning || '5', 10);
    productList.innerHTML = products.map(p => {
        const isLow = p.stock > 0 && p.stock <= warningStock;
        return `
        <div class="product-card">
            <h3 class="product-name">${escapeHtml(p.name)}</h3>
            <p class="product-desc">${escapeHtml(p.description || '暂无描述')}</p>
            <p class="product-price">¥${Number(p.price).toFixed(2)} <small>/ 件</small></p>
            <p class="product-stock ${isLow ? 'low' : ''}">
                ${p.stock <= 0 ? '已售罄' : `库存：${p.stock} 件${isLow ? '（库存紧张）' : ''}`}
            </p>
            <button class="buy-btn" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
                ${p.stock <= 0 ? '已售罄' : '立即购买'}
            </button>
        </div>`;
    }).join('');

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => createOrder(btn.dataset.id));
    });
}

// ========== 创建订单 ==========
async function createOrder(productId) {
    try {
        const res = await fetch(`${API_BASE}/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity: 1 })
        });
        const data = await res.json();
        if (data.success) {
            currentOrder = data.order;
            showOrderPage(data.order, data.qrCode);
            startPolling();
        } else {
            showToast(data.message || '创建订单失败', 'error');
        }
    } catch (err) {
        console.error('创建订单失败:', err);
        showToast('网络错误，请稍后重试', 'error');
    }
}

function showOrderPage(order, qrCodeUrl) {
    productSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    orderSection.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('order-product-name').textContent = order.product_name;
    document.getElementById('order-quantity').textContent = order.quantity;
    document.getElementById('order-amount').textContent = `¥${Number(order.amount).toFixed(2)}`;
    document.getElementById('order-no').textContent = order.order_no;
    document.getElementById('order-status-text').textContent = '等待支付';

    // 生成二维码
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    qrContainer.classList.remove('qr-loading');
    new QRCode(qrContainer, {
        text: qrCodeUrl,
        width: 200,
        height: 200,
        correctLevel: QRCode.CorrectLevel.H
    });
}

// 支付方式选择
function selectPayMethod(method) {
    if (method === 'wechat') {
        showToast('微信支付暂未开通，请使用支付宝', 'warning');
        return;
    }
    document.querySelectorAll('.pay-method').forEach(el => {
        el.classList.toggle('active', el.dataset.method === method);
    });
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
            document.getElementById('order-status-text').textContent = '已支付';
            showResultPage(data.order);
        }
    } catch (err) {
        console.error('查询订单失败:', err);
    }
}

// ========== 发卡结果 ==========
function showResultPage(order) {
    orderSection.classList.add('hidden');
    productSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
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
    const text = valueEl.textContent;
    copyToClipboard(text).then(() => {
        btn.textContent = '已复制';
        setTimeout(() => btn.textContent = '复制', 1500);
    });
}

function copyAllCards() {
    const cards = document.querySelectorAll('.card-item-value');
    const text = Array.from(cards).map((el, i) => `卡密${i + 1}：${el.textContent}`).join('\n');
    copyToClipboard(text).then(() => {
        showToast('卡密已复制到剪贴板', 'success');
    });
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

// ========== 返回首页 ==========
function backToHome() {
    stopPolling();
    currentOrder = null;
    orderSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    productSection.classList.remove('hidden');
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== 订单查询 ==========
function showQueryModal() {
    document.getElementById('query-modal').classList.remove('hidden');
    document.getElementById('query-order-input').value = '';
    document.getElementById('query-result').innerHTML = '';
    setTimeout(() => document.getElementById('query-order-input').focus(), 100);
}

function closeQueryModal() {
    document.getElementById('query-modal').classList.add('hidden');
}

async function doQueryOrder() {
    const orderNo = document.getElementById('query-order-input').value.trim();
    const resultEl = document.getElementById('query-result');
    if (!orderNo) {
        showToast('请输入订单编号', 'warning');
        return;
    }
    resultEl.innerHTML = '<div style="text-align:center;padding:20px;"><span class="loading"></span> 查询中...</div>';
    try {
        const res = await fetch(`${API_BASE}/query-order?orderNo=${encodeURIComponent(orderNo)}`);
        const data = await res.json();
        if (data.success) {
            const order = data.order;
            let html = `
                <div style="background:#f5f7fa;border-radius:8px;padding:14px;margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                        <span style="color:#8c8c8c;">商品</span>
                        <span style="font-weight:500;">${escapeHtml(order.product_name)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                        <span style="color:#8c8c8c;">数量</span>
                        <span>${order.quantity}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                        <span style="color:#8c8c8c;">金额</span>
                        <span style="color:#ff4d4f;font-weight:600;">¥${Number(order.amount).toFixed(2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                        <span style="color:#8c8c8c;">状态</span>
                        <span>${statusText(order.status)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                        <span style="color:#8c8c8c;">下单时间</span>
                        <span style="font-size:12px;">${formatDate(order.created_at)}</span>
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

// ========== 工具函数 ==========
function statusText(s) {
    const map = { pending: '待支付', paid: '已支付', failed: '已失败' };
    return map[s] || s;
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

// ========== Toast 提示 ==========
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// ========== 通用弹窗 ==========
function showModal(message) {
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}
