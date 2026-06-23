'use client';

import { useState, useEffect } from 'react';
import type { City } from '@/components/CitySelect';

export interface HotelDisplayItem {
  id: string;
  name: string;
  brand: string;
  address: string;
  cityName?: string;
  lowestPrice?: number | null;
  commentScore?: string;
  imageUrl?: string;
  distance?: string;
}

interface HotelSelectProps {
  city: City;
  onSelect: (hotel: HotelDisplayItem) => void;
  selectedHotel?: HotelDisplayItem | null;
}

function isValidHotel(h: HotelDisplayItem): boolean {
  return h.id !== '' && h.name !== '';
}

export default function HotelSelect({ city, onSelect, selectedHotel }: HotelSelectProps) {
  const [hotels, setHotels] = useState<HotelDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState('');
  const [query, setQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    setQuery('');
    setBrandFilter('');
    setHotels([]);
    setApiMessage('');

    fetch('/api/hotel/search?cityName=' + encodeURIComponent(city.name))
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const valid = res.data.filter(isValidHotel);
          setHotels(valid);
          if (valid.length === 0) {
            setApiMessage(res.data.length > 0
              ? '\u9152\u5e97\u540d\u79f0\u6570\u636e\u672a\u8fd4\u56de\uff0c\u8bf7\u68c0\u67e5API\u54cd\u5e94'
              : (res.apiMessage || '\u8be5\u57ce\u5e02\u6682\u65e0\u9152\u5e97\u6570\u636e'));
          }
        } else {
          setApiMessage(res.error || '\u67e5\u8be2\u5931\u8d25');
        }
      })
      .catch(() => setApiMessage('\u7f51\u7edc\u8bf7\u6c42\u5931\u8d25'))
      .finally(() => setLoading(false));
  }, [city.name]);

  const filtered = hotels.filter((h) => {
    if (!isValidHotel(h)) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!h.name.toLowerCase().includes(q) &&
          !h.address.toLowerCase().includes(q) &&
          !(h.brand && h.brand.toLowerCase().includes(q))) return false;
    }
    if (brandFilter && h.brand !== brandFilter) return false;
    return true;
  });

  const brands = [...new Set(hotels.map((h) => h.brand).filter(Boolean))].sort();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <input type="text" className="w-full border rounded-lg px-4 py-2 pl-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" placeholder={'\u641c\u7d22\u9152\u5e97\u540d\u79f0...'} value={query} onChange={(e) => setQuery(e.target.value)} disabled={hotels.length === 0} />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        {brands.length > 0 && (
          <select className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="">{'\u5168\u90e8\u54c1\u724c'}</option>
            {brands.map((b) => (<option key={b} value={b}>{b}</option>))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
          <span className="ml-2 text-sm text-gray-500">{'\u6b63\u5728\u67e5\u8be2'}{city.name}{'\u7684\u9152\u5e97...'}</span>
        </div>
      ) : apiMessage ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">\ud83c\udf7f</div>
          <p className="text-sm text-gray-500">{apiMessage}</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">{query || brandFilter ? '\u672a\u627e\u5230\u5339\u914d\u7684\u9152\u5e97' : '\u6682\u65e0\u9152\u5e97\u6570\u636e'}</p>
      ) : (
        <>
          <div className="text-xs text-gray-400 mb-2">{'\u627e\u5230'} {filtered.length} {'\u5bb6\u9152\u5e97'}</div>
          <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
            {filtered.map((hotel) => (
              <button key={hotel.id} onClick={() => onSelect(hotel)}
                className={'text-left w-full border rounded-lg p-3 transition-colors hover:shadow ' + (selectedHotel?.id === hotel.id ? 'border-blue-400 bg-blue-50 shadow' : 'border-gray-200 bg-white hover:border-gray-300')}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm text-gray-800 truncate flex-1">{hotel.name}</div>
                  {hotel.brand && <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded shrink-0">{hotel.brand}</span>}
                </div>
                {hotel.address && <div className="text-xs text-gray-400 mt-0.5 truncate">{hotel.address}</div>}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {hotel.lowestPrice != null && hotel.lowestPrice > 0 && <span className="text-red-500 font-medium">{'\u8d77\u4ef7'} \u00a5{hotel.lowestPrice}</span>}
                  {hotel.commentScore && <span>{'\u8bc4\u5206'} {hotel.commentScore}</span>}
                  {hotel.distance && <span>{hotel.distance}</span>}
                  {!hotel.lowestPrice && !hotel.commentScore && !hotel.distance && <span>ID: {hotel.id}</span>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}