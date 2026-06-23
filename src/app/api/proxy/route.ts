import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url, rawRequest } = await request.json();

    if (!url || !rawRequest) {
      return NextResponse.json({ success: false, error: '\u8bf7\u63d0\u4f9b url \u548c rawRequest' }, { status: 400 });
    }

    // Parse raw HTTP request
    // First line: METHOD /path HTTP/1.1
    const lines = rawRequest.split('\n');
    let method = 'GET';
    let path = '';
    const headers: Record<string, string> = {};
    let bodyStr = '';
    let parsingHeaders = true;
    let headerLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\r$/, '');
      
      if (i === 0) {
        // Parse request line: POST /path HTTP/1.1
        const parts = line.split(' ');
        if (parts.length >= 2) {
          method = parts[0].toUpperCase();
          path = parts[1];
        }
        continue;
      }

      if (parsingHeaders) {
        if (line.trim() === '') {
          parsingHeaders = false;
          continue;
        }
        headerLines.push(line);
      } else {
        bodyStr += (bodyStr ? '\n' : '') + line;
      }
    }

    // Parse headers
    for (const hLine of headerLines) {
      const colonIdx = hLine.indexOf(':');
      if (colonIdx > 0) {
        const key = hLine.substring(0, colonIdx).trim();
        const value = hLine.substring(colonIdx + 1).trim();
        if (key && key.toLowerCase() !== 'content-length' && key.toLowerCase() !== 'host') {
          headers[key] = value;
        }
      }
    }

    // Build target URL
    const baseUrl = url.replace(/\/+$/, '');
    const targetUrl = baseUrl + path;

    // Build fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: {
        ...headers,
        'Host': new URL(baseUrl).host,
      },
    };

    // Add body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyStr) {
      try {
        // Try to parse as JSON to validate, send as-is
        JSON.parse(bodyStr);
        fetchOptions.body = bodyStr;
        if (!headers['Content-Type']) {
          (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }
      } catch {
        fetchOptions.body = bodyStr;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    let responseData: unknown;
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '\u8bf7\u6c42\u5931\u8d25';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
