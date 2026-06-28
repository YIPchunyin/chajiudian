'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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
      const res = await fetch('/api/haidilao', { signal: abort.signal });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || '获取失败');
        return;
      }

      setQrDataUrl(data.qrDataUrl);
      setVipCode(data.vipCode);
      setNickName(data.nickName || '');
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQrCode(); return () => { clearInterval(countdownRef.current); abortRef.current?.abort(); }; }, [fetchQrCode]);

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
              <img src={qrDataUrl} key={qrDataUrl} alt="动态码" className="w-[280px] h-[280px] rounded-lg" />
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
            {error.includes('WAF') && (
              <p className="text-xs text-gray-500 mt-1">
                服务端IP被阿里云WAF拦截。需要在手机端打开海底捞APP保持活跃，让WAF cookie保持有效
              </p>
            )}
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
        <p className="text-xs text-gray-400">服务器代理请求海底捞API | 自动处理WAF cookie</p>
      </div>
    </div>
  );
}
