import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const columnName = (formData.get('columnName') as string) || '\u9152\u5e97\u540d\u79f0';

    if (!file) return NextResponse.json({ success: false, error: '\u8bf7\u4e0a\u4f20\u6587\u4ef6' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let workbook: XLSX.WorkBook;
    try { workbook = XLSX.read(buffer, { type: 'buffer' }); }
    catch { return NextResponse.json({ success: false, error: '\u6587\u4ef6\u683c\u5f0f\u4e0d\u652f\u6301' }, { status: 400 }); }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return NextResponse.json({ success: false, error: '\u6587\u4ef6\u4e2d\u6ca1\u6709\u5de5\u4f5c\u8868' }, { status: 400 });

    const sheet = workbook.Sheets[sheetName];
    const data: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (data.length === 0) return NextResponse.json({ success: false, error: '\u8868\u683c\u4e3a\u7a7a' }, { status: 400 });

    const headers = Object.keys(data[0]);
    const matchedColumn = headers.find((h) => h.trim() === columnName.trim());
    if (!matchedColumn) {
      return NextResponse.json({ success: false, error: '\u627e\u4e0d\u5230\u5217\u201c' + columnName + '\u201d\uff0c\u8868\u5934\uff1a' + headers.join(', ') }, { status: 400 });
    }

    const hotelNames = [...new Set(data.map((row) => String(row[matchedColumn]).trim()).filter(Boolean))];

    // Store original data in memory with a simple key
    const fileKey = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const store: any = (global as any).__fileStore || {};
    store[fileKey] = { data, matchedColumn, headers, columnName };
    (global as any).__fileStore = store;

    return NextResponse.json({
      success: true,
      fileKey,
      hotelNames,
      total: hotelNames.length,
      columnName,
      matchedColumn,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '\u8bf7\u6c42\u5931\u8d25';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
