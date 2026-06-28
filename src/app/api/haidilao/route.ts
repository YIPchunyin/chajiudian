import { NextRequest, NextResponse } from 'next/server';
import * as QRCode from 'qrcode';

const HAIDILAO_API = 'https://superapp-public.kiwa-tech.com/api/gateway/tydc/front/queue/getVipCodeAndTime';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, rawHeaders } = body;

    // Build headers from user-provided raw headers or individual fields
    let headers: Record<string, string> = {};

    if (rawHeaders) {
      // Parse raw HTTP headers
      const lines = rawHeaders.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('POST') || trimmed.startsWith('GET') || trimmed.startsWith('HTTP')) continue;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
          const key = trimmed.substring(0, colonIdx).trim().toLowerCase();
          // Use the standardized key for known headers, original case for custom ones
          const val = trimmed.substring(colonIdx + 1).trim();
          headers[trimmed.substring(0, colonIdx).trim()] = val;
        }
      }
      // Override token with user input (in case it changed)
      if (token) headers['_haidilao_app_token'] = token;
      // Update k3 (timestamp)
      headers['k3'] = String(Date.now());
    } else if (token) {
      // Fallback to old method
      const { k2, k4, k5, k6, kid, deviceId } = body;
      headers = {
        '_haidilao_app_token': token,
        'user-agent': 'Dart/3.6 (dart:io)',
        'k1': 'Android',
        'accept-encoding': 'gzip',
        'publicattribute': '{"$lib": "Android"}',
        'content-type': 'application/json',
        'x-source': 'app',
        'k3': String(Date.now()),
        'http_wallet_api_version': '2.0',
        'systype': 'Android',
        'x-device-mobile-type': 'REDMI-2510DRK44C',
        'x-device-mobile-name': 'REDMI-2510DRK44C',
        'version': '9.10.4',
        'platformname': 'app',
        'host': 'superapp-public.kiwa-tech.com',
      };
      if (k2) headers['k2'] = k2;
      if (k4) headers['k4'] = k4;
      if (k5) headers['k5'] = k5;
      if (k6) headers['k6'] = k6;
      if (kid) headers['kid'] = kid;
      if (deviceId) headers['x-device-id'] = deviceId;
    } else {
      return NextResponse.json({ success: false, error: '缺少 _haidilao_app_token 或请求头' }, { status: 400 });
    }

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
      rawResponse: data,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || '请求失败',
    }, { status: 500 });
  }
}
