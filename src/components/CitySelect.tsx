'use client';

import { useState, useEffect, useMemo } from 'react';

export interface City {
  id: string;
  name: string;
  pinyin: string;
}

interface CitySelectProps {
  onSelect: (city: City) => void;
  selectedCity?: City | null;
}

export default function CitySelect({ onSelect, selectedCity }: CitySelectProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/cities')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) setCities(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return cities.slice(0, 20);
    const q = query.toLowerCase();
    return cities.filter(
      (c) => c.name.includes(q) || c.pinyin.includes(q)
    );
  }, [query, cities]);

  function btnClass(cityId: string): string {
    const base = 'px-3 py-1.5 rounded-full text-sm font-medium transition-colors';
    const active = selectedCity?.id === cityId
      ? 'bg-blue-600 text-white shadow'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    return base + ' ' + active;
  }

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          className="w-full border rounded-lg px-4 py-2.5 pl-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          placeholder="搜索城市名称或拼音..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 mt-2">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
          <span className="ml-2 text-sm text-gray-500">加载城市列表...</span>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2 max-h-60 overflow-y-auto">
          {filtered.map((city) => (
            <button
              key={city.id}
              onClick={() => onSelect(city)}
              className={btnClass(city.id)}
            >
              {city.name}
            </button>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-gray-400 mt-2">未找到匹配的城市</p>
      )}

      {!loading && !query && (
        <p className="text-xs text-gray-400 mt-2">共 {cities.length} 个城市，输入搜索更多</p>
      )}
    </div>
  );
}