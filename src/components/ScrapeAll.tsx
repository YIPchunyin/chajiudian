'use client';

import { useState, useRef, useCallback } from 'react';

interface ProgressEvent {
  type: 'init' | 'total' | 'progress' | 'done' | 'error';
  message?: string;
  processed?: number;
  totalHotels?: number | string;
  currentHotel?: string;
  currentCity?: string;
  cityProgress?: string;
  canUse90Percent?: boolean;
  has90Percent?: boolean;
  recent5?: Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean }>;  cacheHits?: number;
}

export default function ScrapeAll() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [recent5, setRecent5] = useState<Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean }>>([]);
  const [processed, setProcessed] = useState(0);  const [cacheHits, setCacheHits] = useState(0);
  const [total, setTotal] = useState<number | string>('?');
  const [currentCity, setCurrentCity] = useState('');
  const [cityProgress, setCityProgress] = useState('');
  const [done, setDone] = useState(false);
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; });
  const abortRef = useRef<AbortController | null>(null);

  const handleStart = useCallback(async () => {
    setRunning(true); setDone(false); setProgress(null);
    setRecent5([]); setProcessed(0); setCacheHits(0); setTotal('?');
    setCurrentCity(''); setCityProgress('');

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch('/api/hotel/scrape-all?checkIn=' + checkIn + '&checkOut=' + checkOut, { signal: abort.signal });
      const reader = res.body?.getReader();
      if (!reader) { setProgress({ type: 'error', message: '无法读取响应流' }); setRunning(false); return; }

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
                if (data.cacheHits !== undefined) setCacheHits(data.cacheHits);
                if (data.recent5) setRecent5([...data.recent5]);
                if (data.totalHotels) setTotal(data.totalHotels);
                if (data.currentCity) setCurrentCity(data.currentCity);
                if (data.cityProgress) setCityProgress(data.cityProgress);
              } else if (data.type === 'total' && data.totalHotels) { setTotal(data.totalHotels); }
              else if (data.type === 'done') { setDone(true); setRunning(false); if (data.cacheHits !== undefined) setCacheHits(data.cacheHits); }
              else if (data.type === 'error') { setRunning(false); }
            } catch { }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setProgress({ type: 'error', message: e.message || '请求失败' });
    } finally { setRunning(false); abortRef.current = null; }
  }, [checkIn, checkOut]);

  const handleStop = useCallback(() => { abortRef.current?.abort(); setRunning(false); }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span>{String.fromCodePoint(0x1f4e1)}</span>
          <span>逐城爬取全部酒店</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">获取城市列表，逐城搜索酒店，检查生日九折券，结果存入MongoDB</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><label className="block text-sm font-medium text-gray-600 mb-1">入住日期</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} disabled={running} /></div>
          <div><label className="block text-sm font-medium text-gray-600 mb-1">离店日期</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} disabled={running} /></div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleStart} disabled={running} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm">
            {running ? String.fromCodePoint(0x23f3) + ' 爬取中...' : String.fromCodePoint(0x1f4e1) + ' 开始逐城爬取'}
          </button>
          {running && <button onClick={handleStop} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2.5 px-6 rounded-lg transition text-sm">{String.fromCodePoint(0x26a0)} 停止</button>}
        </div>
      </div>

      {progress && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className={'rounded-lg p-3 text-sm mb-4 ' + (progress.type === 'error' ? 'bg-red-50 text-red-600' : done ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700')}>
            {progress.type === 'init' && String.fromCodePoint(0x1f4e1) + ' ' + (progress.message || '初始化...')}
            {progress.type === 'error' && '\u274c ' + (progress.message || '')}
            {done && '\u2705 ' + (progress.message || '爬取完成！')}
            {progress.type === 'progress' && !done && '\u23f3 ' + (progress.message || '正在爬取...')}
            {progress.type === 'total' && '\u2139 ' + (progress.message || '')}
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-600">{processed}</div><div className="text-xs text-blue-500">酒店</div></div>
            <div className="bg-purple-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-purple-600">{total}</div><div className="text-xs text-purple-500">城市</div></div>
            <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-600">{cityProgress || '...'}</div><div className="text-xs text-green-500">进度</div></div>
          </div>
          {currentCity && <div className="text-sm text-gray-500 mb-3">当前城市：<span className="font-semibold text-gray-700">{currentCity}</span></div>}
          {recent5.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">最近处理：</h3>
              <div className="space-y-1.5">
                {[...recent5].reverse().map((h, i) => (
                  <div key={i} className={'flex items-center justify-between rounded-lg px-3 py-2 text-sm ' + (h.canUse90Percent ? 'bg-green-50 border border-green-200' : h.has90Percent ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-100')}>
                    <span className="text-gray-700 font-medium truncate">{h.hotelName}</span>
                    <span className={'shrink-0 ml-2 text-xs font-bold px-2 py-0.5 rounded-full ' + (h.canUse90Percent ? 'bg-green-500 text-white' : h.has90Percent ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-300 text-gray-600')}>
                      {h.canUse90Percent ? '\u2705 九折可用' : h.has90Percent ? '\u274c 九折不可用' : '\u26aa 无九折'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Download chajiudian table */}
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <a href="/api/download-chajiudian" download className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm">
          {String.fromCodePoint(0x1f4e5)} 下载 chajiudian 表格
        </a>
        <p className="text-xs text-gray-400 mt-2">从MongoDB导出当前所有记录为Excel文件</p>
      </div>
    </div>
  );
}
