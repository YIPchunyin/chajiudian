import { NextRequest, NextResponse } from 'next/server';
import * as QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const { vipCode } = await request.json();
    if (!vipCode) {
      return NextResponse.json({ success: false, error: '缺少vipCode' }, { status: 400 });
    }
    const qrDataUrl = await QRCode.toDataURL(vipCode, { width: 400, margin: 2 });
    return NextResponse.json({ success: true, qrDataUrl });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'QR生成失败' }, { status: 500 });
  }
}
