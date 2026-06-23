'use client';

import { useState, useRef, useCallback } from 'react';

interface ProgressEvent {
  type: 'init' | 'total' | 'progress' | 'done' | 'error';
  message?: string;
  processed?: number;
  totalHotels?: number | string;
  currentHotel?: string;
  canUse90Percent?: boolean;
  has90Percent?: boolean;
  recent5?: Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean }>;
  existingCount?: number;
}

export default function ScrapeAll() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [recent5, setRecent5] = useState<Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean }>>([]);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState<number | string>('?');
  const [done, setDone] = useState(false);
  const [checkIn, setCheckIn] = useState('2026-07-01');
  const [checkOut, setCheckOut] = useState('2026-07-02');
  const abortRef = useRef<AbortController | null>(null);

  const handleStart = useCallback(async () => {
    setRunning(true);
    setDone(false);
    setProgress(null);
    setRecent5([]);
    setProcessed(0);
    setTotal('?');

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch('/api/hotel/scrape-all?checkIn=' + checkIn + '&checkOut=' + checkOut, {
        signal: abort.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) {
        setProgress({ type: 'error', message: '无法读取响应流' });
        setRunning(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: ProgressEvent = JSON.parse(line.substring(6));
              setProgress(data);

              if (data.type === 'progress') {
                setProcessed(data.processed || 0);
                if (data.recent5) setRecent5([...data.recent5]);
                if (data.totalHotels) setTotal(data.totalHotels);
              } else if (data.type === 'total' && data.totalHotels) {
                setTotal(data.totalHotels);
              } else if (data.type === 'done') {
                setDone(true);
                setRunning(false);
              } else if (data.type === 'error') {
                setRunning(false);
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setProgress({ type: 'error', message: e.message || '请求失败' });
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [checkIn, checkOut]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span>{String.fromCodePoint(0x1f4e1)}</span>
          <span>{'\u7a77\u4e3e\u722c\u53d6\u5168\u90e8\u9152\u5e97'}</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          {'\u901a\u8fc7\u7f51\u7ad9\u63a5\u53e3\u9010\u9875\u722c\u53d6\u5168\u56fd\u6240\u6709\u9152\u5e97\uff0c\u68c0\u67e5\u6bcf\u5bb6\u9152\u5e97\u662f\u5426\u652f\u6301\u751f\u65e5\u4e5d\u6298\u5238\uff0c\u7ed3\u679c\u5b58\u5165MongoDB'}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">{'\u5165\u4f4f\u65e5\u671f'}</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} disabled={running} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">{'\u79bb\u5e97\u65e5\u671f'}</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} disabled={running} />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleStart}
            disabled={running}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm"
          >
            {running ? String.fromCodePoint(0x23f3) + ' \u722c\u53d6\u4e2d...' : String.fromCodePoint(0x1f4e1) + ' \u5f00\u59cb\u7a77\u4e3e\u722c\u53d6'}
          </button>
          {running && (
            <button
              onClick={handleStop}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2.5 px-6 rounded-lg transition text-sm"
            >
              {String.fromCodePoint(0x26a0)} {'\u505c\u6b62'}
            </button>
          )}
        </div>
      </div>

      {progress && (
        <div className="bg-white rounded-xl shadow p-6">
          {/* Status banner */}
          <div className={'rounded-lg p-3 text-sm mb-4 ' + (
            progress.type === 'error' ? 'bg-red-50 text-red-600' :
            done ? 'bg-green-50 text-green-700' :
            'bg-blue-50 text-blue-700'
          )}>
            {progress.type === 'init' && String.fromCodePoint(0x1f4e1) + ' ' + (progress.message || '初始化...')}
            {progress.type === 'error' && '\u274c ' + (progress.message || '发生错误')}
            {done && '\u2705 ' + (progress.message || '爬取完成！')}
            {progress.type === 'progress' && !done && '\u23f3 ' + (progress.message || '正在爬取...')}
            {progress.type === 'total' && '\u2139 \u5171发现 ' + progress.totalHotels + ' 家酒店'}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{processed}</div>
              <div className="text-xs text-blue-500">{'\u5df2\u5904\u7406'}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{total}</div>
              <div className="text-xs text-purple-500">{'\u603b\u8ba1'}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{progress.type === 'done' ? processed : '...'}</div>
              <div className="text-xs text-green-500">{'\u5df2\u5b8c\u6210'}</div>
            </div>
          </div>

          {/* Progress bar */}
          {typeof total === 'number' && total > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: Math.min(100, (processed / total) * 100) + '%' }}
              />
            </div>
          )}

          {/* Recent 5 hotels */}
          {recent5.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">{'\u6700\u8fd1\u5904\u7406\uff1a'}</h3>
              <div className="space-y-1.5">
                {[...recent5].reverse().map((h, i) => (
                  <div key={i} className={'flex items-center justify-between rounded-lg px-3 py-2 text-sm ' + (
                    h.canUse90Percent ? 'bg-green-50 border border-green-200' :
                    h.has90Percent ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-gray-50 border border-gray-100'
                  )}>
                    <span className="text-gray-700 font-medium truncate">{h.hotelName}</span>
                    <span className={'shrink-0 ml-2 text-xs font-bold px-2 py-0.5 rounded-full ' + (
                      h.canUse90Percent ? 'bg-green-500 text-white' :
                      h.has90Percent ? 'bg-yellow-400 text-yellow-900' :
                      'bg-gray-300 text-gray-600'
                    )}>
                      {h.canUse90Percent ? '\u2705 \u4e5d\u6298\u53ef\u7528' : h.has90Percent ? '\u274c \u4e5d\u6298\u4e0d\u53ef\u7528' : '\u26aa \u65e0\u4e5d\u6298'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
