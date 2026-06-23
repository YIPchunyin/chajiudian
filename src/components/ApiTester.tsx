'use client';

import { useState } from 'react';
import JsonViewer from '@/components/JsonViewer';

interface ProxyResponse {
  success: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: unknown;
  error?: string;
}

const DEFAULT_RAW_REQUEST =
  'POST /hotels/hotel/getHotelList HTTP/1.1\n' +
  'Host: hweb-hotel.huazhu.com\n' +
  'Connection: keep-alive\n' +
  'sId: 0b3xPQkl2RYAWh45dsml2yedXg2xPQkJ1782232502544\n' +
  'Client-Platform: WX-MP\n' +
  'devNo: 7654621848872724749\n' +
  'ssid: 1729663732242774469\n' +
  'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c33)XWEB/14185\n' +
  'Content-Type: application/json\n' +
  'did: 7654621848872724749\n' +
  'xweb_xhr: 1\n' +
  'abInfo: {"xcxFourFive":"A","HUA_AI_ENTRY_GROUP":"C","exclusivePrice":"B","testcaw_zzc":"B","xcxFourFive2025":"B","xcxFourFive2025_tiandanye":true}\n' +
  'mini-version: 3.0.56\n' +
  'version: \n' +
  'Accept: */*\n' +
  'Sec-Fetch-Site: cross-site\n' +
  'Sec-Fetch-Mode: cors\n' +
  'Sec-Fetch-Dest: empty\n' +
  'Referer: https://servicewechat.com/wx286efc12868f2559/580/page-frame.html\n' +
  'Accept-Encoding: gzip, deflate, br\n' +
  'Accept-Language: zh-CN,zh;q=0.9\n' +
  '\n' +
  '{"poiId":"","pageSize":10,"pageIndex":1,"pageSource":"hotelList","newCurrentCityName":"\\u9999\\u6e2f","commitOrderServiceGroup":"C","notShowGuideInfoType":[],"notShowInfoType":[],"abGroup":{"pointsPayRoom":"B","autoSwitchRecommendSort":"A","_localBasicUseOldSortGroupNew":"A"},"searchDicts":"[{\\"key\\":\\"orderBy\\",\\"value\\":\\"0\\",\\"name\\":\\"\\u63a8\\u8350\\u6392\\u5e8f\\"}]","cityName":"\\u5317\\u4eac","cityType":"cities","checkInDate":"2026-06-23","checkOutDate":"2026-06-24","source":"1","hasUsePositioning":false,"uuid":"rzNZQD2i6ykFsGbtyQMYac2CxGppkxyH"}';

function extractHost(rawRequest: string): string {
  const lines = rawRequest.split('\n');
  for (const line of lines) {
    const trimmed = line.replace(/\r$/, '').trim();
    if (trimmed.toLowerCase().startsWith('host:')) {
      const host = trimmed.substring(5).trim();
      return 'https://' + host;
    }
  }
  return '';
}

export default function ApiTester() {
  const [rawRequest, setRawRequest] = useState(DEFAULT_RAW_REQUEST);
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!rawRequest.trim()) return;
    const url = extractHost(rawRequest);
    if (!url) {
      setResponse({ success: false, error: '\u672a\u627e\u5230 Host \u5934\uff0c\u8bf7\u786e\u4fdd\u539f\u59cb\u8bf7\u6c42\u4e2d\u5305\u542b Host \u5b57\u6bb5' });
      return;
    }
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, rawRequest }),
      });
      const json = await res.json();
      setResponse(json);
    } catch (e: any) {
      setResponse({ success: false, error: e.message || '\u7f51\u7edc\u9519\u8bef' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='bg-white rounded-xl shadow p-6'>
      <h2 className='text-lg font-bold text-gray-800 mb-4 flex items-center gap-2'>
        <span>{String.fromCodePoint(0x1f4e1)}</span>
        <span>API {'\u8bf7\u6c42\u6d4b\u8bd5'}</span>
      </h2>

      <div className='mb-3'>
        <label className='block text-sm font-medium text-gray-600 mb-1'>
          {'\u539f\u59cb HTTP \u8bf7\u6c42\uff08\u5305\u542b\u8bf7\u6c42\u884c\u3001\u5934\u90e8\u3001\u8bf7\u6c42\u4f53\uff09'}
        </label>
        <textarea
          className='w-full border rounded-lg px-4 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent'
          rows={18}
          value={rawRequest}
          onChange={(e) => setRawRequest(e.target.value)}
          placeholder='POST /path HTTP/1.1\nHost: example.com\n...'
        />
      </div>

      <button
        onClick={handleSend}
        disabled={loading}
        className='bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-8 rounded-lg transition text-sm'
      >
        {loading ? String.fromCodePoint(0x23f3) + ' \u53d1\u9001\u4e2d...' : String.fromCodePoint(0x1f680) + ' \u53d1\u9001\u8bf7\u6c42'}
      </button>

      {response && !response.success && (
        <div className='mt-4 bg-red-50 border border-red-200 text-red-600 rounded-lg p-4'>
          {'\u274c'} {response.error}
        </div>
      )}

      {response && response.success && (
        <div className='mt-4 space-y-3'>
          <div className='flex items-center gap-3 text-sm'>
            <span className='text-gray-500'>{'\u72b6\u6001'}:</span>
            <span className={'font-semibold ' + (response.status && response.status < 400 ? 'text-green-600' : 'text-red-500')}>
              {response.status} {response.statusText}
            </span>
          </div>
          <JsonViewer data={response.data} title={'\u54cd\u5e94\u6570\u636e'} buttonLabel={'\u25b6 \u67e5\u770b\u54cd\u5e94JSON'} />
          <JsonViewer data={response.headers} title={'\u54cd\u5e94\u5934'} buttonLabel={'\u25b6 \u54cd\u5e94\u5934'} />
        </div>
      )}
    </div>
  );
}
