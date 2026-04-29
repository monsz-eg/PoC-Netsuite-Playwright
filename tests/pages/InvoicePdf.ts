import { BrowserContext, expect } from '@playwright/test';

export async function validatePdfPage(
  browserContext: BrowserContext,
  pdfUrl: string,
  minimumBytes = 1000,
): Promise<void> {
  expect(pdfUrl).toMatch(/hotprint\.nl/);
  expect(pdfUrl).toMatch(/incustlocale=T/);

  const pdfResponse = await browserContext.request.get(pdfUrl);
  expect(pdfResponse.ok()).toBeTruthy();
  expect(pdfResponse.headers()['content-type']).toContain('application/pdf');

  const pdfBody = await pdfResponse.body();
  expect(pdfBody.length).toBeGreaterThan(minimumBytes);
}
