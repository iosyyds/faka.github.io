const crypto = require('crypto');
const https = require('https');

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
    }

    /**
     * 格式化密钥（支持带/不带 BEGIN/END 标记）
     */
    formatKey(key, type) {
        if (!key) return '';
        key = key.trim();
        if (key.startsWith('-----BEGIN')) return key;
        // 每64字符换行
        const lines = key.match(/.{1,64}/g).join('\n');
        return `-----BEGIN ${type} KEY-----\n${lines}\n-----END ${type} KEY-----`;
    }

    /**
     * RSA2 签名
     */
    sign(params) {
        const sorted = this.sortParams(params);
        const signStr = this.buildQueryString(sorted);
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(signStr, 'utf8');
        return sign.sign(this.privateKey, 'base64');
    }

    /**
     * 验证签名（回调验签）
     */
    verify(params) {
        const sign = params.sign;
        if (!sign) return false;
        const { sign: _, sign_type: __, ...rest } = params;
        const sorted = this.sortParams(rest);
        const signStr = this.buildQueryString(sorted);
        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(signStr, 'utf8');
        return verify.verify(this.publicKey, sign, 'base64');
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
     * 获取时间戳
     */
    getTimestamp() {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
}

module.exports = Alipay;
