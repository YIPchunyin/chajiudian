import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getCollection } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const fileKey = request.nextUrl.searchParams.get('key') || '';
    if (!fileKey) return NextResponse.json({ success: false, error: '\u7f3a\u5c11\u6587\u4ef6\u952e' }, { status: 400 });

    const store: any = (global as any).__fileStore || {};
    const fileData = store[fileKey];
    if (!fileData) return NextResponse.json({ success: false, error: '\u6587\u4ef6\u6570\u636e\u5df2\u8fc7\u671f' }, { status: 400 });

    const { data, matchedColumn } = fileData;
    const newColumnName = '\u80fd\u5426\u4f7f\u7528\u4e5d\u6298\u5238';
    const col = await getCollection<any>('chajiudian');
    const today = new Date().toISOString().split('T')[0];

    for (const row of data) {
      const name = String(row[matchedColumn]).trim();
      try {
        const record = await col.findOne({ hotelName: name, queryDate: today });
        row[newColumnName] = record?.canUse90Percent ? '\u662f' : '\u5426';
      } catch { row[newColumnName] = '\u5426'; }
    }
    delete store[fileKey];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'result');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=\"result_' + today + '.xlsx\"',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '\u8bf7\u6c42\u5931\u8d25';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
