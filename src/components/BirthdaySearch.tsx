'use client';

import { useState, useEffect } from 'react';
import JsonViewer from '@/components/JsonViewer';

interface HotelResult {
  hotelId: string;
  hotelName: string;
  brand: string;
  address: string;
  price: string;
  score: string;
  hasBirthday: boolean;
  has90Percent: boolean;
  canUse90Percent: boolean;
  birthdayCoupons: Array<{ name: string; couponText: string; isCanUse: boolean; canNotUseReason: string }>;
}

interface BirthdaySearchProps {
  keyword: string;
  onViewAllCoupons: (hotelId: string, hotelName: string) => void;
  onBack: () => void;
}

export default function BirthdaySearch({ keyword, onViewAllCoupons, onBack }: BirthdaySearchProps) {
  const [results, setResults] = useState<HotelResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [rawData, setRawData] = useState<unknown>(null);

  useEffect(() => {
    if (keyword.trim()) {
      handleSearch();
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [keyword]);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(false);
    setResults([]);
    setRawData(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const res = await fetch('/api/hotel/search-birthday?keyword=' + encodeURIComponent(keyword) + '&checkIn=' + today + '&checkOut=' + tomorrow);
      const json = await res.json();
      setRawData(json);
      if (json.success) {
        setResults(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className='bg-white rounded-xl shadow p-6 mb-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-bold text-gray-800 flex items-center gap-2'>
          <span>{String.fromCodePoint(0x1f50d)}</span>
          <span>{'\u641c\u7d22\u201c'}{keyword}{'\u201d\u7ed3\u679c'}</span>
        </h2>
        <button onClick={onBack} className='text-sm text-blue-500 hover:text-blue-700'>{'\u2190 \u8fd4\u56de'}</button>
      </div>

      {loading && !searched && (
        <div className='flex items-center justify-center py-8'>
          <div className='animate-spin rounded-full h-6 w-6 border-2 border-pink-500 border-t-transparent' />
          <span className='ml-2 text-sm text-gray-500'>{'\u6b63\u5728\u641c\u7d22\u5e76\u67e5\u8be2\u751f\u65e5\u4f18\u60e0...'}</span>
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className='text-center py-6'>
          <p className='text-sm text-gray-500'>{'\u672a\u627e\u5230\u9152\u5e97\u6570\u636e'}</p>
          <button onClick={handleSearch} className='mt-3 text-sm text-pink-500 hover:underline'>{'\u91cd\u8bd5'}</button>
        </div>
      )}

      {results.length > 0 && (
        <div className='space-y-3'>
          <div className='text-xs text-gray-400'>
            {'\u627e\u5230'} {results.length} {'\u5bb6\u9152\u5e97'}
          </div>
          {results.map((hotel, idx) => (
            <div key={hotel.hotelId} className={'border-2 rounded-xl p-4 transition ' + (hotel.canUse90Percent ? 'border-green-300 bg-green-50' : hotel.has90Percent ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-white')}>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full'>#{idx + 1}</span>
                    {hotel.brand && <span className='text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded'>{hotel.brand}</span>}
                  </div>
                  <div className='font-semibold text-gray-800 mt-1 text-sm'>{hotel.hotelName}</div>
                  {hotel.address && <div className='text-xs text-gray-400 mt-0.5 truncate'>{hotel.address}</div>}
                  <div className='flex items-center gap-3 mt-1 text-xs text-gray-400'>
                    {hotel.price && <span>{hotel.price}</span>}
                    {hotel.score && <span>{'\u8bc4\u5206'} {hotel.score}</span>}
                  </div>
                </div>
                <div className='ml-3 shrink-0 text-right'>
                  {hotel.canUse90Percent ? (
                    <div className='bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full'>{'\u2705 \u4e5d\u6298\u53ef\u7528'}</div>
                  ) : hotel.has90Percent ? (
                    <div className='bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-full'>{'\u274c \u4e5d\u6298\u4e0d\u53ef\u7528'}</div>
                  ) : hotel.hasBirthday ? (
                    <div className='bg-gray-200 text-gray-500 text-xs px-3 py-1.5 rounded-full'>{'\u751f\u65e5\u5238\u65e0'}</div>
                  ) : (
                    <div className='bg-gray-100 text-gray-400 text-xs px-3 py-1.5 rounded-full'>{'\u65e0\u751f\u65e5\u793c\u9047'}</div>
                  )}
                </div>
              </div>

              {hotel.birthdayCoupons.length > 0 && (
                <div className='mt-2 pt-2 border-t border-gray-100'>
                  {hotel.birthdayCoupons.map((c, i) => (
                    <div key={i} className='flex items-center justify-between text-xs py-1'>
                      <span className='text-gray-600'>{c.name}</span>
                      <span className={c.isCanUse ? 'text-green-600 font-medium' : 'text-red-400'}>
                        {c.couponText} {c.isCanUse ? '\u2705' : '\u274c'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => onViewAllCoupons(hotel.hotelId, hotel.hotelName)} className='mt-2 text-xs text-blue-500 hover:text-blue-700'>{'\u67e5\u770b\u5168\u90e8\u4f18\u60e0\u5238 \u2192'}</button>
            </div>
          ))}

          <button onClick={handleSearch} className='w-full text-sm text-pink-500 hover:text-pink-700 py-2 border border-dashed border-gray-300 rounded-lg'>{String.fromCodePoint(0x1f504) + ' \u91cd\u65b0\u641c\u7d22'}</button>

          <JsonViewer data={rawData} title={'\u641c\u7d22\u54cd\u5e94'} buttonLabel={'\u25b6 JSON'} />
        </div>
      )}
    </div>
  );
}
