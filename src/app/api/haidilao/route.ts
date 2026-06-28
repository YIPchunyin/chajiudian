import { NextResponse } from 'next/server';

// This endpoint returns the config so the browser can make the request directly
// (bypassing WAF which is IP-bound and blocks our server)
export async function GET() {
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

  return NextResponse.json({
    success: true,
    headers: HEADER_SETS,
    config: {
      url: 'https://superapp-public.kiwa-tech.com/api/gateway/tydc/front/queue/getVipCodeAndTime',
      baseHeaders: {
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
      },
    },
  });
}
