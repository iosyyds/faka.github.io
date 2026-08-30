import crypto from 'crypto';
import https from 'https';

/**
 * 支付宝当面付 SDK
 * 支持：预下单（扫码支付）、回调验签
 */
class Alipay {
    constructor(config) {
        this.appId = config.appId;
        this.privateKey = this.formatKey(config.privateKey, 'PRIVATE');
        this.publicKey = this.formatKey(config.publicKey, 'PUBLIC');
        this.gateway = config.gateway || 'https://openapi.alipay.com/gateway.do';
        this.notifyUrl = config.notifyUrl;
        this.sandbox = config.sandbox || false;
        // 检测是否为占位符/未配置
        this.isPlaceholder = !config.privateKey || config.privateKey === 'placeholder' ||
            !config.publicKey || config.publicKey === 'placeholder' ||
            !config.appId || config.appId === 'placeholder';
    }

    /**
     * 格式化密钥（支持带/不带 BEGIN/END 标记，处理 \n 字面量）
     */
    formatKey(key, type) {
        if (!key) return '';
        key = key.trim();

        // 处理 \n 字面量（Vercel 环境变量中换行可能被转义）
        key = key.replace(/\\n/g, '\n');
        key = key.replace(/\\r/g, '\r');

        // 如果已经是 PEM 格式，规范化后返回
        if (key.startsWith('-----BEGIN')) {
            // 确保首尾标记正确，去除多余空行
            return key.replace(/\r\n/g, '\n').trim();
        }

        // 去除所有空白字符（空格、制表符、换行）
        key = key.replace(/\s+/g, '');

        if (!key || key === 'placeholder') return '';

        // 每64字符换行
        const lines = key.match(/.{1,64}/g).join('\n');
        return `-----BEGIN ${type} KEY-----\n${lines}\n-----END ${type} KEY-----`;
    }

    /**
     * RSA2 签名
     */
    sign(params) {
        if (this.isPlaceholder || !this.privateKey) {
            throw new Error('支付宝密钥未配置，请在 Vercel 环境变量中设置 ALIPAY_APP_ID、ALIPAY_PRIVATE_KEY、ALIPAY_PUBLIC_KEY');
        }
        try {
            const sorted = this.sortParams(params);
            const signStr = this.buildQueryString(sorted);
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(signStr, 'utf8');
            return sign.sign(this.privateKey, 'base64');
        } catch (err) {
            console.error('支付宝签名失败:', err.message);
            throw new Error('支付宝私钥格式错误，请检查 ALIPAY_PRIVATE_KEY 是否为正确的 RSA2 应用私钥');
        }
    }

    /**
     * 验证签名（回调验签）
     */
    verify(params) {
        if (!this.publicKey) {
            console.error('支付宝公钥未配置，无法验签');
            return false;
        }
        try {
            const sign = params.sign;
            if (!sign) return false;
            const { sign: _, sign_type: __, ...rest } = params;
            const sorted = this.sortParams(rest);
            const signStr = this.buildQueryString(sorted);
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(signStr, 'utf8');
            return verify.verify(this.publicKey, sign, 'base64');
        } catch (err) {
            console.error('支付宝验签失败:', err.message);
            return false;
        }
    }

    /**
     * 按 key 排序参数
     */
    sortParams(params) {
        return Object.keys(params)
            .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
            .sort()
            .reduce((acc, key) => {
                acc[key] = params[key];
                return acc;
            }, {});
    }

    /**
     * 构建查询字符串（不编码，用于签名）
     */
    buildQueryString(params) {
        return Object.entries(params)
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
    }

    /**
     * 构建 URL 编码的查询字符串（用于请求）
     */
    buildEncodedQueryString(params) {
        return Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
    }

    /**
     * 发起请求
     */
    request(method, bizContent) {
        return new Promise((resolve, reject) => {
            const publicParams = {
                app_id: this.appId,
                method: method,
                format: 'JSON',
                charset: 'utf-8',
                sign_type: 'RSA2',
                timestamp: this.getTimestamp(),
                version: '1.0',
                notify_url: this.notifyUrl,
                biz_content: JSON.stringify(bizContent)
            };

            const sign = this.sign(publicParams);
            const allParams = { ...publicParams, sign };
            const postData = this.buildEncodedQueryString(allParams);

            const url = new URL(this.gateway);
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result);
                    } catch (e) {
                        reject(new Error('支付宝返回解析失败: ' + data));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    /**
     * 预下单（生成扫码支付二维码）
     * @param {Object} params - { outTradeNo, totalAmount, subject, body }
     * @returns {Promise<{qrCode: string, tradeNo: string}>}
     */
    async precreate(params) {
        const bizContent = {
            out_trade_no: params.outTradeNo,
            total_amount: params.totalAmount.toFixed(2),
            subject: params.subject,
            body: params.body || '',
            timeout_express: params.timeoutExpress || '15m'
        };

        const result = await this.request('alipay.trade.precreate', bizContent);
        const responseKey = 'alipay_trade_precreate_response';
        const resp = result[responseKey];

        if (resp && resp.code === '10000') {
            return {
                qrCode: resp.qr_code,
                tradeNo: resp.trade_no
            };
        } else {
            throw new Error(`预下单失败: ${resp ? resp.msg + ' - ' + (resp.sub_msg || '') : '未知错误'}`);
        }
    }

    /**
     * 查询订单状态（alipay.trade.query）
     * 用于回调失败时主动查询支付状态
     * @param {Object} params - { outTradeNo }
     * @returns {Promise<{tradeStatus: string, tradeNo: string, totalAmount: string}>}
     */
    async query(params) {
        const bizContent = {
            out_trade_no: params.outTradeNo
        };

        const result = await this.request('alipay.trade.query', bizContent);
        const responseKey = 'alipay_trade_query_response';
        const resp = result[responseKey];

        if (resp && resp.code === '10000') {
            return {
                tradeStatus: resp.trade_status, // TRADE_SUCCESS / WAIT_BUYER_PAY / TRADE_CLOSED
                tradeNo: resp.trade_no,
                totalAmount: resp.total_amount
            };
        } else if (resp && resp.code === '40004') {
            // 交易不存在（可能还没创建或已关闭）
            return { tradeStatus: 'NOT_FOUND', tradeNo: '', totalAmount: '0' };
        } else {
            throw new Error(`查询订单失败: ${resp ? resp.msg + ' - ' + (resp.sub_msg || '') : '未知错误'}`);
        }
    }

    /**
     * 获取时间戳
     */
    getTimestamp() {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
}

export default Alipay;
