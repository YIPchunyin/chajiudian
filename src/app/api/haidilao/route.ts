import { NextRequest, NextResponse } from 'next/server';
import * as QRCode from 'qrcode';

const HAIDILAO_API = 'https://superapp-public.kiwa-tech.com/api/gateway/tydc/front/queue/getVipCodeAndTime';

// Headers extracted from captured HAR data - fully hardcoded
// Token and device params are stable across sessions
function buildHeaders(): Record<string, string> {
  return {
    '_haidilao_app_token': 'TOKEN_APP_e8ac04f6-6bbf-47a8-873d-aff8e0c60511',
    'user-agent': 'Dart/3.6 (dart:io)',
    'k1': 'Android',
    'accept-encoding': 'gzip',
    'publicattribute': '{"$lib": "Android"}',
    'content-type': 'application/json',
    'x-source': 'app',
    'k3': String(Date.now()),
    'http_wallet_api_version': '2.0',
    'k4': 'bGEjl70Epa86zfk1',
    'systype': 'Android',
    'k5': '0a13c288',
    'kid': 'Android.20260628.9cf3.3c5f07',
    'x-device-model': 'Phone',
    'version': '9.10.4',
    'k6': 'rBYDIG60AwDbmaQtiX1jtGm4ZYM=',
    'x-device-mobile-type': 'REDMI-2510DRK44C',
    'platformname': 'app',
    'x-device-id': '692152c9-3090-4106-9340-fcdfc2f5e1ad',
    'k2': '0nZBSgo33VqrYhlFefpMlgX2Z5zzsoDG',
    'x-device-mobile-name': 'REDMI-2510DRK44C',
  };
}

export async function GET() {
  try {
    const headers = buildHeaders();

    const response = await fetch(HAIDILAO_API, {
      method: 'POST',
      headers,
      body: '{}',
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json({
        success: false,
        error: data.msg || '海底捞API请求失败',
        code: data.code,
        hint: 'token或签名参数可能已过期，请重新抓包获取最新数据',
      }, { status: 400 });
    }

    const vipCode: string = data.data?.vipCode;
    if (!vipCode) {
      return NextResponse.json({ success: false, error: '未获取到vipCode' }, { status: 500 });
    }

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(vipCode, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

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
