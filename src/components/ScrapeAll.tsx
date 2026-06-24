'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ProgressEvent {
  type: 'init' | 'total' | 'progress' | 'done' | 'error' | 'resume';
  message?: string;
  processed?: number;
  totalHotels?: number | string;
  currentHotel?: string;
  currentCity?: string;
  cityProgress?: string;
  canUse90Percent?: boolean;
  has90Percent?: boolean;
  recent5?: Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean }>;
  cacheHits?: number;
  completedCityIndex?: number;
  reverse?: boolean;
}

interface SavedProgress {
  hasProgress: boolean;
  completedCityIndex?: number;
  totalCities?: number;
  processed?: number;
  cacheHits?: number;
  completedCityNames?: string[];
  reverse?: boolean;
}

export default function ScrapeAll() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [recent5, setRecent5] = useState<Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean }>>([]);
  const [processed, setProcessed] = useState(0);
  const [cacheHits, setCacheHits] = useState(0);
  const [total, setTotal] = useState<number | string>('?');
  const [currentCity, setCurrentCity] = useState('');
  const [cityProgress, setCityProgress] = useState('');
  const [done, setDone] = useState(false);
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; });
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(null);
  const [checkingProgress, setCheckingProgress] = useState(true);
  const [reverseOrder, setReverseOrder] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Check for saved scrape progress on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hotel/scrape-progress');
        const data: SavedProgress = await res.json();
        setSavedProgress(data);
        // If saved progress has reverse direction, sync the toggle
        if (data?.hasProgress && data.reverse !== undefined) {
          setReverseOrder(data.reverse);
        }
      } catch {
        setSavedProgress(null);
      } finally {
        setCheckingProgress(false);
      }
    })();
  }, []);

  const handleStart = useCallback(async (resume: boolean = false) => {
    setRunning(true); setDone(false); setProgress(null);
    setRecent5([]); setProcessed(0); setCacheHits(0);
    setCurrentCity(''); setCityProgress('');

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let url = '/api/hotel/scrape-all?checkIn=' + checkIn + '&checkOut=' + checkOut;
      if (resume) url += '&resume=true';
      else url += '&reverse=' + reverseOrder;
      const res = await fetch(url, { signal: abort.signal });
      const reader = res.body?.getReader();
      if (!reader) { setProgress({ type: 'error', message: '\u65e0\u6cd5\u8bfb\u53d6\u54cd\u5e94\u6d41' }); setRunning(false); return; }

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
              if (data.type === 'resume') {
                setProcessed(data.processed || 0);
                if (data.cacheHits !== undefined) setCacheHits(data.cacheHits);
                if (data.reverse !== undefined) setReverseOrder(data.reverse);
              } else if (data.type === 'progress') {
                setProcessed(data.processed || 0);
                if (data.cacheHits !== undefined) setCacheHits(data.cacheHits);
                if (data.recent5) setRecent5([...data.recent5]);
                if (data.totalHotels) setTotal(data.totalHotels);
                if (data.currentCity) setCurrentCity(data.currentCity);
                if (data.cityProgress) setCityProgress(data.cityProgress);
              } else if (data.type === 'total' && data.totalHotels) { setTotal(data.totalHotels); }
              else if (data.type === 'done') { setDone(true); setRunning(false); setSavedProgress(null); if (data.cacheHits !== undefined) setCacheHits(data.cacheHits); }
              else if (data.type === 'error') { setRunning(false); }
            } catch { }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setProgress({ type: 'error', message: e.message || '\u8bf7\u6c42\u5931\u8d25' });
    } finally { setRunning(false); abortRef.current = null; }
  }, [checkIn, checkOut, reverseOrder]);

  const handleResume = useCallback(() => { handleStart(true); }, [handleStart]);
  const handleStop = useCallback(() => { abortRef.current?.abort(); setRunning(false); }, []);

  const dirLabel = savedProgress?.reverse ? '\u5012\u5e8f' : '\u6b63\u5e8f';
  const dirIcon = savedProgress?.reverse ? String.fromCodePoint(0x1f53d) : String.fromCodePoint(0x1f53c);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span>{String.fromCodePoint(0x1f4e1)}</span>
          <span>\u9010\u57ce\u722c\u53d6\u5168\u90e8\u9152\u5e97</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">\u83b7\u53d6\u57ce\u5e02\u5217\u8868\uff0c\u9010\u57ce\u641c\u7d22\u9152\u5e97\uff0c\u68c0\u67e5\u751f\u65e5\u4e5d\u6298\u5238\uff0c\u7ed3\u679c\u5b58\u5165MongoDB</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><label className="block text-sm font-medium text-gray-600 mb-1">\u5165\u4f4f\u65e5\u671f</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} disabled={running} /></div>
          <div><label className="block text-sm font-medium text-gray-600 mb-1">\u79bb\u5e97\u65e5\u671f</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} disabled={running} /></div>
        </div>

        {/* Reverse order toggle */}
        {!running && !done && !savedProgress?.hasProgress && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input type="checkbox" checked={reverseOrder} onChange={(e) => setReverseOrder(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700">{String.fromCodePoint(0x1f53d)} \u5012\u5e8f\u722c\u53d6\uff08\u4eceZ\u5230A\uff09</span>
          </label>
        )}

        {/* Saved progress notice and resume button */}
        {!running && !done && savedProgress?.hasProgress && !checkingProgress && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">{String.fromCodePoint(0x26a0)}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 text-sm">\u68c0\u6d4b\u5230\u672a\u5b8c\u6210\u7684\u722c\u53d6\u8bb0\u5f55</h3>
                <p className="text-xs text-amber-700 mt-1">
                  {dirIcon} {dirLabel}\u722c\u53d6\u00b7\u5df2\u5b8c\u6210 {savedProgress.completedCityIndex} / {savedProgress.totalCities} \u4e2a\u57ce\u5e02\uff0c\u5df2\u5904\u7406 {savedProgress.processed} \u5bb6\u9152\u5e97\uff08\u7f13\u5b58\u547d\u4e2d {savedProgress.cacheHits} \u6b21\uff09
                </p>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleResume} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-5 rounded-lg transition text-sm">
                    {String.fromCodePoint(0x1f504)} \u7ee7\u7eed\u722c\u53d6
                  </button>
                  <button onClick={() => handleStart(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-5 rounded-lg transition text-sm">
                    {String.fromCodePoint(0x1f5d1)} \u91cd\u65b0\u5f00\u59cb
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {(!savedProgress?.hasProgress || checkingProgress) && (
            <button onClick={() => handleStart(false)} disabled={running} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm">
              {running ? String.fromCodePoint(0x23f3) + ' \u722c\u53d6\u4e2d...' : String.fromCodePoint(0x1f4e1) + (reverseOrder ? ' \u5f00\u59cb\u5012\u5e8f\u722c\u53d6' : ' \u5f00\u59cb\u9010\u57ce\u722c\u53d6')}
            </button>
          )}
          {running && <button onClick={handleStop} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2.5 px-6 rounded-lg transition text-sm">{String.fromCodePoint(0x26a0)} \u505c\u6b62</button>}
        </div>

        {checkingProgress && <div className="text-xs text-gray-400 mt-2">{String.fromCodePoint(0x23f3)} \u68c0\u67e5\u722c\u53d6\u8fdb\u5ea6...</div>}
      </div>

      {progress && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className={'rounded-lg p-3 text-sm mb-4 ' + (progress.type === 'error' ? 'bg-red-50 text-red-600' : done ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700')}>
            {progress.type === 'init' && String.fromCodePoint(0x1f4e1) + ' ' + (progress.message || '\u521d\u59cb\u5316...')}
            {progress.type === 'resume' && String.fromCodePoint(0x1f504) + ' ' + (progress.message || '\u6062\u590d\u722c\u53d6...')}
            {progress.type === 'error' && '\u274c ' + (progress.message || '')}
            {done && '\u2705 ' + (progress.message || '\u722c\u53d6\u5b8c\u6210\uff01')}
            {progress.type === 'progress' && !done && '\u23f3 ' + (progress.message || '\u6b63\u5728\u722c\u53d6...')}
            {progress.type === 'total' && '\u2139 ' + (progress.message || '')}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-600">{processed}</div><div className="text-xs text-blue-500">\u9152\u5e97</div></div>
            <div className="bg-purple-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-purple-600">{cacheHits}</div><div className="text-xs text-purple-500">\u7f13\u5b58</div></div>
            <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-600">{cityProgress || '...'}</div><div className="text-xs text-green-500">\u8fdb\u5ea6</div></div>
          </div>
          {currentCity && <div className="text-sm text-gray-500 mb-3">\u5f53\u524d\u57ce\u5e02\uff1a<span className="font-semibold text-gray-700">{currentCity}</span></div>}
          {recent5.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">\u6700\u8fd1\u5904\u7406\uff1a</h3>
              <div className="space-y-1.5">
                {[...recent5].reverse().map((h, i) => (
                  <div key={i} className={'flex items-center justify-between rounded-lg px-3 py-2 text-sm ' + (h.canUse90Percent ? 'bg-green-50 border border-green-200' : h.has90Percent ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-100')}>
                    <span className="text-gray-700 font-medium truncate">{h.hotelName}</span>
                    <span className={'shrink-0 ml-2 text-xs font-bold px-2 py-0.5 rounded-full ' + (h.canUse90Percent ? 'bg-green-500 text-white' : h.has90Percent ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-300 text-gray-600')}>
                      {h.canUse90Percent ? '\u2705 \u4e5d\u6298\u53ef\u7528' : h.has90Percent ? '\u274c \u4e5d\u6298\u4e0d\u53ef\u7528' : '\u26aa \u65e0\u4e5d\u6298'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 text-center">
        <a href="/api/download-chajiudian" download className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm">
          {String.fromCodePoint(0x1f4e5)} \u4e0b\u8f7d chajiudian \u8868\u683c
        </a>
        <p className="text-xs text-gray-400 mt-2">\u4eceMongoDB\u5bfc\u51fa\u5f53\u524d\u6240\u6709\u8bb0\u5f55\u4e3aExcel\u6587\u4ef6</p>
      </div>
    </div>
  );
}
