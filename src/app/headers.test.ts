// src/app/headers.test.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ParsedHeadersMap {
  [routePattern: string]: Record<string, string>;
}

/**
 * 解析 Cloudflare Pages 的 _headers 語法結構
 */
function parseCloudflareHeaders(rawContent: string): ParsedHeadersMap {
  const result: ParsedHeadersMap = {};
  let currentRoute: string | null = null;

  for (const rawLine of rawContent.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 非縮排行代表路由規則（例如 "/*" 或 "/assets/*"）
    const isIndented = rawLine.startsWith(' ') || rawLine.startsWith('\t');
    if (!isIndented) {
      currentRoute = trimmed;
      if (!result[currentRoute]) {
        result[currentRoute] = {};
      }
      continue;
    }

    if (!currentRoute) {
      throw new Error(`Header line appeared before any route path: "${rawLine}"`);
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid header syntax in _headers: "${rawLine}"`);
    }

    const headerName = trimmed.slice(0, colonIndex).trim().toLowerCase();
    const headerValue = trimmed.slice(colonIndex + 1).trim();
    result[currentRoute][headerName] = headerValue;
  }

  return result;
}

describe('public/_headers - 安全標頭、Google OAuth 彈窗相容性與快取策略檢查', () => {
  const headersPath = resolve(process.cwd(), 'public/_headers');
  const rawHeaders = readFileSync(headersPath, 'utf-8');
  const parsed = parseCloudflareHeaders(rawHeaders);
  const globalHeaders = parsed['/*'] ?? {};
  const assetHeaders = parsed['/assets/*'] ?? {};

  it('1. 全域路由 /* 必須具備基礎防嵌入與 MIME 防護標頭', () => {
    expect(globalHeaders['x-content-type-options']).toBe('nosniff');
    expect(globalHeaders['x-frame-options']).toBe('DENY');
    expect(globalHeaders['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('2. Cross-Origin-Opener-Policy 必須維持 same-origin-allow-popups，確保 Google OAuth 與 Picker 彈窗可回傳結果', () => {
    // 若設為 same-origin 會切斷 window.opener，導致 GIS 登入彈窗無法透過 postMessage 回傳 Access Token
    expect(globalHeaders['cross-origin-opener-policy']).toBe(
      'same-origin-allow-popups'
    );
  });

  it('3. Permissions-Policy 必須徹底關閉定位（geolocation=()）及相機、麥克風等非必要權限', () => {
    const permissions = globalHeaders['permissions-policy'];
    expect(permissions).toBeDefined();

    // 已移除最愛地點功能，嚴禁殘留 geolocation=(self) 或 geolocation=*
    expect(permissions).toContain('geolocation=()');
    expect(permissions).not.toContain('geolocation=(self)');

    expect(permissions).toContain('camera=()');
    expect(permissions).toContain('microphone=()');
  });

  it('4. 快取策略：僅含雜湊的 /assets/* 長期快取，全域 /* 不可設定 immutable 以免卡死舊版 HTML', () => {
    expect(assetHeaders['cache-control']).toBe(
      'public, max-age=31536000, immutable'
    );

    const globalCache = globalHeaders['cache-control'] ?? '';
    expect(globalCache).not.toContain('immutable');
  });

  it('5. 未經完整網域驗證前不應殘留舊版地點搜尋 Proxy (workers.dev) 白名單', () => {
    expect(rawHeaders).not.toContain('workers.dev');
  });
});
