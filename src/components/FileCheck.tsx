'use client';

import { useState, useRef } from 'react';

export default function FileCheck() {
  const [file, setFile] = useState<File | null>(null);
  const [columnName, setColumnName] = useState('\u9152\u5e97\u540d\u79f0');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [stats, setStats] = useState<{ total: number; cache: number; search: number; canUse: number } | null>(null);
  const [error, setError] = useState('');
  const [statusItems, setStatusItems] = useState<string[]>([]);
  const [checkIn, setCheckIn] = useState('2026-07-01');
  const [checkOut, setCheckOut] = useState('2026-07-02');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('\u8bf7\u9009\u62e9\u6587\u4ef6');
      return;
    }

    setLoading(true);
    setError('');
    setResultUrl('');
    setStats(null);
    setStatusItems([]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('columnName', columnName);
    formData.append('checkIn', checkIn);
    formData.append('checkOut', checkOut);

    try {
      const res = await fetch('/api/hotel/upload-check', {
        method: 'POST',
        body: formData,
      });

      const cacheHits = res.headers.get('X-Cache-Hits');
      const searchHits = res.headers.get('X-Search-Hits');
      const canUseCount = res.headers.get('X-Can-Use-Count');
      const total = res.headers.get('X-Processed-Count');

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setStats({
          total: Number(total) || 0,
          cache: Number(cacheHits) || 0,
          search: Number(searchHits) || 0,
          canUse: Number(canUseCount) || 0,
        });
      } else {
        const json = await res.json();
        setError(json.error || '\u5904\u7406\u5931\u8d25');
      }
    } catch (e: any) {
      setError(e.message || '\u7f51\u7edc\u9519\u8bef');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>{String.fromCodePoint(0x1f4c4)}</span>
          <span>{'\u8868\u683c\u6279\u91cf\u67e5\u8be2\u4e5d\u6298\u5238'}</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          {'\u4e0a\u4f20\u5305\u542b\u9152\u5e97\u540d\u79f0\u7684\u8868\u683c\uff0c\u7cfb\u7edf\u5c06\u81ea\u52a8\u68c0\u7d22\u7f13\u5b58\u6216\u901a\u8fc7\u7f51\u7ad9\u67e5\u8be2\uff0c\u5e76\u6dfb\u52a0\u201c\u80fd\u5426\u4f7f\u7528\u4e5d\u6298\u5238\u201d\u5217'}
        </p>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">{'\u9009\u62e9\u6587\u4ef6\uff08.xlsx / .xls\uff09'}</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">{'\u9152\u5e97\u540d\u79f0\u6240\u5728\u5217\u540d'}</label>
            <input
              type="text"
              className="w-full border rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder={'\u9ed8\u8ba4\u4e3a\u201c\u9152\u5e97\u540d\u79f0\u201d'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{'\u5165\u4f4f\u65e5\u671f'}</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{'\u79bb\u5e97\u65e5\u671f'}</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm"
          >
            {loading ? String.fromCodePoint(0x23f3) + ' \u5904\u7406\u4e2d...' : String.fromCodePoint(0x1f680) + ' \u5f00\u59cb\u67e5\u8be2'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4">{'\u274c'} {error}</div>
      )}

      {loading && (
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-sm text-gray-500 mt-2">{'\u6b63\u5728\u5904\u7406\u4e2d\uff0c\u8bf7\u7a0d\u5019...'}</p>
        </div>
      )}

      {stats && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-800 mb-3">{'\u67e5\u8be2\u7ed3\u679c'}</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
              <div className="text-xs text-gray-500">{'\u603b\u8ba1'}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.cache}</div>
              <div className="text-xs text-blue-500">{'\u7f13\u5b58'}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.search}</div>
              <div className="text-xs text-orange-500">{'\u722c\u866b'}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.canUse}</div>
              <div className="text-xs text-green-500">{'\u53ef\u7528\u4e5d\u6298'}</div>
            </div>
          </div>

          {resultUrl && (
            <a
              href={resultUrl}
              download={'result_' + new Date().toISOString().split('T')[0] + '.xlsx'}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition text-sm"
            >
              {String.fromCodePoint(0x1f4e5)} {'\u4e0b\u8f7d\u7ed3\u679c\u8868\u683c'}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
