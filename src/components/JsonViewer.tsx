'use client';

import { useState } from 'react';

interface JsonViewerProps {
  data: unknown;
  title?: string;
  buttonLabel?: string;
}

export default function JsonViewer({ data, title, buttonLabel }: JsonViewerProps) {
  const [open, setOpen] = useState(false);

  if (!data) return null;

  const formatted = (() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  })();

  return (
    <div className='mt-2'>
      <button
        onClick={() => setOpen(!open)}
        className='text-xs text-gray-400 hover:text-gray-600 font-mono transition-colors'
      >
        {open ? '\u25bc' : '\u25b6'} {buttonLabel || 'JSON'}
      </button>
      {open && (
        <div className='mt-1 bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto'>
          {title && <div className='text-xs text-gray-400 mb-1 font-mono'>{title}</div>}
          <pre className='text-xs leading-relaxed whitespace-pre-wrap break-all'>{formatted}</pre>
          <button
            onClick={() => { navigator.clipboard?.writeText(formatted); }}
            className='mt-1 text-xs text-blue-400 hover:text-blue-300 transition-colors'
          >
            {'\u590d\u5236'}
          </button>
        </div>
      )}
    </div>
  );
}