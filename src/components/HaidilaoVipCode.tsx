'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function HaidilaoVipCode() {
  const [token, setToken] = useState('');
  const [rawHeaders, setRawHeaders] = useState('');
  const [useRawHeaders, setUseRawHeaders] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [vipCode, setVipCode] = useState('');
  const [nickName, setNickName] = useState('');
  const [error, setError] = useState('');
  const [rawJson, setRawJson] = useState<any>(null);
  const [showJson, setShowJson] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [lastSuccess, setLastSuccess] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const doFetch = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setLoading(true);
    setError('');

    try {
      const payload: any = {};
      if (useRawHeaders && rawHeaders.trim()) {
        payload.rawHeaders = rawHeaders;
        if (token.trim()) payload.token = token.trim();
      } else {
        if (!token.trim()) {
          setError('请输入 _haidilao_app_token');
          setLoading(false);
          return;
        }
        payload.token = token.trim();
      }

      const res = await fetch('/api/haidilao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abort.signal,
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || '请求失败');
        setLastSuccess(false);
        return;
      }

      setQrDataUrl(data.qrDataUrl);
      setVipCode(data.vipCode);
      setNickName(data.nickName || '');
      setRawJson(data);
      setLastSuccess(true);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message || '网络错误');
        setLastSuccess(false);
      }
    } finally {
      setLoading(false);
    }
  }, [token, rawHeaders, useRawHeaders]);

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh || !lastSuccess) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(10);
      return;
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Time to refresh
          doFetch();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, lastSuccess, doFetch]);

  const handleFetch = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAutoRefresh(false);
    setCountdown(10);
    doFetch();
  };

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      setAutoRefresh(false);
      setCountdown(10);
      if (countdownRef.current) clearInterval(countdownRef.current);
    } else {
      if (!qrDataUrl) {
        // Auto-refresh needs a successful fetch first
        doFetch().then(() => {
          setAutoRefresh(true);
          setCountdown(10);
        });
      } else {
        setAutoRefresh(true);
        setCountdown(10);
      }
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = 'haidilao_vipcode_' + Date.now() + '.png';
    link.href = qrDataUrl;
    link.click();
  };

  // Pre-fill rawHeaders from HAR data
  const fillSampleHeaders = () => {
    const sample = 'POST /api/gateway/tydc/front/queue/getVipCodeAndTime HTTP/1.1\nHost: superapp-public.kiwa-tech.com\n_haidilao_app_token: TOKEN_APP_e8ac04f6-6bbf-47a8-873d-aff8e0c60511\nuser-agent: Dart/3.6 (dart:io)\nk1: Android\naccept-encoding: gzip\npublicattribute: {"$lib": "Android"}\ncontent-type: application/json\nx-source: app\nk3: ' + Date.now() + '\nhttp_wallet_api_version: 2.0\nk4: bGEjl70Epa86zfk1\nsystype: Android\nk5: 0a13c288\nkid: Android.20260628.9cf3.3c5f07\nx-device-model: Phone\nversion: 9.10.4\nk6: rBYDIG60AwDbmaQtiX1jtGm4ZYM=\nx-device-mobile-type: REDMI-2510DRK44C\nplatformname: app\nx-device-id: 692152c9-3090-4106-9340-fcdfc2f5e1ad\nk2: 0nZBSgo33VqrYhlFefpMlgX2Z5zzsoDG\nx-device-mobile-name: REDMI-2510DRK44C';
    setRawHeaders(sample);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span>{'\u{1f372}'}</span>
          <span>海底捞黑海会员动态码</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          输入 <code className="bg-gray-100 px-1 rounded text-red-500">_haidilao_app_token</code> 或粘贴完整请求头，获取动态会员码QR码
        </p>

        {/* Toggle between simple token mode and raw headers mode */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setUseRawHeaders(false)}
            className={'px-3 py-1.5 text-xs font-medium rounded-md transition ' + (!useRawHeaders ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}
          >
            仅Token
          </button>
          <button
            onClick={() => setUseRawHeaders(true)}
            className={'px-3 py-1.5 text-xs font-medium rounded-md transition ' + (useRawHeaders ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}
          >
            完整请求头
          </button>
        </div>

        {!useRawHeaders ? (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              _haidilao_app_token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="输入你的 token..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-600">
                完整请求头
              </label>
              <button onClick={fillSampleHeaders} className="text-xs text-blue-500 hover:text-blue-700">
                填入示例
              </button>
            </div>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-xs font-mono"
              rows={12}
              placeholder={'POST /api/gateway/tydc/front/queue/getVipCodeAndTime HTTP/1.1\nHost: superapp-public.kiwa-tech.com\n_haidilao_app_token: TOKEN_APP_...\nk1: Android\n...'}
              value={rawHeaders}
              onChange={(e) => setRawHeaders(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">从抓包工具复制完整请求头（包含 k2、k4、k6），粘贴到上面</p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleFetch}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition text-sm"
          >
            {loading ? '\u{23f3} 获取中...' : '\u{1f50d} 获取动态码'}
          </button>
          {qrDataUrl && (
            <button
              onClick={toggleAutoRefresh}
              className={'font-semibold py-2 px-6 rounded-lg transition text-sm ' + (autoRefresh ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')}
            >
              {autoRefresh ? '\u{1f504} 自动刷新中 (' + countdown + 's)' : '\u{1f504} 开启自动刷新'}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
            {'\u274c'} {error}
          </div>
        )}
      </div>

      {/* QR Code Result */}
      {qrDataUrl && (
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            {'\u{1f4f1}'} 黑海会员动态码
          </h3>
          {nickName && (
            <p className="text-sm text-gray-500 mb-1">
              昵称：<span className="font-semibold text-gray-700">{nickName}</span>
            </p>
          )}
          {autoRefresh && (
            <p className="text-xs text-green-500 mb-2">
              {'\u{1f504}'} 每 10 秒自动刷新 | 下次刷新 {countdown}s
            </p>
          )}
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl + '?t=' + Date.now()}
              alt="海底捞黑海会员动态码"
              className="border-2 border-gray-200 rounded-lg shadow-sm"
              style={{ width: 280, height: 280 }}
            />
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition text-sm"
            >
              {'\u{1f4e5}'} 下载图片
            </button>
            <button
              onClick={() => setShowJson(!showJson)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition text-sm"
            >
              {showJson ? '\u{1f4d1}' + ' 隐藏JSON' : '\u{1f4cb}' + ' 显示JSON'}
            </button>
          </div>

          {showJson && rawJson && (
            <div className="mt-4 text-left">
              <pre className="bg-gray-50 border rounded-lg p-4 text-xs overflow-auto max-h-96">
                {JSON.stringify(rawJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2">如何使用</h3>
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>方式一（仅Token）：</strong>打开抓包工具 → 找到 <code className="bg-gray-100 px-1 rounded">getVipCodeAndTime</code> 请求 → 复制 <code className="bg-gray-100 px-1 rounded">_haidilao_app_token</code> 的值 → 粘贴到输入框</p>
          <p><strong>方式二（完整请求头，推荐）：</strong>打开抓包工具 → 找到 <code className="bg-gray-100 px-1 rounded">getVipCodeAndTime</code> 请求 → 复制 <strong>完整请求头</strong>（从 POST 行开始到最后一个 header）→ 粘贴到文本框 → 点击获取动态码</p>
          <p className="text-amber-600 mt-1">{'\u26a0'} 开启自动刷新后，每 10 秒自动获取最新动态码。如果请求失败，需要重新抓包获取最新的 k2/k4/k6</p>
        </div>
      </div>
    </div>
  );
}
