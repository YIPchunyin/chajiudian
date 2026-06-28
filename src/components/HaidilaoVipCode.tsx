'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function HaidilaoVipCode() {
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [vipCode, setVipCode] = useState('');
  const [nickName, setNickName] = useState('');
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const abortRef = useRef<AbortController | null>(null);
  const countdownRef = useRef<any>(null);

  // Auto-fetch on mount
  useEffect(() => {
    fetchQrCode();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQrCode = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/haidilao', {
        signal: abort.signal,
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || '获取失败');
        return;
      }

      setQrDataUrl(data.qrDataUrl);
      setVipCode(data.vipCode);
      setNickName(data.nickName || '');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message || '网络错误');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(10);
      return;
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchQrCode();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, fetchQrCode]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = 'haidilao_vipcode_' + Date.now() + '.png';
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span>{'\u{1f372}'}</span>
          <span>海底捞黑海会员动态码</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          自动获取黑海会员动态码，每 10 秒自动刷新
        </p>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchQrCode}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm"
          >
            {loading ? '\u{23f3} 获取中...' : '\u{1f50d} 获取动态码'}
          </button>
          {qrDataUrl && (
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={'font-semibold py-2.5 px-6 rounded-lg transition text-sm ' + (autoRefresh ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')}
            >
              {autoRefresh ? '\u{1f504} 自动刷新 (' + countdown + 's)' : '\u{1f504} 开启自动刷新'}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
            {'\u274c'} {error}
            <p className="text-xs text-gray-500 mt-1">抓包数据可能已过期，需要重新抓取最新的请求头更新代码</p>
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
          <p className="text-xs text-gray-400 mb-3">
            会员码每 10 秒自动刷新，直接展示给店员扫码
          </p>
          {autoRefresh && (
            <p className="text-xs text-green-500 mb-2">
              {'\u{1f504}'} {countdown}s 后刷新
            </p>
          )}
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              key={qrDataUrl}
              alt="海底捞黑海会员动态码"
              className="border-2 border-gray-200 rounded-lg shadow-sm"
              style={{ width: 280, height: 280 }}
            />
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm"
            >
              {'\u{1f4e5}'} 下载图片
            </button>
          </div>
        </div>
      )}

      {/* Status info */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className={'inline-block w-2 h-2 rounded-full ' + (qrDataUrl ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-gray-300')}></span>
          <span>
            {qrDataUrl ? '\u2705 已获取到动态码' : error ? '\u274c 获取失败' : '\u23f3 等待获取...'}
            {vipCode && <span className="text-xs text-gray-400 ml-1">| {vipCode.split('&')[0]}</span>}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          数据来源：2026-06-29 抓包 HAR 文件 | token/设备信息已硬编码
        </p>
      </div>
    </div>
  );
}
