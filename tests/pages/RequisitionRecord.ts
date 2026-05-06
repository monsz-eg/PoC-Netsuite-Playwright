import { expect, Page } from '@playwright/test';
import { today } from '../utils/dateUtils';
import { BasePage } from './BasePage';

export class RequisitionRecord extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToNewRequisition(): Promise<void> {
    await this.navigateTo('/app/accounting/transactions/purchreq.nl');
    await this.waitForNsApi();
    await this.waitForFormReady();
    // Employee Center role loads additional role-center scripts after initial form
    // render — a second context replacement can occur after waitForFormReady returns.
    await this.page.waitForLoadState('networkidle');
    await this.waitForNsApi();
    await this.ensureFormInited();
  }

  // DOM-based assertions used throughout this page object — egEmployeeCenter role
  // continuously replaces the JS context (role-center background scripts), so
  // nlapiGetFieldValue / waitForFunction would throw "Target closed" immediately.
  // Playwright's expect() retries against the live DOM and survives context replacements.

  async verifyRequestorPrepopulated(): Promise<void> {
    // NS Requisition renders the employee (Requestor) field as a combobox widget —
    // id="employee_display" does not exist; match by ARIA role + accessible name instead.
    await expect(this.page.getByRole('combobox', { name: /Requestor/ })).not.toHaveValue('');
  }

  async verifyDateIsToday(): Promise<void> {
    await expect(this.page.locator('[name="trandate"]')).toHaveValue(today());
  }

  async verifySubsidiaryPrepopulated(): Promise<void> {
    // NS Requisition renders subsidiary as a plain textbox (<Type then tab> typeahead) —
    // id="subsidiary_display" does not exist; match by ARIA role + accessible name instead.
    await expect(this.page.getByRole('textbox', { name: /Subsidiary/ })).not.toHaveValue('');
  }

  async verifyCurrencyPrepopulated(): Promise<void> {
    // currency is a hidden <input> — use toHaveValue (not toHaveText) for hidden inputs
    await expect(this.page.locator('[id="currency"]')).not.toHaveValue('');
  }

  // locator.check() hangs under egEmployeeCenter (internal retry intercepts context close).
  // evaluate() finds the checkbox coordinates, then mouse.click() fires a trusted DOM click.
  async checkForElectronicBankPayment(): Promise<void> {
    const deadline = Date.now() + 30000;
    while (true) {
      try {
        const coords = await this.page.evaluate(() => {
          const g = globalThis as any;
          const allCBs = Array.from(g.document?.querySelectorAll('input[type="checkbox"]') ?? []);
          const cb = allCBs.find((el: any) => {
            const labelId = el.getAttribute('aria-labelledby') || '';
            const label = g.document?.getElementById(labelId);
            return (
              label?.textContent?.includes('For Electronic Bank Payment') ||
              el.name?.toLowerCase().includes('for_ep_eft') ||
              el.id?.toLowerCase().includes('for_ep_eft')
            );
          }) as any;
          if (!cb) return null;
          const rect = cb.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        });
        if (!coords) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        await this.page.mouse.click(coords.x, coords.y);
        break;
      } catch (e: any) {
        if (!(e?.message ?? '').includes('closed') || Date.now() >= deadline) throw e;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    await this.page.waitForTimeout(500);
  }

  // PDF Step 8: Verify the For Electronic Bank Payment checkbox is ticked.
  // DOM-based — survives egEmployeeCenter context replacement.
  async verifyForElectronicBankPaymentChecked(): Promise<void> {
    await expect(
      this.page.getByRole('checkbox', { name: /For Electronic Bank Payment/ }),
    ).toBeChecked({ timeout: 10000 });
  }

  // Mirrors InvoiceRecord.addLineItem exactly, with one adaptation:
  // egEmployeeCenter context replacement hides #item_item_display (active cell resets).
  // evaluate() calls nlapiSelectNewLineItem + focus to restore visibility before clicking.
  // PR form has no taxcode — wait for quantity (non-empty) as the post-Tab load signal.
  async addLineItem(itemText: string): Promise<void> {
    // Always use focus() to open the full item-picker popup — more reliable than
    // itemInput.click() which opens the inline dropdown that closes unpredictably.
    const typeAndSearch = async () => {
      await this.page.evaluate(() => {
        const g = globalThis as any;
        try {
          g.nlapiSelectNewLineItem('item');
        } catch {}
        const input = g.document?.querySelector('#item_item_display') as any;
        if (input) {
          input.style.display = 'block';
          input.value = '';
          input.scrollIntoView();
          input.focus();
        }
      });
      await this.page.locator('#item_item_display').pressSequentially(itemText, { delay: 50 });
      await this.page.waitForLoadState('networkidle');
      await new Promise((r) => setTimeout(r, 500)); // let picker results render
    };

    await typeAndSearch();

    const deadline = Date.now() + 60000;
    let selected = false;
    while (!selected && Date.now() < deadline) {
      try {
        const coords = await this.page.evaluate((text: string) => {
          const g = globalThis as any;
          const all = Array.from(g.document?.querySelectorAll('*') ?? []);
          const match = all.find((el: any) => {
            if (el.innerText?.trim() !== text) return false;
            if ((el.children?.length ?? 0) > 3) return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          if (!match) return null;
          const rect = (match as any).getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }, itemText);

        if (coords) {
          await this.page.mouse.click(coords.x, coords.y);
          await this.page.keyboard.press('Tab');
          selected = true;
        } else {
          // Picker results not visible — re-type to reopen
          await typeAndSearch();
        }
      } catch {
        try {
          await typeAndSearch();
        } catch {
          /* ignore */
        }
      }
      if (!selected) await new Promise((r) => setTimeout(r, 300));
    }

    await expect(this.page.locator('#hddn_item_department_fs')).not.toHaveValue('', {
      timeout: 30000,
    });
    await this.page.waitForLoadState('networkidle');
    await this.ensureFormInited();
  }

  async verifyQuantityDefaulted(): Promise<void> {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      try {
        const qty = await this.page.evaluate(() =>
          (globalThis as any).nlapiGetLineItemValue('item', 'quantity', 1),
        );
        if (qty != null && parseFloat(qty) === 1) return;
      } catch {
        /* context replaced — retry */
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error('verifyQuantityDefaulted: quantity is not 1');
  }

  // PDF Step 11: Tab from item input to reach External Description, type, Tab to commit.
  // Uses keyboard navigation instead of cell coordinate lookup.
  async setLineItemExternalDescription(text: string): Promise<void> {
    // Refocus item input so Tab navigation starts from a known position
    await this.page.evaluate(() => {
      const g = globalThis as any;
      const input = g.document?.querySelector('#item_item_display') as any;
      if (input) input.focus();
    });
    await new Promise((r) => setTimeout(r, 200));
    // Tab forward until External Description textarea (TEXTAREA, id="description").
    // Known sequence: Tab#1=Quantity, Tab#2=Units, Tab#3=description TEXTAREA.
    for (let i = 0; i < 6; i++) {
      await this.page.keyboard.press('Tab');
      await new Promise((r) => setTimeout(r, 100));
      const focused = await this.page
        .evaluate(() => {
          const el = (globalThis as any).document?.activeElement as any;
          return { tag: el?.tagName };
        })
        .catch(() => null);
      if (focused?.tag === 'TEXTAREA') {
        await this.page.keyboard.type(text);
        await this.page.keyboard.press('Tab'); // commit — moves focus to Estimated Rate
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(300);
        return;
      }
    }
    throw new Error(
      'setLineItemExternalDescription: External Description TEXTAREA not found within 6 Tab presses',
    );
  }

  // PDF Step 11: field DOM id is "description" (standard NS field, not custcol_*).
  async verifyExternalDescriptionFilled(text: string): Promise<void> {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      try {
        const v = await this.page.evaluate(() =>
          (globalThis as any).nlapiGetLineItemValue('item', 'description', 1),
        );
        if (v === text) return;
      } catch {
        /* context replaced — retry */
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`verifyExternalDescriptionFilled: expected "${text}"`);
  }

  // PDF Step 12: After setLineItemExternalDescription Tab-commits, focus is on
  // the next editable field (Estimated Rate). Log current focus then type rate there.
  // NO refocus — avoids accidentally navigating into description or other fields.
  async setLineItemEstimatedRate(rate: string): Promise<void> {
    // After setLineItemExternalDescription Tab-commits, focus is on Estimated Rate.
    const active = await this.page
      .evaluate(() => {
        const el = (globalThis as any).document?.activeElement as any;
        return { id: el?.id ?? '', tag: el?.tagName };
      })
      .catch(() => null);

    if (active?.tag === 'INPUT' || active?.tag === 'TEXTAREA') {
      // Clear the field via DOM (avoids NS global shortcuts like Ctrl+A)
      await this.page.evaluate(() => {
        const el = (globalThis as any).document?.activeElement as any;
        if (el) el.value = '';
      });
      await this.page.keyboard.type(rate);
      await this.page.keyboard.press('Tab');
    } else {
      // Focus was reset (context replacement) — use NS API as fallback
      await this.page.evaluate((v: string) => {
        (globalThis as any).nlapiSetCurrentLineItemValue('item', 'estimatedrate', v, true);
      }, rate);
    }
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  // PDF Step 12 (part 1): field DOM id is "estimatedrate_formattedValue" →
  // NS field id is "estimatedrate" (standard, not custcol_*).
  async verifyEstimatedRateFilled(rate: string): Promise<void> {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      try {
        const v = await this.page.evaluate(() =>
          (globalThis as any).nlapiGetLineItemValue('item', 'estimatedrate', 1),
        );
        if (v != null && parseFloat(v) === parseFloat(rate)) return;
      } catch {
        /* context replaced — retry */
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`verifyEstimatedRateFilled: expected ${rate}`);
  }

  // PDF Step 12 (part 2): Estimated Amount = Quantity × Estimated Rate.
  // Verifies NS auto-calculated the amount once rate was set.
  async verifyEstimatedAmountCalculated(expectedAmount: string): Promise<void> {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      try {
        const v = await this.page.evaluate(() =>
          (globalThis as any).nlapiGetLineItemValue('item', 'estimatedamount', 1),
        );
        if (v != null && parseFloat(v) === parseFloat(expectedAmount)) return;
      } catch {
        /* context replaced — retry */
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`verifyEstimatedAmountCalculated: expected ${expectedAmount}`);
  }

  async verifyDepartmentPrepopulated(): Promise<void> {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      try {
        const dept = await this.page.evaluate(() =>
          (globalThis as any).nlapiGetLineItemValue('item', 'department', 1),
        );
        if (dept) return;
      } catch {
        /* context replaced — retry */
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error('verifyDepartmentPrepopulated: department is not set on line 1');
  }

  async addItem(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    await this.ensureFormInited();
    // Get Add button coordinates and use mouse.click (trusted event) — same pattern
    // as addLineItem. locator.click() retries internally on context replacement and
    // can hang/no-op silently.
    const coords = await this.page.evaluate(() => {
      const btn = (globalThis as any).document?.querySelector('[name="item_addedit"]') as any;
      if (!btn) return null;
      btn.scrollIntoView();
      const rect = btn.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    if (!coords) throw new Error('addItem: Add button [name="item_addedit"] not found');
    await this.page.mouse.click(coords.x, coords.y);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});

    // Verify the line was actually committed to the sublist by checking the rendered
    // Total field — it goes from "0,00" to a non-zero amount once a line is added.
    // DOM-based, survives context replacement (unlike nlapiGetLineItemCount which throws).
    const totalLocator = this.page.locator(
      '[data-field-name="estimatedtotal"] [data-nsps-type="field_input"]',
    );
    await expect(totalLocator).not.toHaveText(/^0,?0*$/, { timeout: 20000 });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
  }

  // Custom field has no `_display` id; match by ARIA role + accessible name
  // ("Transaction - created by", with hyphen).
  async verifyTransactionCreatedBy(): Promise<void> {
    await expect(
      this.page.getByRole('textbox', { name: /Transaction.*created by/ }),
    ).not.toHaveValue('');
  }

  async save(): Promise<void> {
    await this.ensureFormInited();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    const saveBtn = this.page.locator('[id="btn_multibutton_submitter"]');
    await saveBtn.waitFor({ state: 'visible' });
    await saveBtn.click({ force: true });
    await this.page.waitForURL(/[?&]id=\d+/, { timeout: 60000 });
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
  }

  async verifyRequisitionNumberGenerated(): Promise<void> {
    // Prefix varies by subsidiary: EGPL (Poland), EGDK (Denmark), etc.
    await expect(
      this.page.locator('[data-field-name="tranid"] [data-nsps-type="field_input"]'),
    ).toHaveText(/EG[A-Z]+\d+/);
  }

  async verifyApprovalStatusPendingApproval(): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="approvalstatus"] [data-nsps-type="field_input"]'),
    ).toHaveText('Pending Approval');
  }

  async verifyNextApproverSet(): Promise<void> {
    // toHaveText('') normalizes whitespace — the span renders as "\n  \n" when empty,
    // which collapses to "" and makes not.toHaveText('') fail spuriously.
    // toHaveText(/.+/) requires at least one visible character after normalization.
    // 15 s timeout: NS approval workflow assigns the approver asynchronously post-save.
    await expect(
      this.page.locator('[data-field-name="nextapprover"] [data-nsps-type="field_input"]'),
    ).toHaveText(/.+/, { timeout: 15000 });
  }
}
