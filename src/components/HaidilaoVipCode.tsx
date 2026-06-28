'use client';

import { useState, useRef } from 'react';

export default function HaidilaoVipCode() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [vipCode, setVipCode] = useState('');
  const [nickName, setNickName] = useState('');
  const [error, setError] = useState('');
  const [rawJson, setRawJson] = useState<any>(null);
  const [showJson, setShowJson] = useState(false);
  const qrRef = useRef<HTMLImageElement>(null);

  const handleFetch = async () => {
    if (!token.trim()) {
      setError('请输入 _haidilao_app_token');
      return;
    }
    setLoading(true);
    setError('');
    setQrDataUrl(null);
    setVipCode('');
    setNickName('');
    setRawJson(null);
    setShowJson(false);

    try {
      const res = await fetch('/api/haidilao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      setRawJson(data);

      if (!data.success) {
        setError(data.error || '请求失败');
        return;
      }

      setQrDataUrl(data.qrDataUrl);
      setVipCode(data.vipCode);
      setNickName(data.nickName || '');
    } catch (e: any) {
      setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

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
          输入你的 <code className="bg-gray-100 px-1 rounded text-red-500">_haidilao_app_token</code>，获取动态会员码并生成QR码图片
        </p>

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
            <button
              onClick={handleFetch}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition text-sm whitespace-nowrap"
            >
              {loading ? '\u{23f3} 获取中...' : '\u{1f50d} 获取动态码'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
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
            <p className="text-sm text-gray-500 mb-3">
              昵称：<span className="font-semibold text-gray-700">{nickName}</span>
            </p>
          )}
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={qrRef}
              src={qrDataUrl}
              alt="海底捞黑海会员动态码"
              className="border-2 border-gray-200 rounded-lg shadow-sm"
              style={{ width: 280, height: 280 }}
            />
          </div>
          <div className="flex gap-2 justify-center">
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
        <h3 className="text-sm font-bold text-gray-700 mb-2">如何获取你的 token？</h3>
        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
          <li>打开海底捞APP，确保已登录</li>
          <li>用抓包工具（如Reqable、Charles、Fiddler）抓取APP请求</li>
          <li>搜索 <code className="bg-gray-100 px-1 rounded">getVipCodeAndTime</code> 接口</li>
          <li>从请求头中复制 <code className="bg-gray-100 px-1 rounded">_haidilao_app_token</code> 的值</li>
          <li>粘贴到上面输入框，点击获取动态码</li>
        </ol>
        <p className="text-xs text-amber-600 mt-2">
          {'\u26a0'} Token 会过期，过期后需要重新抓取
        </p>
      </div>
    </div>
  );
}
