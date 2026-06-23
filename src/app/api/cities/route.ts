import { NextResponse } from 'next/server';

const API_URL = 'https://hweb-hotel.huazhu.com/hotels/city/getCityList?isGlobal=false';

const DEFAULT_HEADERS: Record<string, string> = {
  'Host': 'hweb-hotel.huazhu.com',
  'sId': '0b3xPQkl2RYAWh45dsml2yedXg2xPQkJ1782232502544',
  'Client-Platform': 'WX-MP',
  'devNo': '7654621848872724749',
  'ssid': '1729663732242774469',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c33)XWEB/14185',
  'did': '7654621848872724749',
  'xweb_xhr': '1',
  'mini-version': '3.0.56',
  'Referer': 'https://servicewechat.com/wx286efc12868f2559/580/page-frame.html',
  'Accept': '*/*',
};

export async function GET() {
  try {
    const apiHeaders = new Headers();
    for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
      apiHeaders.set(key, value);
    }

    const response = await fetch(API_URL, {
      method: 'GET',
      headers: apiHeaders,
    });

    const data = await response.json();

    if (data.code === 200 && data.content?.cityList) {
      const cities = data.content.cityList
        .filter((c: any) => c.cityType === 'cities' && c.cityId)
        .map((c: any) => ({
          id: c.cityId,
          name: c.cityName,
          pinyin: (c.cityNameZhSpell || c.cityNameZhLetterInitial || '').toLowerCase(),
        }))
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'zh'));

      return NextResponse.json({ success: true, data: cities });
    }

    return NextResponse.json({ success: true, data: [], apiMessage: '获取城市列表失败' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '请求失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}