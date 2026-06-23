import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getCollection } from '@/lib/mongodb';

export async function GET() {
  try {
    const col = await getCollection<any>('chajiudian');
    const records = await col.find({}).sort({ updatedAt: -1 }).toArray();

    const data = records.map((r: any, i: number) => ({
      '\u5e8f\u53f7': i + 1,
      '\u9152\u5e97\u540d\u79f0': r.hotelName || '',
      '\u9152\u5e97ID': r.hotelId || '',
      '\u67e5\u8be2\u65e5\u671f': r.queryDate || '',
      '\u662f\u5426\u652f\u6301\u4e5d\u6298\u5238': r.has90Percent ? '\u662f' : '\u5426',
      '\u80fd\u5426\u4f7f\u7528\u4e5d\u6298\u5238': r.canUse90Percent ? '\u662f' : '\u5426',
      '\u5168\u90e8\u5238\u4fe1\u606f': r.allCoupons || '',
      '\u66f4\u65b0\u65f6\u95f4': r.updatedAt ? new Date(r.updatedAt).toLocaleString('zh-CN') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'chajiudian');

    // Set column widths
    ws['!cols'] = [
      { wch: 6 }, { wch: 35 }, { wch: 12 }, { wch: 12 },
      { wch: 16 }, { wch: 16 }, { wch: 50 }, { wch: 20 },
    ];

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="chajiudian_' + new Date().toISOString().split('T')[0] + '.xlsx"',
        'X-Record-Count': String(records.length),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '\u8bf7\u6c42\u5931\u8d25';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
