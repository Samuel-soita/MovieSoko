const axios = require('axios');
const Payment = require('../models/Payment');
const { dbReady } = require('../config/database');

const SANDBOX = 'https://sandbox.safaricom.co.ke';
const LIVE = 'https://api.safaricom.co.ke';

class MpesaService {
  get baseUrl() {
    return process.env.MPESA_ENV === 'production' ? LIVE : SANDBOX;
  }

  get configured() {
    return (
      process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY
    );
  }

  async getToken() {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');

    const { data } = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    return data.access_token;
  }

  buildPassword() {
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');
    return { password, timestamp };
  }

  formatPhone(phone) {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) p = `254${p.slice(1)}`;
    if (p.startsWith('7')) p = `254${p}`;
    return p;
  }

  sandboxAmount(amount) {
    if (process.env.MPESA_ENV === 'production') return Math.round(amount);
    return parseInt(process.env.MPESA_SANDBOX_AMOUNT || '1', 10);
  }

  getCallbackUrl() {
    const url = process.env.MPESA_CALLBACK_URL || `${process.env.APP_URL}/api/payments/callback`;
    const isLocal = /localhost|127\.0\.0\.1/i.test(url);

    if (process.env.MPESA_ENV !== 'production' && isLocal) {
      const sandboxUrl = process.env.MPESA_SANDBOX_CALLBACK_URL;
      if (sandboxUrl?.startsWith('https://')) return sandboxUrl;
      throw new Error(
        'Invalid CallBackURL: Safaricom rejects localhost. Set MPESA_SANDBOX_CALLBACK_URL to a public https URL (e.g. webhook.site).'
      );
    }

    if (!url.startsWith('https://') && process.env.MPESA_ENV === 'production') {
      throw new Error('Production CallBackURL must use HTTPS');
    }

    return url;
  }

  async initiateSTK({ phone, amount, tmdbId, movieTitle, userId }) {
    if (!this.configured) {
      return { demo: true, message: 'M-Pesa not configured — demo mode', amount, phone };
    }

    const token = await this.getToken();
    const { password, timestamp } = this.buildPassword();
    const callbackUrl = this.getCallbackUrl();
    const payAmount = this.sandboxAmount(amount);
    const formattedPhone = this.formatPhone(phone || process.env.MPESA_TEST_PHONE || '254708374149');

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: payAmount,
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `CINE254-${tmdbId}`.slice(0, 12),
      TransactionDesc: `Cine254 ${movieTitle}`.slice(0, 50),
    };

    const { data } = await axios.post(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    ).catch((err) => {
      const msg = err.response?.data?.errorMessage || err.response?.data?.ResponseDescription || err.message;
      throw new Error(msg);
    });

    if (data.ResponseCode !== '0') {
      throw new Error(data.ResponseDescription || 'STK push failed');
    }

    if (dbReady()) {
      await Payment.create({
        userId,
        phone: formattedPhone,
        tmdbId,
        movieTitle,
        amount: payAmount,
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
        status: 'pending',
      });
    }

    return {
      success: true,
      demo: false,
      message: data.ResponseDescription,
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      amount: payAmount,
      phone: formattedPhone,
      sandbox: process.env.MPESA_ENV !== 'production',
    };
  }

  async querySTKStatus(checkoutRequestId) {
    if (!this.configured) throw new Error('M-Pesa not configured');

    const token = await this.getToken();
    const { password, timestamp } = this.buildPassword();

    const { data } = await axios.post(
      `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    if (dbReady()) {
      const payment = await Payment.findOne({ checkoutRequestId });
      if (payment) {
        if (data.ResultCode === '0' || data.ResultCode === 0) {
          payment.status = 'completed';
        } else if (data.ResultCode && data.ResultCode !== '103') {
          payment.status = 'failed';
        }
        await payment.save();
      }
    }

    return {
      resultCode: data.ResultCode,
      resultDesc: data.ResultDesc,
      responseCode: data.ResponseCode,
      responseDesc: data.ResponseDescription,
      completed: data.ResultCode === '0' || data.ResultCode === 0,
      pending: data.ResultCode === '103' || data.ResultDesc?.includes('processing'),
    };
  }

  async handleCallback(body) {
    const result = body?.Body?.stkCallback;
    if (!result || !dbReady()) return;

    const payment = await Payment.findOne({ checkoutRequestId: result.CheckoutRequestID });
    if (!payment) return;

    const ok = result.ResultCode === 0 || result.ResultCode === '0';
    if (ok) {
      const items = result.CallbackMetadata?.Item || [];
      const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber');
      payment.status = 'completed';
      payment.mpesaReceipt = receipt?.Value;
    } else {
      payment.status = 'failed';
    }
    await payment.save();
  }
}

module.exports = new MpesaService();
