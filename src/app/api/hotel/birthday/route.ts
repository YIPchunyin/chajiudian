import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'https://hweb-hotel.huazhu.com/hotels/reserve/GetHotelEnabledEcouponV77';

const DEFAULT_HEADERS: Record<string, string> = {
  'Host': 'hweb-hotel.huazhu.com',
  'sId': '0b3xPQkl2RYAWh45dsml2yedXg2xPQkJ1782232502544',
  'Client-Platform': 'WX-MP',
  'devNo': '7654621848872724749',
  'ssid': '1729663732242774469',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c33)XWEB/14185',
  'xweb_xhr': '1',
  'mini-version': '3.0.56',
  'Referer': 'https://servicewechat.com/wx286efc12868f2559/580/page-frame.html',
  'Accept': '*/*',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hotelId, checkIn, checkOut } = body;

    if (!hotelId) {
      return NextResponse.json({ success: false, error: '缺少酒店ID' }, { status: 400 });
    }

    const apiHeaders = new Headers();
    for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
      apiHeaders.set(key, value);
    }
    apiHeaders.set('Content-Type', 'application/json');

    const requestBody = {
      activityId: '',
      allowedBenefitsTicket: true,
      checkIn: checkIn || '2026-07-01',
      checkOut: checkOut || '2026-07-02',
      couponCaller: '9',
      hotelId,
      isCanUseEcoupon: 1,
      isCanUseThresholdCoupon: true,
      marketPrices: '279.00',
      orderType: '',
      checkInType: 'DAY',
      ratePlanCode: 'Base-OII-STD',
      roomPrices: '237.15',
      needPreCoupon: false,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.code !== 200 || !data.content) {
      return NextResponse.json({ success: false, error: data.message || '查询失败' }, { status: 500 });
    }

    // Extract birthday-related coupons
    const content = data.content;
    const birthdayCoupons: Array<{
      name: string;
      couponText: string;
      couponType: number;
      couponValue: string;
      isCanUse: boolean;
      canNotUseReason: string;
      thresholdText?: string;
      beginDate: string;
      endDateDesc: string;
      savings?: number;
      date?: string;
    }> = [];

    // Search through couponList for birthday items
    if (content.couponList) {
      for (const [date, coupons] of Object.entries(content.couponList)) {
        for (const c of (coupons as any[])) {
          if (c.couponName && c.couponName.includes('生日')) {
            birthdayCoupons.push({
              name: c.couponName,
              couponText: c.couponText,
              couponType: c.couponType,
              couponValue: c.couponValue,
              isCanUse: c.isCanUse,
              canNotUseReason: c.canNotUseReason,
              thresholdText: c.thresholdText,
              beginDate: c.beginDate,
              endDateDesc: c.endDateDesc,
              savings: c.savings,
              date,
            });
          }
        }
      }
    }

    // Search through thresholdList for birthday items
    if (content.thresholdList) {
      for (const c of content.thresholdList) {
        if (c.couponName && c.couponName.includes('生日')) {
          birthdayCoupons.push({
            name: c.couponName,
            couponText: c.couponText,
            couponType: c.couponType,
            couponValue: c.couponValue,
            isCanUse: c.isCanUse,
            canNotUseReason: c.canNotUseReason,
            thresholdText: c.thresholdText,
            beginDate: c.beginDate,
            endDateDesc: c.endDateDesc,
            savings: c.savings,
          });
        }
      }
    }

    // Also check recommendedCoupons
    let recommendedBirthday: (typeof birthdayCoupons)[0] | null = null;
    if (content.recommendedCoupons) {
      for (const c of Object.values(content.recommendedCoupons) as any[]) {
        if (c.couponName && c.couponName.includes('生日')) {
          recommendedBirthday = {
            name: c.couponName,
            couponText: c.couponText,
            couponType: c.couponType,
            couponValue: c.couponValue,
            isCanUse: c.isCanUse,
            canNotUseReason: c.canNotUseReason,
            thresholdText: c.thresholdText,
            beginDate: c.beginDate,
            endDateDesc: c.endDateDesc,
            savings: c.savings,
          };
          break;
        }
      }
    }

    const hasBirthdayBenefit = birthdayCoupons.length > 0;
    const canUseBirthday = birthdayCoupons.some((c) => c.isCanUse);

    return NextResponse.json({
      success: true,
      data: {
        hotelId,
        hasBirthdayBenefit,
        canUseBirthday,
        recommendedBirthday,
        birthdayCoupons,
        totalCoupons: birthdayCoupons.length,
        usableCount: birthdayCoupons.filter((c) => c.isCanUse).length,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '请求失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}