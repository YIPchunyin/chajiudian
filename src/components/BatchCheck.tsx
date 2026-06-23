'use client';

import { useState } from 'react';
import JsonViewer from '@/components/JsonViewer';

interface BatchResult {
  hotelName: string;
  source: 'cache' | 'search';
  found: boolean;
  has90Percent: boolean;
  canUse90Percent: boolean;
  details: string;
}

export default function BatchCheck() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<unknown>(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    const text = input.trim();
    if (!text) return;

    const hotelNames = text.split(',').map((s) => s.trim()).filter(Boolean);
    if (hotelNames.length === 0) return;

    setLoading(true);
    setResults([]);
    setRawData(null);
    setError('');

    try {
      const res = await fetch('/api/hotel/batch-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotels: hotelNames }),
      });
      const json = await res.json();
      setRawData(json);
      if (json.success) {
        setResults(json.data || []);
      } else {
        setError(json.error || '\u8bf7\u6c42\u5931\u8d25');
      }
    } catch (e: any) {
      setError(e.message || '\u7f51\u7edc\u9519\u8bef');
    } finally {
      setLoading(false);
    }
  };

  const cacheCount = results.filter((r) => r.source === 'cache').length;
  const searchCount = results.filter((r) => r.source === 'search').length;
  const canUseCount = results.filter((r) => r.canUse90Percent).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span>{String.fromCodePoint(0x1f50d)}</span>
          <span>{'\u6279\u91cf\u67e5\u8be2\u9152\u5e97\u4e5d\u6298\u5238'}</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          {'\u8f93\u5165\u9152\u5e97\u540d\u79f0\uff0c\u7528\u9017\u53f7\u5206\u9694\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u68c0\u7d22\u7f13\u5b58\u6216\u901a\u8fc7\u7f51\u7ad9\u67e5\u8be2'}
        </p>
        <textarea
          className="w-full border rounded-lg px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'\u4f8b\u5982: \u6c49\u5ead\u5317\u4eac\u5929\u5b89\u95e8\u9152\u5e97,\u5168\u5b63\u4e0a\u6d77\u5357\u4eac\u8def\u9152\u5e97,\u6854\u5b50\u9152\u5e97\u6df1\u5733'}
        />
        <button
          onClick={handleCheck}
          disabled={loading}
          className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm"
        >
          {loading ? String.fromCodePoint(0x23f3) + ' \u67e5\u8be2\u4e2d...' : String.fromCodePoint(0x1f50d) + ' \u67e5\u8be2\u4e5d\u6298\u5238'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4">{'\u274c'} {error}</div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">{'\u67e5\u8be2\u7ed3\u679c'}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded">{cacheCount} {'\u7f13\u5b58'}</span>
              <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded">{searchCount} {'\u722c\u866b'}</span>
              <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded">{canUseCount} {'\u53ef\u7528'}</span>
            </div>
          </div>
          <div className="space-y-2">
            {results.map((r, idx) => (
              <div
                key={idx}
                className={
                  'flex items-center justify-between rounded-lg px-4 py-3 text-sm border ' +
                  (r.canUse90Percent
                    ? 'border-green-300 bg-green-50'
                    : r.found
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-100 bg-gray-50')
                }
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-medium text-gray-800">{r.hotelName}</div>
                    <div className="text-xs text-gray-400">
                      {r.source === 'cache'
                        ? String.fromCodePoint(0x1f4be) + ' \u7f13\u5b58'
                        : String.fromCodePoint(0x1f4e1) + ' \u5b9e\u65f6\u67e5\u8be2'}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {r.canUse90Percent ? (
                    <span className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      {'\u2705 \u4e5d\u6298\u53ef\u7528'}
                    </span>
                  ) : r.has90Percent ? (
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-full">
                      {'\u274c \u4e5d\u6298\u4e0d\u53ef\u7528'}
                    </span>
                  ) : (
                    <span className="bg-gray-200 text-gray-500 text-xs px-3 py-1.5 rounded-full">
                      {r.found ? '\u26aa \u65e0\u4e5d\u6298\u5238' : '\u26aa \u672a\u627e\u5230'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <JsonViewer data={rawData} title={'\u54cd\u5e94\u6570\u636e'} buttonLabel={'\u25b6 \u67e5\u770bJSON'} />
          </div>
        </div>
      )}
    </div>
  );
}
