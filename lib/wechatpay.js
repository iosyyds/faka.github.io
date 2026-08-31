import crypto from 'crypto';
import https from 'https';

/**
 * 微信支付 APIv3 SDK（腾讯官方接口）
 * 支持：Native 扫码下单、平台证书自动下载、回调验签、回调数据 AES-256-GCM 解密
 *
 * 需要配置的环境变量：
 *  - WXPAY_APP_ID        微信公众平台 AppID（商户号已绑定该 AppID）
 *  - WXPAY_MCH_ID        微信支付商户号（10位数字）
 *  - WXPAY_SERIAL_NO     商户 API 证书序列号（商户平台-API安全-API证书）
 *  - WXPAY_PRIVATE_KEY   商户 API 私钥（PEM 格式，即 apiclient_key.pem 内容）
 *  - WXPAY_API_V3_KEY    APIv3 密钥（32位，商户平台设置）
 *  - WXPAY_NOTIFY_URL    支付回调地址（如 https://你的域名/api/notify）
 */
class WechatPay {
    constructor(config) {
        this.appId = config.appId || process.env.WXPAY_APP_ID;
        this.mchId = config.mchId || process.env.WXPAY_MCH_ID;
        this.serialNo = config.serialNo || process.env.WXPAY_SERIAL_NO;
        this.apiV3Key = config.apiV3Key || process.env.WXPAY_API_V3_KEY;
        this.notifyUrl = config.notifyUrl || process.env.WXPAY_NOTIFY_URL;
        // 商户 API 私钥（PEM）
        this.privateKey = this.formatPrivateKey(config.privateKey || process.env.WXPAY_PRIVATE_KEY);
        // 可选的平台证书公钥（若手动配置，则不再自动下载）
        this.platformPublicKey = config.platformPublicKey || process.env.WXPAY_PLATFORM_PUBLIC_KEY || '';
        // 平台证书缓存 { serialNo: { publicKey, expiresAt } }
        this.certCache = {};
        this.baseUrl = 'https://api.mch.weixin.qq.com';
    }

    isConfigured() {
        return !!(this.appId && this.mchId && this.serialNo && this.privateKey && this.apiV3Key &&
            this.appId !== 'placeholder' && this.mchId !== 'placeholder' &&
            this.serialNo !== 'placeholder' && this.apiV3Key !== 'placeholder' &&
            this.privateKey !== 'placeholder');
    }

    formatPrivateKey(key) {
        if (!key) return '';
        key = key.trim();
        key = key.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        if (key.startsWith('-----BEGIN')) return key;
        key = key.replace(/\s+/g, '');
        if (!key) return '';
        const lines = key.match(/.{1,64}/g).join('\n');
        return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
    }

    /**
     * 生成 APIv3 请求签名
     * @param {string} method - HTTP 方法（POST/GET）
     * @param {string} urlPath - URL 路径（含查询参数，如 /v3/pay/transactions/native）
     * @param {string} body - 请求体字符串（GET 为空）
     * @returns {object} { authorization, timestamp, nonce }
     */
    signRequest(method, urlPath, body = '') {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonce = crypto.randomBytes(16).toString('hex');
        const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(message, 'utf8');
        const signature = signer.sign(this.privateKey, 'base64');
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.serialNo}"`;
        return { authorization, timestamp, nonce, signature };
    }

    /**
     * 发起 APIv3 请求
     */
    request(method, urlPath, bodyObj = null) {
        return new Promise((resolve, reject) => {
            const body = bodyObj ? JSON.stringify(bodyObj) : '';
            const { authorization } = this.signRequest(method, urlPath, body);
            const url = new URL(this.baseUrl + urlPath);
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + url.search,
                method,
                headers: {
                    'Authorization': authorization,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'faka-nextjs/1.0'
                }
            };
            if (body) options.headers['Content-Length'] = Buffer.byteLength(body);

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (data) {
                        try {
                            resolve({ status: res.statusCode, data: JSON.parse(data), raw: data });
                        } catch (e) {
                            resolve({ status: res.statusCode, data: null, raw: data });
                        }
                    } else {
                        resolve({ status: res.statusCode, data: null, raw: '' });
                    }
                });
            });
            req.on('error', reject);
            if (body) req.write(body);
            req.end();
        });
    }

    /**
     * 下载微信支付平台证书（/v3/certificates）
     * 用 APIv3 密钥解密证书内容，缓存到内存
     */
    async downloadPlatformCertificates() {
        const res = await this.request('GET', '/v3/certificates');
        if (res.status !== 200 || !res.data) {
            throw new Error(`下载微信平台证书失败 (HTTP ${res.status}): ${res.raw}`);
        }
        const certs = res.data.data || [];
        for (const cert of certs) {
            try {
                const { ciphertext, associated_data, nonce } = cert.encrypt_certificate;
                const decrypted = this.decryptResource(ciphertext, nonce, associated_data);
                // decrypted 是 PEM 证书内容
                this.certCache[cert.serial_no] = {
                    publicKey: decrypted,
                    expiresAt: new Date(cert.expire_time).getTime()
                };
            } catch (e) {
                console.error('解密微信平台证书失败:', e.message);
            }
        }
        if (Object.keys(this.certCache).length === 0) {
            throw new Error('无法获取任何微信支付平台证书');
        }
    }

    /**
     * 获取平台证书公钥（用于验签）
     * 优先用缓存的；未缓存则自动下载
     */
    async getPlatformPublicKey(serialNo) {
        // 手动配置的平台证书公钥（PEM 或 PKCS#8 公钥）
        if (this.platformPublicKey && (!serialNo || serialNo === this.serialNo)) {
            // 如果手动配置了证书，直接使用
            this.certCache['manual'] = { publicKey: this.formatPublicKey(this.platformPublicKey), expiresAt: Infinity };
            return this.certCache['manual'].publicKey;
        }
        if (this.certCache[serialNo]) {
            return this.certCache[serialNo].publicKey;
        }
        // 自动下载
        await this.downloadPlatformCertificates();
        if (this.certCache[serialNo]) {
            return this.certCache[serialNo].publicKey;
        }
        // 如果请求的序列号不在证书列表中，使用第一个证书（部分平台证书会轮换）
        const keys = Object.keys(this.certCache);
        if (keys.length > 0) {
            return this.certCache[keys[0]].publicKey;
        }
        throw new Error('未找到微信支付平台证书，无法验签');
    }

    formatPublicKey(key) {
        if (!key) return '';
        key = key.trim();
        key = key.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        if (key.startsWith('-----BEGIN')) return key;
        // 可能是裸 base64 公钥
        key = key.replace(/\s+/g, '');
        if (!key) return '';
        const lines = key.match(/.{1,64}/g).join('\n');
        return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
    }

    /**
     * AES-256-GCM 解密（微信支付回调数据）
     */
    decryptResource(ciphertext, nonce, associatedData) {
        const key = Buffer.from(this.apiV3Key, 'utf8');
        const cipherBuf = Buffer.from(ciphertext, 'base64');
        const authTag = cipherBuf.subarray(cipherBuf.length - 16);
        const data = cipherBuf.subarray(0, cipherBuf.length - 16);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'));
        decipher.setAuthTag(authTag);
        decipher.setAAD(Buffer.from(associatedData || '', 'utf8'));
        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return decrypted.toString('utf8');
    }

    /**
     * Native 扫码下单
     * @param {Object} params - { outTradeNo, description, totalFee(分), timeExpire? }
     * @returns {Promise<{codeUrl: string, prepayId: string}>}
     */
    async nativePrepay(params) {
        if (!this.isConfigured()) {
            throw new Error('微信支付未配置，请在 Vercel 环境变量中设置 WXPAY_APP_ID、WXPAY_MCH_ID、WXPAY_SERIAL_NO、WXPAY_PRIVATE_KEY、WXPAY_API_V3_KEY');
        }
        const body = {
            appid: this.appId,
            mchid: this.mchId,
            description: params.description,
            out_trade_no: params.outTradeNo,
            notify_url: this.notifyUrl,
            amount: {
                total: params.totalFee,
                currency: 'CNY'
            }
        };
        if (params.timeExpire) body.time_expire = params.timeExpire;

        const res = await this.request('POST', '/v3/pay/transactions/native', body);
        if (res.status === 200 && res.data && res.data.code_url) {
            return {
                codeUrl: res.data.code_url,
                prepayId: res.data.prepay_id
            };
        }
        const errMsg = res.data && res.data.message ? res.data.message : res.raw;
        throw new Error(`微信支付下单失败: ${errMsg}`);
    }

    /**
     * 查询订单状态
     * @param {string} outTradeNo
     * @returns {Promise<object>} 交易信息
     */
    async queryOrder(outTradeNo) {
        const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${this.mchId}`;
        const res = await this.request('GET', path);
        if (res.status === 200 && res.data) {
            return res.data;
        }
        if (res.status === 404) {
            return { trade_state: 'NOTPAY' };
        }
        throw new Error(`微信支付查询失败: ${res.raw}`);
    }

    /**
     * 关闭订单
     */
    async closeOrder(outTradeNo) {
        const body = { mchid: this.mchId };
        const res = await this.request('POST', `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}/close`, body);
        return res.status === 204 || res.status === 200;
    }

    /**
     * 验证微信支付回调签名
     * @param {object} headers - 请求头
     * @param {string} body - 原始请求体
     * @returns {Promise<boolean>}
     */
    async verifyNotify(headers, body) {
        const timestamp = headers['wechatpay-timestamp'];
        const nonce = headers['wechatpay-nonce'];
        const signature = headers['wechatpay-signature'];
        const serial = headers['wechatpay-serial'];
        if (!timestamp || !nonce || !signature) {
            return false;
        }
        // 时间戳防重放（5分钟内）
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
            return false;
        }
        const message = `${timestamp}\n${nonce}\n${body}\n`;
        try {
            const publicKey = await this.getPlatformPublicKey(serial);
            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(message, 'utf8');
            return verifier.verify(publicKey, signature, 'base64');
        } catch (e) {
            console.error('微信回调验签失败:', e.message);
            return false;
        }
    }

    /**
     * 处理回调：验证签名 + 解密资源
     * @param {object} headers
     * @param {object} body - 已解析的 JSON
     * @returns {Promise<object>} 解密后的交易数据
     */
    async handleNotify(headers, body) {
        if (body.event_type !== 'TRANSACTION.SUCCESS') {
            return null;
        }
        const resource = body.resource;
        if (!resource) return null;
        const { ciphertext, nonce, associated_data } = resource;
        const decrypted = this.decryptResource(ciphertext, nonce, associated_data);
        return JSON.parse(decrypted);
    }
}

export default WechatPay;
