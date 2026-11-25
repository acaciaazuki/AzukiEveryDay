// src/pages/privacy/policy.test.ts
import { describe, expect, it } from 'vitest';
import { PRIVACY_VERSION } from '../../core/consent';
import {
  DEFAULT_SUPPORT_EMAIL,
  getPrivacyPolicy,
  type PrivacyLocale,
  UPDATED_DATE,
} from './policy';

describe('privacy/policy.ts - 三語結構 100% 對齊與新版隱私邊界驗證', () => {
  const officialLocales: PrivacyLocale[] = ['zh-TW', 'ja', 'en'];

  it('1. UPDATED_DATE 直接沿用 consent.ts 的 PRIVACY_VERSION', () => {
    expect(UPDATED_DATE).toBe(PRIVACY_VERSION);
    for (const loc of officialLocales) {
      const doc = getPrivacyPolicy(loc);
      expect(doc.updatedDate).toBe(PRIVACY_VERSION);
      expect(doc.fallbackNotice).toBeUndefined();
    }
  });

  it('2. 繁中、日文、英文三語的章節數量、ID、段落數與條列數 100% 完全對齊', () => {
    const zh = getPrivacyPolicy('zh-TW');
    const ja = getPrivacyPolicy('ja');
    const en = getPrivacyPolicy('en');

    expect(zh.sections.length).toBe(7);
    expect(ja.sections.length).toBe(zh.sections.length);
    expect(en.sections.length).toBe(zh.sections.length);

    const extractShape = (doc: ReturnType<typeof getPrivacyPolicy>) =>
      doc.sections.map((sec) => ({
        id: sec.id,
        paragraphCount: sec.paragraphs.length,
        bulletCount: sec.bullets?.length ?? 0,
      }));

    expect(extractShape(ja)).toEqual(extractShape(zh));
    expect(extractShape(en)).toEqual(extractShape(zh));

    // 確認沒有任何空字串段落或空條列
    for (const doc of [zh, ja, en]) {
      expect(doc.title.trim().length).toBeGreaterThan(0);
      expect(doc.subtitle.trim().length).toBeGreaterThan(0);
      for (const sec of doc.sections) {
        expect(sec.heading.trim().length).toBeGreaterThan(0);
        for (const p of sec.paragraphs) {
          expect(p.trim().length).toBeGreaterThan(0);
        }
        for (const b of sec.bullets ?? []) {
          expect(b.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('3. 韓文、法文、德文介面設定自動退回英文版政策並顯示 fallbackNotice', () => {
    for (const appLocale of ['ko', 'fr', 'de']) {
      const doc = getPrivacyPolicy(appLocale);
      expect(doc.locale).toBe('en');
      expect(doc.fallbackNotice).toBeDefined();
      expect(doc.sections.length).toBe(7);
    }
  });

  it('4. 已徹底移除舊版「最愛地點、定位搜尋 Proxy」相關字眼，並包含新版關鍵隱私承諾', () => {
    const forbiddenLegacyTerms = [
      'VITE_PLACES_PROXY_URL',
      'workers.dev',
      '最愛地點',
      '地點搜尋 Proxy',
      'お気に入りスポット',
      'Places Proxy',
    ];

    const requiredCoreTerms = [
      'acacia_data_v2.json',
      'drive.file',
      '30',
      '180',
      DEFAULT_SUPPORT_EMAIL,
    ];

    for (const loc of officialLocales) {
      const serialized = JSON.stringify(getPrivacyPolicy(loc));

      for (const badTerm of forbiddenLegacyTerms) {
        expect(serialized).not.toContain(badTerm);
      }

      for (const reqTerm of requiredCoreTerms) {
        expect(serialized).toContain(reqTerm);
      }
    }
  });

  it('5. 支援自訂支援信箱注入（對應 VITE_SUPPORT_EMAIL）', () => {
    const customDoc = getPrivacyPolicy('zh-TW', 'help@example.org');
    const contactSection = customDoc.sections.find((s) => s.id === 'contact');
    expect(JSON.stringify(contactSection)).toContain('help@example.org');
  });
});
