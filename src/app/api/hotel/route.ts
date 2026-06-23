import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://hweb-hotel.huazhu.com/hotels/reserve/GetHotelEnabledEcouponV77";

const DEFAULT_HEADERS: Record<string, string> = {
  "Host": "hweb-hotel.huazhu.com",
  "sId": "0b3xPQkl2RYAWh45dsml2yedXg2xPQkJ1782232502544",
  "Client-Platform": "WX-MP",
  "devNo": "7654621848872724749",
  "ssid": "1729663732242774469",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c33)XWEB/14185",
  "xweb_xhr": "1",
  "abInfo": JSON.stringify({
    xcxFourFive: "A",
    HUA_AI_ENTRY_GROUP: "C",
    exclusivePrice: "B",
    xcxFourFive2025: "A",
    xcxFourFive2025_tiandanye: true,
  }),
  "mini-version": "3.0.56",
  "Referer": "https://servicewechat.com/wx286efc12868f2559/580/page-frame.html",
  "Accept": "*/*",
  "Accept-Language": "zh-CN,zh;q=0.9",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const apiHeaders = new Headers();
    for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
      apiHeaders.set(key, value);
    }
    apiHeaders.set("Content-Type", "application/json");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "请求失败" },
      { status: 500 }
    );
  }
}
