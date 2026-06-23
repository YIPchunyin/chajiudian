import { NextRequest, NextResponse } from 'next/server';
import { searchAndCheckBirthday } from '@/lib/huazhu';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const keyword = searchParams.get('keyword') || '';
  const checkIn = searchParams.get('checkIn') || '2026-07-01';
  const checkOut = searchParams.get('checkOut') || '2026-07-02';

  if (!keyword) {
    return NextResponse.json({ success: false, error: '\u8bf7\u63d0\u4f9b\u641c\u7d22\u5173\u952e\u8bcd' }, { status: 400 });
  }

  try {
    const results = await searchAndCheckBirthday(keyword, checkIn, checkOut);

    if (results.length === 0) {
      return NextResponse.json({ success: true, data: [], message: '\u672a\u627e\u5230\u9152\u5e97' });
    }

    return NextResponse.json({ success: true, data: results });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '\u8bf7\u6c42\u5931\u8d25';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
