import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getCollection, getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    // Test connection first
    let testDb;
    try {
      testDb = await getDb();
      await testDb.command({ ping: 1 });
    } catch (connErr: any) {
      return NextResponse.json({
        success: false,
        error: 'MongoDB连接失败',
        detail: connErr?.message || '连接超时或被拒绝',
        hint: '请检查MONGODB_URI环境变量是否在Vercel中设置，以及MongoDB Atlas IP白名单是否允许Vercel访问',
      }, { status: 500 });
    }

    const col = await getCollection<any>('chajiudian');
    const totalCount = await col.countDocuments();
    const records = await col.find({}).sort({ updatedAt: -1 }).toArray();

    if (records.length === 0) {
      // Return empty template with headers
      const data = [{
        序号: '',
        酒店名称: '',
        酒店ID: '',
        查询日期: '',
        是否支持九折券: '',
        能否使用九折券: '',
        全部券信息: '',
        更新时间: '',
      }];

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'chajiudian');

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
          'X-Record-Count': '0',
        },
      });
    }

    const data = records.map((r: any, i: number) => ({
      序号: i + 1,
      酒店名称: r.hotelName || '',
      酒店ID: r.hotelId || '',
      查询日期: r.queryDate || '',
      是否支持九折券: r.has90Percent ? '是' : '否',
      能否使用九折券: r.canUse90Percent ? '是' : '否',
      全部券信息: r.allCoupons || '',
      更新时间: r.updatedAt ? new Date(r.updatedAt).toLocaleString('zh-CN') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'chajiudian');

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
    const msg = error instanceof Error ? error.message : '请求失败';
    return NextResponse.json({
      success: false,
      error: msg,
      hint: '请检查Vercel环境变量MONGODB_URI是否已设置',
    }, { status: 500 });
  }
}
