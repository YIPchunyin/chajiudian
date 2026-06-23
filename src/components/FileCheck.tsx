'use client';

import { useState, useRef, useCallback } from 'react';

interface ProgressItem {
  hotelName: string;
  has90Percent: boolean;
  canUse90Percent: boolean;
  source: string;
}

export default function FileCheck() {
  const [file, setFile] = useState<File | null>(null);
  const [columnName, setColumnName] = useState('\u9152\u5e97\u540d\u79f0');
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [cacheHits, setCacheHits] = useState(0);
  const [searchHits, setSearchHits] = useState(0);
  const [canUseCount, setCanUseCount] = useState(0);
  const [recent10, setRecent10] = useState<ProgressItem[]>([]);
  const [fileKey, setFileKey] = useState('');
  const [error, setError] = useState('');
  const [checkIn, setCheckIn] = useState('2026-07-01');
  const [checkOut, setCheckOut] = useState('2026-07-02');
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async () => {
    if (!file) { setError('\u8bf7\u9009\u62e9\u6587\u4ef6'); return; }
    setError(''); setRunning(true); setDone(false);
    setRecent10([]); setProcessed(0); setTotal(0);
    setCacheHits(0); setSearchHits(0); setCanUseCount(0);
    setFileKey('');

    // Step 1: Parse file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('columnName', columnName);

    let hotelNames: string[] = [];
    let fk = '';
    try {
      const parseRes = await fetch('/api/parse-file', { method: 'POST', body: formData });
      const parseJson = await parseRes.json();
      if (!parseJson.success) { setError(parseJson.error || '\u89e3\u6790\u6587\u4ef6\u5931\u8d25'); setRunning(false); return; }
      hotelNames = parseJson.hotelNames || [];
      fk = parseJson.fileKey || '';
      setTotal(hotelNames.length);
      setFileKey(fk);
    } catch (e: any) { setError(e.message || '\u89e3\u6790\u5931\u8d25'); setRunning(false); return; }

    if (hotelNames.length === 0) { setError('\u672a\u627e\u5230\u9152\u5e97\u540d\u79f0'); setRunning(false); return; }

    // Step 2: Process via SSE
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch('/api/hotel/batch-progress?names=' + encodeURIComponent(hotelNames.join(',')) + '&checkIn=' + checkIn + '&checkOut=' + checkOut, { signal: abort.signal });
      const reader = res.body?.getReader();
      if (!reader) { setError('\u65e0\u6cd5\u8bfb\u53d6\u54cd\u5e94\u6d41'); setRunning(false); return; }

      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done: sd, value } = await reader.read();
        if (sd) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.substring(6));
              if (d.type === 'progress') {
                setProcessed(d.processed || 0);
                setCacheHits(d.cacheHits || 0);
                setSearchHits(d.searchHits || 0);
                setCanUseCount(d.canUseCount || 0);
                if (d.recent10) setRecent10([...d.recent10]);
              } else if (d.type === 'done') {
                setDone(true); setRunning(false);
                setCacheHits(d.cacheHits || 0);
                setSearchHits(d.searchHits || 0);
                setCanUseCount(d.canUseCount || 0);
              } else if (d.type === 'error') { setRunning(false); }
            } catch { }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message || '\u8bf7\u6c42\u5931\u8d25');
    } finally { setRunning(false); abortRef.current = null; }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span>{String.fromCodePoint(0x1f4c4)}</span>
          <span>{'\u8868\u683c\u6279\u91cf\u67e5\u8be2\u4e5d\u6298\u5238'}</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">{'\u4e0a\u4f20\u5305\u542b\u9152\u5e97\u540d\u79f0\u7684\u8868\u683c\uff0c\u7cfb\u7edf\u81ea\u52a8\u68c0\u7d22\u7f13\u5b58\u6216\u901a\u8fc7\u7f51\u7ad9\u67e5\u8be2\uff0c\u53ef\u4e0b\u8f7d\u7ed3\u679c'}</p>

        <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-3" disabled={running} />
        <input type="text" className="w-full border rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent mb-3" value={columnName} onChange={(e) => setColumnName(e.target.value)} placeholder={'\u9ed8\u8ba4\u4e3a\u201c\u9152\u5e97\u540d\u79f0\u201d'} disabled={running} />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="block text-sm font-medium text-gray-600 mb-1">{'\u5165\u4f4f'}</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} disabled={running} /></div>
          <div><label className="block text-sm font-medium text-gray-600 mb-1">{'\u79bb\u5e97'}</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} disabled={running} /></div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={running || !file} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm">
            {running ? String.fromCodePoint(0x23f3) + ' \u5904\u7406\u4e2d...' : String.fromCodePoint(0x1f680) + ' \u5f00\u59cb\u67e5\u8be2'}
          </button>
          {running && <button onClick={() => { abortRef.current?.abort(); setRunning(false); }} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2.5 px-6 rounded-lg transition text-sm">{String.fromCodePoint(0x26a0)} \u505c\u6b62</button>}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4">{'\u274c'} {error}</div>}

      {(running || done) && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={'rounded-lg px-3 py-1.5 text-sm font-medium ' + (done ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700')}>
              {done ? '\u2705 \u5df2\u5b8c\u6210' : '\u23f3 \u5904\u7406\u4e2d...'}
            </div>
            <div className="text-xs text-gray-400">{processed}/{total}</div>
          </div>

          {total > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: Math.min(100, (processed / total) * 100) + '%' }} />
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-blue-50 rounded p-2 text-center"><div className="text-lg font-bold text-blue-600">{processed}</div><div className="text-xs text-blue-500">已处理</div></div>
            <div className="bg-purple-50 rounded p-2 text-center"><div className="text-lg font-bold text-purple-600">{cacheHits}</div><div className="text-xs text-purple-500">缓存</div></div>
            <div className="bg-orange-50 rounded p-2 text-center"><div className="text-lg font-bold text-orange-600">{searchHits}</div><div className="text-xs text-orange-500">爬虫</div></div>
            <div className="bg-green-50 rounded p-2 text-center"><div className="text-lg font-bold text-green-600">{canUseCount}</div><div className="text-xs text-green-500">九折可用</div></div>
          </div>

          {recent10.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">最近 {recent10.length} 条：</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {[...recent10].reverse().map((h, i) => (
                  <div key={i} className={'flex items-center justify-between rounded-lg px-3 py-2 text-sm ' + (
                    h.canUse90Percent ? 'bg-green-50 border border-green-200' :
                    h.has90Percent ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-gray-50 border border-gray-100'
                  )}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-gray-400 shrink-0">{h.source === 'cache' ? String.fromCodePoint(0x1f4be) : String.fromCodePoint(0x1f4e1)}</span>
                      <span className="text-gray-700 font-medium truncate">{h.hotelName}</span>
                    </div>
                    <span className={'shrink-0 ml-2 text-xs font-bold px-2 py-0.5 rounded-full ' + (
                      h.canUse90Percent ? 'bg-green-500 text-white' :
                      h.has90Percent ? 'bg-yellow-400 text-yellow-900' :
                      'bg-gray-300 text-gray-600'
                    )}>
                      {h.canUse90Percent ? '\u2705 \u53ef\u7528' : h.has90Percent ? '\u274c \u4e0d\u53ef\u7528' : '\u26aa \u65e0'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done && fileKey && (
            <div className="text-center pt-2 border-t border-gray-100">
              <a href={'/api/download-result?key=' + fileKey} download className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm">
                {String.fromCodePoint(0x1f4e5)} {'\u4e0b\u8f7d\u7ed3\u679c\u8868\u683c'}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
