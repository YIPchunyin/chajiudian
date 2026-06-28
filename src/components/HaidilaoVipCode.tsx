'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const HAIDILAO_URL = 'https://superapp-public.kiwa-tech.com/api/gateway/tydc/front/queue/getVipCodeAndTime';

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

let headerIndex = 0;

function buildHeaders(): Record<string, string> {
  const set = HEADER_SETS[headerIndex % HEADER_SETS.length];
  headerIndex++;
  return {
    ...BASE_HEADERS,
    'k3': String(Date.now()),
    'k4': set.k4,
    'k6': set.k6,
    'k2': set.k2,
  };
}

export default function HaidilaoVipCode() {
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [vipCode, setVipCode] = useState('');
  const [nickName, setNickName] = useState('');
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const abortRef = useRef<AbortController | null>(null);
  const countdownRef = useRef<any>(null);

  const fetchQrCode = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setLoading(true);
    setError('');

    try {
      // Step 1: Call Haidilao API directly from browser (handles WAF cookies automatically)
      const headers = buildHeaders();
      const response = await fetch(HAIDILAO_URL, {
        method: 'POST',
        headers,
        body: '{}',
        credentials: 'include',
        signal: abort.signal,
      });

      if (!response.ok) {
        setError('HTTP ' + response.status);
        return;
      }

      // Check if response is JSON
      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        const text = await response.text();
        setError('服务器返回: ' + text.substring(0, 80));
        return;
      }

      const data = await response.json();

      if (!data.success) {
        setError(data.msg || 'API请求失败');
        return;
      }

      const newVipCode: string = data.data?.vipCode;
      if (!newVipCode) {
        setError('未获取到vipCode');
        return;
      }

      setVipCode(newVipCode);
      setNickName(data.data?.nickName || '');

      // Step 2: Generate QR code via our server
      const qrRes = await fetch('/api/haidilao/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vipCode: newVipCode }),
      });
      const qrData = await qrRes.json();
      if (qrData.success) {
        setQrDataUrl(qrData.qrDataUrl);
      } else {
        setError('QR生成失败');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => { fetchQrCode(); return () => { clearInterval(countdownRef.current); abortRef.current?.abort(); }; }, [fetchQrCode]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) { clearInterval(countdownRef.current); setCountdown(10); return; }
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { fetchQrCode(); return 10; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [autoRefresh, fetchQrCode]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = 'haidilao_vipcode_' + Date.now() + '.png';
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-1">海底捞黑海会员</h2>
        {nickName && <p className="text-sm text-gray-500 mb-4">昵称：{nickName}</p>}
        {!nickName && <p className="text-sm text-gray-400 mb-4">动态会员码</p>}

        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-xl shadow-inner border-2 border-red-100">
            {loading && !qrDataUrl ? (
              <div className="w-[280px] h-[280px] flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
              </div>
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} key={qrDataUrl + Date.now()} alt="动态码" className="w-[280px] h-[280px] rounded-lg" />
            ) : (
              <div className="w-[280px] h-[280px] flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 text-sm">
                {error || '等待获取...'}
              </div>
            )}
          </div>
        </div>

        {autoRefresh && qrDataUrl && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className={'w-2 h-2 rounded-full animate-pulse ' + (loading ? 'bg-yellow-400' : 'bg-green-500')}></div>
            <span className="text-sm text-gray-500">
              {loading ? '刷新中...' : countdown + 's 后自动刷新'}
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm mb-3 break-all">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <button onClick={fetchQrCode} disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-6 rounded-xl transition text-sm">
            {loading ? '刷新中...' : '手动刷新'}
          </button>
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={'font-semibold py-2.5 px-5 rounded-xl transition text-sm ' + (autoRefresh ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')}>
            {autoRefresh ? '自动刷新 ON' : '自动刷新 OFF'}
          </button>
          {qrDataUrl && (
            <button onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl transition text-sm">
              下载
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow px-6 py-4 text-center">
        <p className="text-xs text-gray-400">
          浏览器直接请求海底捞API | 8组签名轮换 | 自动处理WAF
        </p>
      </div>
    </div>
  );
}
