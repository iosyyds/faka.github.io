// 配置 - 部署后修改为你的 Vercel 域名
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

// 全局状态
let currentOrder = null;
let pollTimer = null;

// DOM 元素
const productSection = document.getElementById('product-section');
const orderSection = document.getElementById('order-section');
const resultSection = document.getElementById('result-section');
const productList = document.getElementById('product-list');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    bindEvents();
});

// 绑定事件
function bindEvents() {
    document.getElementById('check-status-btn').addEventListener('click', checkOrderStatus);
    document.getElementById('back-btn').addEventListener('click', backToProducts);
    document.getElementById('back-home-btn').addEventListener('click', backToProducts);
    document.getElementById('copy-all-btn').addEventListener('click', copyAllCards);
    document.getElementById('modal-close').addEventListener('click', closeModal);
}

// 加载商品列表
async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        const data = await res.json();

        if (data.success && data.products.length > 0) {
            renderProducts(data.products);
        } else {
            productList.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">暂无商品，请先在管理后台添加商品和卡密</p>';
        }
    } catch (err) {
        console.error('加载商品失败:', err);
        productList.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:40px;">商品加载失败，请检查后端服务是否正常</p>';
    }
}

// 渲染商品列表
function renderProducts(products) {
    productList.innerHTML = products.map(p => `
        <div class="product-card">
            <h3 class="product-name">${escapeHtml(p.name)}</h3>
            <p class="product-desc">${escapeHtml(p.description || '')}</p>
            <p class="product-price">¥${p.price.toFixed(2)} <small>/ 件</small></p>
            <p class="product-stock">库存：${p.stock} 件</p>
            <button class="buy-btn" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
                ${p.stock <= 0 ? '已售罄' : '立即购买'}
            </button>
        </div>
    `).join('');

    // 绑定购买按钮
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => createOrder(btn.dataset.id));
    });
}

// 创建订单
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
            // 开始轮询订单状态
            startPolling();
        } else {
            showModal(data.message || '创建订单失败');
        }
    } catch (err) {
        console.error('创建订单失败:', err);
        showModal('网络错误，请稍后重试');
    }
}

// 显示订单页面
function showOrderPage(order, qrCodeUrl) {
    productSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    orderSection.classList.remove('hidden');

    document.getElementById('order-product-name').textContent = order.product_name;
    document.getElementById('order-quantity').textContent = order.quantity;
    document.getElementById('order-amount').textContent = `¥${order.amount.toFixed(2)}`;
    document.getElementById('order-no').textContent = order.order_no;

    // 生成二维码
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: qrCodeUrl,
        width: 200,
        height: 200,
        correctLevel: QRCode.CorrectLevel.H
    });
}

// 开始轮询订单状态
function startPolling() {
    stopPolling();
    // 每3秒查询一次
    pollTimer = setInterval(checkOrderStatus, 3000);
}

// 停止轮询
function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// 查询订单状态
async function checkOrderStatus() {
    if (!currentOrder) return;

    try {
        const res = await fetch(`${API_BASE}/query-order?orderNo=${currentOrder.order_no}`);
        const data = await res.json();

        if (data.success && data.order.status === 'paid') {
            stopPolling();
            showResultPage(data.order);
        }
    } catch (err) {
        console.error('查询订单失败:', err);
    }
}

// 显示结果页面
function showResultPage(order) {
    orderSection.classList.add('hidden');
    productSection.classList.add('hidden');
    resultSection.classList.remove('hidden');

    const cardList = document.getElementById('card-list');
    if (order.cards && order.cards.length > 0) {
        cardList.innerHTML = order.cards.map((card, idx) => `
            <div class="card-item">
                <p class="card-item-label">卡密 ${idx + 1}${card.card_type ? `（${escapeHtml(card.card_type)}）` : ''}</p>
                <p class="card-item-value">${escapeHtml(card.card_content)}</p>
            </div>
        `).join('');
    } else {
        cardList.innerHTML = '<p style="text-align:center;color:#999;">卡密发放异常，请联系客服</p>';
    }
}

// 复制全部卡密
function copyAllCards() {
    const cards = document.querySelectorAll('.card-item-value');
    const text = Array.from(cards).map((el, i) => `卡密${i + 1}：${el.textContent}`).join('\n');

    navigator.clipboard.writeText(text).then(() => {
        showModal('卡密已复制到剪贴板');
    }).catch(() => {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showModal('卡密已复制到剪贴板');
    });
}

// 返回商品列表
function backToProducts() {
    stopPolling();
    currentOrder = null;
    orderSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    productSection.classList.remove('hidden');
    loadProducts();
}

// 显示弹窗
function showModal(message) {
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal').classList.remove('hidden');
}

// 关闭弹窗
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
