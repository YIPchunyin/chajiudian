import { NextResponse } from 'next/server';
import * as QRCode from 'qrcode';

const HAIDILAO_API = 'https://superapp-public.kiwa-tech.com/api/gateway/tydc/front/queue/getVipCodeAndTime';

const HEADER_SETS = [
  { k2: '3oGEz5VWFjTWhsSpUVXZctVWDifexJ2I', k4: 'MI56AX7gMmD34mQF', k6: 'a23ufHMFhEj64yAF6hlMs7y2VqE=' },
  { k2: '0nZBSgo33VqrYhlFefpMlgX2Z5zzsoDG', k4: 'bGEjl70Epa86zfk1', k6: 'rBYDIG60AwDbmaQtiX1jtGm4ZYM=' },
  { k2: 'vjHNxq36vTWDqpBaR7SvZFVCW17oaQEM', k4: 'LM59HYtHktWS4DxW', k6: 'bfxKJFFtiojIFVvOfd8lWNo/ZCQ=' },
  { k2: 'SboX7mrkzZoWQf3Fds4rIcYtDNr5jM5i', k4: '9iPvW3326wkIDSwu', k6: 'DtWipNVLwHplJ1zZl5Y9/F1pryc=' },
  { k2: 'DaLS7X5J9V5DKuytSge57QRhVqRoP6GY', k4: 'U5tG2dKLlvN0meS1', k6: 'upgFjAmdHpm4b4gTb/ne7eCxoUA=' },
  { k2: 'QjhtV4eS9voRP6RCZiivoJEaL1Gbfzbl', k4: 'Rlfu5j5BGjPy6DQT', k6: 'RKnYLO/p4QMlPm3HaQV6/UCrWeA=' },
  { k2: 'TCBsJgYzVsmhp3rrCiSSK4o8ZmDYauSk', k4: 'pkhCbu1qtkkApAZI', k6: 'xY+pemIoufgiSRwmaSb1gnCH/Dw=' },
  { k2: 'XLj9HwQt07fIaIdqSVnxY1enWk7qpp0D', k4: 'rDEA7n4QIEzuZBHJ', k6: 'ZL2AKSgm+Bh4GcYVxK002T5yG1w=' },
];

// Cookie storage - refreshed periodically
let cookieJar: string = '';
let cookieExpiry = 0;

const BASE_HEADERS = {
  '_haidilao_app_token': 'TOKEN_APP_e8ac04f6-6bbf-47a8-873d-aff8e0c60511',
  'user-agent': 'Dart/3.6 (dart:io)',
  'k1': 'Android',
  'accept-encoding': 'gzip',
  'publicattribute': '{"$lib": "Android"}',
  'content-type': 'application/json',
  'x-source': 'app',
  'http_wallet_api_version': '2.0',
  'systype': 'Android',
  'k5': '0a13c288',
  'kid': 'Android.20260628.9cf3.3c5f07',
  'x-device-model': 'Phone',
  'version': '9.10.4',
  'x-device-mobile-type': 'REDMI-2510DRK44C',
  'platformname': 'app',
  'x-device-id': '692152c9-3090-4106-9340-fcdfc2f5e1ad',
  'x-device-mobile-name': 'REDMI-2510DRK44C',
};

let headerIndex = 0;

function buildHeaders(): Record<string, string> {
  const set = HEADER_SETS[headerIndex % HEADER_SETS.length];
  headerIndex++;
  const h: Record<string, string> = {
    ...BASE_HEADERS,
    'k3': String(Date.now()),
    'k4': set.k4,
    'k6': set.k6,
    'k2': set.k2,
  };
  // Add stored cookie if still valid
  if (cookieJar && Date.now() < cookieExpiry) {
    h['Cookie'] = cookieJar;
  }
  return h;
}

async function doRequest(headers: Record<string, string>): Promise<{ status: number; body: string; ct: string; setCookie: string | null }> {
  const res = await fetch(HAIDILAO_API, { method: 'POST', headers, body: '{}' });
  const body = await res.text();
  const ct = res.headers.get('content-type') || '';
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body, ct, setCookie };
}

export async function GET() {
  try {
    // Try with existing cookie first
    let headers = buildHeaders();
    let result = await doRequest(headers);

    // If blocked by WAF (non-JSON response), try to get a fresh cookie
    if (!result.ct.includes('json')) {
      // Step 1: Make a bare request to get the WAF acw_tc cookie
      const probeRes = await fetch(HAIDILAO_API, {
        method: 'POST',
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
          'content-type': 'application/json',
        },
        body: '{}',
      });
      const probeCookie = probeRes.headers.get('set-cookie');
      if (probeCookie) {
        const match = probeCookie.match(/acw_tc=[^;]+/);
        if (match) {
          cookieJar = match[0];
          cookieExpiry = Date.now() + 25 * 60 * 1000; // 25 minutes (acw_tc max-age=1800s=30min)

          // Step 2: Retry with the fresh cookie
          headers = buildHeaders();
          result = await doRequest(headers);
        }
      }

      // Still blocked? Try once more with just the cookie
      if (!result.ct.includes('json')) {
        const retryHeaders = buildHeaders();
        retryHeaders['Cookie'] = cookieJar || '';
        const retryRes = await fetch(HAIDILAO_API, { method: 'POST', headers: retryHeaders, body: '{}' });
        const retryCt = retryRes.headers.get('content-type') || '';
        if (retryCt.includes('json')) {
          result = { status: retryRes.status, body: await retryRes.text(), ct: retryCt, setCookie: retryRes.headers.get('set-cookie') };
        }
      }
    }

    // Parse the final response
    if (!result.ct.includes('json')) {
      return NextResponse.json({
        success: false,
        error: 'WAF拦截: ' + result.body.substring(0, 120),
        hint: '如需更新cookie，请重新抓包获取最新的acw_tc',
      }, { status: 400 });
    }

    let data;
    try { data = JSON.parse(result.body); } catch { data = null; }

    if (!data || !data.success) {
      return NextResponse.json({
        success: false,
        error: data?.msg || 'API请求失败',
        code: data?.code,
      }, { status: 400 });
    }

    const vipCode: string = data.data?.vipCode;
    if (!vipCode) {
      return NextResponse.json({ success: false, error: '未获取到vipCode' }, { status: 500 });
    }

    const qrDataUrl = await QRCode.toDataURL(vipCode, { width: 400, margin: 2 });

    return NextResponse.json({
      success: true,
      vipCode,
      qrDataUrl,
      nickName: data.data?.nickName,
      sysTime: data.data?.sysTime,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || '请求失败',
    }, { status: 500 });
  }
}
