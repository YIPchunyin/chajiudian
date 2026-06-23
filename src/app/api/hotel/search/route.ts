import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'https://hweb-hotel.huazhu.com/hotels/hotel/getHotelList';

const DEFAULT_HEADERS: Record<string, string> = {
  'Host': 'hweb-hotel.huazhu.com',
  'sId': '0b3xPQkl2RYAWh45dsml2yedXg2xPQkJ1782232502544',
  'Client-Platform': 'WX-MP',
  'devNo': '7654621848872724749',
  'ssid': '1729663732242774469',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c33)XWEB/14185',
  'did': '7654621848872724749',
  'xweb_xhr': '1',
  'abInfo': JSON.stringify({
    xcxFourFive: 'A',
    HUA_AI_ENTRY_GROUP: 'C',
    exclusivePrice: 'B',
    testcaw_zzc: 'B',
    xcxFourFive2025: 'B',
    xcxFourFive2025_tiandanye: true,
  }),
  'mini-version': '3.0.56',
  'Referer': 'https://servicewechat.com/wx286efc12868f2559/580/page-frame.html',
  'Accept': '*/*',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const cityName = searchParams.get('cityName') || '';

  try {
    const apiHeaders = new Headers();
    for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
      apiHeaders.set(key, value);
    }
    apiHeaders.set('Content-Type', 'application/json');

    const body = {
      poiId: '',
      pageSize: 50,
      pageIndex: 1,
      pageSource: 'hotelList',
      newCurrentCityName: cityName,
      commitOrderServiceGroup: 'C',
      notShowGuideInfoType: [] as string[],
      notShowInfoType: [] as string[],
      abGroup: {
        pointsPayRoom: 'B',
        autoSwitchRecommendSort: 'A',
        _localBasicUseOldSortGroupNew: 'A',
      },
      searchDicts: JSON.stringify([{ key: 'orderBy', value: '0', name: '\u63a8\u8350\u6392\u5e8f' }]),
      cityName: cityName,
      cityType: 'cities',
      checkInDate: '2026-07-01',
      checkOutDate: '2026-07-02',
      source: '1',
      hasUsePositioning: false,
      latitude: '',
      longitude: '',
      uuid: 'jNbekMnt3amQiRXxp6Y3sGmC6GY8NDWY',
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.code === 200 && Array.isArray(data.content?.hotels)) {
      const hotels = data.content.hotels
        .filter((h: Record<string, unknown>) => h.hotelId != null && String(h.hotelId) !== '')
        .map((h: Record<string, unknown>) => ({
          id: String(h.hotelId),
          name: String(h.hotelName || h.hotelShortName || h.hotelFullName || h.name || ''),
          brand: String(h.brandName || h.brand || ''),
          address: String(h.hotelAddr || h.address || ''),
          cityName: String(h.cityName || ''),
          lowestPrice: (() => {
            const p = h.lowestPrice;
            return p != null && Number(p) > 0 ? Number(p) : null;
          })(),
          commentScore: String(h.commentScore || h.hotelScore || ''),
          imageUrl: String(h.imageUrl || h.hotelImg || ''),
          distance: String(h.distance || ''),
        }));

      if (hotels.length > 0) {
        return NextResponse.json({ success: true, data: hotels, source: 'api' });
      }
    }

    return NextResponse.json({
      success: true,
      data: [],
      source: 'api',
      apiMessage: data.content?.noResultMessageSmall || '\u8be5\u57ce\u5e02\u6682\u65e0\u9152\u5e97\u6570\u636e',
      totalCount: data.content?.totalCount || 0,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '\u8bf7\u6c42\u5931\u8d25';
    return NextResponse.json({
      success: false,
      error: '\u65e0\u6cd5\u8fde\u63a5\u5230\u534e\u4f4fAPI: ' + msg,
    }, { status: 500 });
  }
}