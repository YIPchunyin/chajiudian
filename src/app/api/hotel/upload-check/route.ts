import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { searchAndCheckBirthday } from '@/lib/huazhu';
import { findCachedHotel, saveHotelCache } from '@/lib/mongodb';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const columnName = (formData.get('columnName') as string) || '\u9152\u5e97\u540d\u79f0';
    const checkIn = (formData.get('checkIn') as string) || '2026-07-01';
    const checkOut = (formData.get('checkOut') as string) || '2026-07-02';

    if (!file) {
      return NextResponse.json({ success: false, error: '\u8bf7\u4e0a\u4f20\u6587\u4ef6' }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse workbook
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      return NextResponse.json({ success: false, error: '\u6587\u4ef6\u683c\u5f0f\u4e0d\u652f\u6301\uff0c\u8bf7\u4e0a\u4f20 .xlsx \u6216 .xls \u6587\u4ef6' }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ success: false, error: '\u6587\u4ef6\u4e2d\u6ca1\u6709\u5de5\u4f5c\u8868' }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const data: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (data.length === 0) {
      return NextResponse.json({ success: false, error: '\u8868\u683c\u4e3a\u7a7a' }, { status: 400 });
    }

    // Check if column exists
    const headers = Object.keys(data[0]);
    const matchedColumn = headers.find((h) => h.trim() === columnName.trim());

    if (!matchedColumn) {
      return NextResponse.json({
        success: false,
        error: '\u627e\u4e0d\u5230\u5217\u540d\u201c' + columnName + '\u201d\uff0c\u5f53\u524d\u8868\u5934\u4e3a\uff1a' + headers.join(', '),
      }, { status: 400 });
    }

    // Extract unique hotel names
    const hotelNames = [...new Set(data.map((row) => String(row[matchedColumn]).trim()).filter(Boolean))];

    // Process each hotel
    const total = hotelNames.length;
    const results: Array<{
      hotelName: string;
      canUse90Percent: boolean;
      found: boolean;
      source: 'cache' | 'search';
    }> = [];

    for (let i = 0; i < total; i++) {
      const name = hotelNames[i];

      // Check cache first
      const cached = await findCachedHotel(name);
      if (cached) {
        results.push({ hotelName: name, canUse90Percent: cached.canUse90Percent, found: true, source: 'cache' });
        continue;
      }

      // Search via API
      try {
        const searchResults = await searchAndCheckBirthday(name, checkIn, checkOut);
        const match = searchResults.find(
          (r) => r.hotelName.indexOf(name) !== -1 || name.indexOf(r.hotelName) !== -1
        );

        if (match) {
          await saveHotelCache({
            hotelName: name,
            hotelId: match.hotelId,
            queryDate: new Date().toISOString().split('T')[0],
            has90Percent: match.has90Percent,
            canUse90Percent: match.canUse90Percent,
            allCoupons: JSON.stringify(match.birthdayCoupons),
            updatedAt: new Date(),
          });
          results.push({ hotelName: name, canUse90Percent: match.canUse90Percent, found: true, source: 'search' });
        } else {
          results.push({ hotelName: name, canUse90Percent: false, found: false, source: 'search' });
        }
      } catch {
        results.push({ hotelName: name, canUse90Percent: false, found: false, source: 'search' });
      }
    }

    // Build lookup map
    const resultMap = new Map(results.map((r) => [r.hotelName, r]));

    // Add new column to data
    const newColumnName = '\u80fd\u5426\u4f7f\u7528\u4e5d\u6298\u5238';
    for (const row of data) {
      const name = String(row[matchedColumn]).trim();
      const r = resultMap.get(name);
      if (r) {
        row[newColumnName] = r.canUse90Percent ? '\u662f' : '\u5426';
      } else {
        row[newColumnName] = '\u5426';
      }
    }

    // Write back to sheet
    const newSheet = XLSX.utils.json_to_sheet(data);
    workbook.Sheets[sheetName] = newSheet;
    const wbOut = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return as download
    return new NextResponse(wbOut, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="result_' + new Date().toISOString().split('T')[0] + '.xlsx"',
        'X-Processed-Count': String(total),
        'X-Cache-Hits': String(results.filter((r) => r.source === 'cache').length),
        'X-Search-Hits': String(results.filter((r) => r.source === 'search').length),
        'X-Can-Use-Count': String(results.filter((r) => r.canUse90Percent).length),
      },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '\u8bf7\u6c42\u5931\u8d25';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
