'use client';

import { useState } from 'react';
import type { HotelRequest, HotelResponse } from '@/types/hotel';
import BirthdaySearch from '@/components/BirthdaySearch';
import ApiTester from '@/components/ApiTester';
import BatchCheck from '@/components/BatchCheck';
import FileCheck from '@/components/FileCheck';
import ScrapeAll from '@/components/ScrapeAll';
import JsonViewer from '@/components/JsonViewer';

const getDefaultForm = (): HotelRequest => ({
  activityId: '',
  allowedBenefitsTicket: true,
  checkIn: new Date().toISOString().split('T')[0],
  checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  couponCaller: '9',
  hotelId: '',
  isCanUseEcoupon: 1,
  isCanUseThresholdCoupon: true,
  marketPrices: '279.00',
  orderType: '',
  checkInType: 'DAY',
  ratePlanCode: 'Base-OII-STD',
  roomPrices: '237.15',
  needPreCoupon: false,
});

const COUPON_TYPE_LABELS: Record<number, string> = {
  1: '\u6298\u6263\u5238',
  2: '\u7acb\u51cf\u5238',
};

type Step = 'search' | 'birthday' | 'coupon';

export default function Home() {
  const [mode, setMode] = useState<'coupon' | 'api' | 'batch' | 'file' | 'scrape'>('coupon');
  const [step, setStep] = useState<Step>('search');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchHotelId, setSearchHotelId] = useState<string | null>(null);
  const [searchHotelName, setSearchHotelName] = useState<string>('');
  const [form, setForm] = useState<HotelRequest>(getDefaultForm());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HotelResponse | null>(null);
  const [error, setError] = useState('');

  const handleSearch = () => {
    const keyword = searchInput.trim();
    if (!keyword) return;
    setSearchKeyword(keyword);
    setSearchHotelId(null);
    setResult(null);
    setError('');
    setStep('birthday');
  };

  const handleViewAllCoupons = (hotelId: string, hotelName: string) => {
    setSearchHotelId(hotelId);
    setSearchHotelName(hotelName);
    setForm((prev) => ({ ...prev, hotelId }));
    setStep('coupon');
  };

  const handleBack = () => {
    setStep('search');
    setSearchKeyword('');
    setSearchHotelId(null);
    setResult(null);
    setError('');
  };

  const handleChange = (field: keyof HotelRequest, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) setResult(json.data as HotelResponse);
      else setError(json.error || '\u8bf7\u6c42\u5931\u8d25');
    } catch (e: any) {
      setError(e.message || '\u7f51\u7edc\u9519\u8bef');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'coupon' | 'api' | 'batch' | 'file' | 'scrape') => {
    setMode(newMode);
    if (newMode === 'api' || newMode === 'file' || newMode === 'scrape') return;
    setStep('search');
    setSearchKeyword('');
    setSearchHotelId(null);
    setResult(null);
    setError('');
  };

  const renderCoupon = (c: any, idx: number) => (
    <div key={idx} className={'border rounded-lg p-4 '.concat(c.isCanUse ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-70')}>
      <div className='flex items-start justify-between'>
        <div>
          <div className='font-semibold text-gray-800'>{c.couponName}</div>
          <div className='text-2xl font-bold mt-1 text-red-500'>{c.couponText}</div>
          {c.savings !== undefined && c.savings > 0 && <div className='text-sm text-green-600 mt-1'>{'\u9884\u8ba1\u8282\u7701'} {'\u00a5'}{c.savings}</div>}
        </div>
        <div className='text-right text-xs text-gray-400'><div>{c.beginDate}</div><div>{c.endDateDesc}</div></div>
      </div>
      <div className='mt-2 flex items-center gap-2 flex-wrap'>
        <span className='text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded'>{COUPON_TYPE_LABELS[c.couponType] || '\u672a\u77e5'}</span>
        {c.couponTag?.map((tag: string, i: number) => <span key={i} className='text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded'>{tag}</span>)}
        {c.thresholdText && <span className='text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded'>{c.thresholdText}</span>}
      </div>
      {!c.isCanUse && <div className='mt-2 text-xs text-red-400'>{'\u274c'} {c.canNotUseReason || '\u4e0d\u53ef\u7528'}</div>}
      {c.isCanUse && <div className='mt-2 text-xs text-green-500'>{'\u2705'} {'\u53ef\u7528'}</div>}
    </div>
  );

  return (
    <main className='min-h-screen bg-gray-100 py-8 px-4'>
      <div className='max-w-5xl mx-auto'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h1 className='text-3xl font-bold text-gray-800'>{String.fromCodePoint(0x1f3f7)} {'\u534e\u4f4f\u9152\u5e97\u4f18\u60e0\u5238\u722c\u866b'}</h1>
          </div>
          <div className='flex gap-1 bg-gray-200 rounded-lg p-1'>
            <button onClick={() => switchMode('coupon')} className={'px-3 py-1.5 text-sm font-medium rounded-md transition ' + (mode === 'coupon' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{String.fromCodePoint(0x1f382)} {'\u641c\u7d22'}</button>
            <button onClick={() => switchMode('batch')} className={'px-3 py-1.5 text-sm font-medium rounded-md transition ' + (mode === 'batch' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{String.fromCodePoint(0x1f4ca)} {'\u6279\u91cf'}</button>
            <button onClick={() => switchMode('file')} className={'px-3 py-1.5 text-sm font-medium rounded-md transition ' + (mode === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{String.fromCodePoint(0x1f4c4)} {'\u8868\u683c'}</button>
            <button onClick={() => switchMode('scrape')} className={'px-3 py-1.5 text-sm font-medium rounded-md transition ' + (mode === 'scrape' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{String.fromCodePoint(0x1f4e1)} {'\u722c\u53d6'}</button>
            <button onClick={() => switchMode('api')} className={'px-3 py-1.5 text-sm font-medium rounded-md transition ' + (mode === 'api' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{String.fromCodePoint(0x1f4e1)} API</button>
          </div>
        </div>

        {mode === 'scrape' && <ScrapeAll />}

        {mode === 'file' && <FileCheck />}

        {mode === 'batch' && <BatchCheck />}

        {mode === 'api' && <ApiTester />}

        {mode === 'coupon' && (
          <>
            <p className='text-gray-500 text-sm mb-6'>{'\u641c\u7d22\u9152\u5e97\uff0c\u81ea\u52a8\u68c0\u67e5\u524d3\u540d\u9152\u5e97\u7684\u751f\u65e5\u4e5d\u6298\u5238'}</p>
            <div className='flex items-center gap-2 mb-6 text-sm'>
              <StepDot step={1} label={'\u641c\u7d22\u5173\u952e\u8bcd'} active={step === 'search'} done={step !== 'search'} />
              <StepLine />
              <StepDot step={2} label={'\u751f\u65e5\u4e5d\u6298\u5238\u68c0\u67e5'} active={step === 'birthday'} done={step === 'coupon'} />
              <StepLine />
              <StepDot step={3} label={'\u5168\u90e8\u4f18\u60e0\u5238'} active={step === 'coupon'} done={false} />
            </div>
            {step === 'search' && (
              <div className='bg-white rounded-xl shadow p-6 mb-6'>
                <h2 className='text-lg font-bold text-gray-800 mb-4'>{'\u641c\u7d22\u9152\u5e97'}</h2>
                <div className='flex gap-2'>
                  <input type='text' className='flex-1 border rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent' placeholder={'\u8f93\u5165\u9152\u5e97\u540d\u79f0\u6216\u57ce\u5e02\u5173\u952e\u8bcd...'} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} />
                  <button onClick={handleSearch} className='bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition text-sm'>{String.fromCodePoint(0x1f50d)} {'\u641c\u7d22'}</button>
                </div>
              </div>
            )}
            {step === 'birthday' && searchKeyword && <BirthdaySearch keyword={searchKeyword} onViewAllCoupons={handleViewAllCoupons} onBack={handleBack} />}
            {step === 'coupon' && searchHotelId && (
              <>
                <div className='bg-white rounded-lg shadow-sm border p-3 mb-4 flex items-center gap-3 text-sm flex-wrap'>
                  <span className='text-gray-500'>{'\u9152\u5e97'}:</span><span className='font-medium text-gray-800'>{searchHotelName}</span>
                  <button onClick={handleBack} className='text-blue-500 hover:text-blue-700 ml-auto'>{'\u2190 \u8fd4\u56de\u641c\u7d22'}</button>
                </div>
                <div className='bg-white rounded-xl shadow p-6 mb-6'>
                  <h2 className='text-lg font-bold text-gray-800 mb-4'>{'\u67e5\u8be2\u5168\u90e8\u4f18\u60e0\u5238'}</h2>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div><label className='block text-sm font-medium text-gray-600 mb-1'>hotelId</label><input type='text' className='w-full border rounded-lg px-3 py-2 text-sm bg-gray-100' value={form.hotelId} disabled /></div>
                    <div><label className='block text-sm font-medium text-gray-600 mb-1'>{'\u5165\u4f4f\u65e5\u671f'}</label><input type='date' className='w-full border rounded-lg px-3 py-2 text-sm' value={form.checkIn} onChange={(e) => handleChange('checkIn', e.target.value)} /></div>
                    <div><label className='block text-sm font-medium text-gray-600 mb-1'>{'\u79bb\u5e97\u65e5\u671f'}</label><input type='date' className='w-full border rounded-lg px-3 py-2 text-sm' value={form.checkOut} onChange={(e) => handleChange('checkOut', e.target.value)} /></div>
                    <div><label className='block text-sm font-medium text-gray-600 mb-1'>{'\u623f\u4ef7 (marketPrices)'}</label><input type='text' className='w-full border rounded-lg px-3 py-2 text-sm' value={form.marketPrices} onChange={(e) => handleChange('marketPrices', e.target.value)} /></div>
                    <div><label className='block text-sm font-medium text-gray-600 mb-1'>{'\u623f\u4ef7 (roomPrices)'}</label><input type='text' className='w-full border rounded-lg px-3 py-2 text-sm' value={form.roomPrices} onChange={(e) => handleChange('roomPrices', e.target.value)} /></div>
                    <div><label className='block text-sm font-medium text-gray-600 mb-1'>ratePlanCode</label><input type='text' className='w-full border rounded-lg px-3 py-2 text-sm' value={form.ratePlanCode} onChange={(e) => handleChange('ratePlanCode', e.target.value)} /></div>
                  </div>
                  <button onClick={handleSubmit} disabled={loading} className='mt-5 w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-8 rounded-lg transition'>
                    {loading ? String.fromCodePoint(0x23f3) + ' \u6293\u53d6\u4e2d...' : String.fromCodePoint(0x1f680) + ' \u6293\u53d6\u5168\u90e8\u4f18\u60e0\u5238'}
                  </button>
                </div>
                {error && <div className='bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-6'>{'\u274c'} {error}</div>}
                {result && (
                  <>
                    <div className='max-w-5xl mx-auto mb-4'><JsonViewer data={result} title={'\u4f18\u60e0\u5238\u54cd\u5e94\u6570\u636e'} buttonLabel={'\u25b6 \u67e5\u770bJSON'} /></div>
                    <div className='space-y-6'>
                      {result.content.benefitGroupList.length > 0 && (<div className='bg-white rounded-xl shadow p-6'><h2 className='text-lg font-bold text-gray-800 mb-4'>{String.fromCodePoint(0x1f3ab)} {'\u6743\u76ca\u5238'}</h2><div className='grid grid-cols-1 md:grid-cols-2 gap-3'>{result.content.benefitGroupList.map((g: any, i: number) => (<div key={i} className='flex items-center gap-3 border rounded-lg p-3'><img src={g.icon} alt={g.name} className='w-10 h-10' /><div><div className='font-medium'>{g.name}</div><div className='text-sm text-gray-500'>{'\u53ef\u7528\u6b21\u6570'}: {g.canUseCount} / {g.useMaxLimit}</div></div></div>))}</div></div>)}
                      {result.content.couponList && Object.keys(result.content.couponList).length > 0 && (<div className='bg-white rounded-xl shadow p-6'><h2 className='text-lg font-bold text-gray-800 mb-4'>{String.fromCodePoint(0x1f39f)} {'\u53ef\u7528\u4f18\u60e0\u5238'}</h2>{Object.entries(result.content.couponList).map(([date, coupons]: [string, any]) => (<div key={date} className='mb-4'><h3 className='text-sm font-semibold text-gray-500 mb-2'>{String.fromCodePoint(0x1f4c5)} {date}</h3><div className='grid grid-cols-1 md:grid-cols-2 gap-3'>{(coupons as any[]).map((c: any, i: number) => renderCoupon(c, i))}</div></div>))}</div>)}
                      {result.content.thresholdList.length > 0 && (<div className='bg-white rounded-xl shadow p-6'><h2 className='text-lg font-bold text-gray-800 mb-4'>{String.fromCodePoint(0x1f4cc)} {'\u95e8\u69db\u5238'}</h2><div className='grid grid-cols-1 md:grid-cols-2 gap-3'>{result.content.thresholdList.map((c: any, i: number) => renderCoupon(c, i))}</div></div>)}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function StepDot({ step, label, active, done }: { step: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={(active ? 'text-blue-600 font-medium' : done ? 'text-green-600' : 'text-gray-400').concat(' flex items-center gap-1.5')}>
      <span className={'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold '.concat(active ? 'bg-blue-600 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-200')}>{done ? '\u2713' : step}</span>
      <span className='text-sm'>{label}</span>
    </div>
  );
}

function StepLine() {
  return <div className='flex-1 h-px bg-gray-300 mx-1' />;
}
