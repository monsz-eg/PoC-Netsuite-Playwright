import { expect, Page, Route } from '@playwright/test';
import { today } from '../utils/dateUtils';
import { BasePage } from './BasePage';

type InvoiceLineInput = {
  itemText: string;
  description: string;
  quantity: string;
  rate: string;
  mainProductId: string;
  subProductId: string;
  productItemId: string;
  revenueCategoryId: string;
  departmentId: string;
  revStartDate: string;
  revEndDate: string;
};

export class InvoiceRecord extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToInvoice(): Promise<void> {
    await this.navigateTo(`/app/accounting/transactions/custinvc.nl`);
    await this.waitForNsApi();
    await this.waitForFormReady();
  }

  async setPONumber(value: string): Promise<void> {
    await this.page.locator('[name="otherrefnum"]').fill(value);
  }

  async verifyPONumber(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="otherrefnum"] [data-nsps-type="field_input"]'),
    ).toHaveText(expected);
  }

  async setMemo(text: string): Promise<void> {
    await this.page.evaluate((v) => (globalThis as any).nlapiSetFieldValue('memo', v), text);
  }

  // nlapiSetFieldValue for entity does not trigger the client-side fieldChanged chain
  // that populates Subsidiary in the Billing Responsible role — same crash category as
  // nlapiSetCurrentLineItemValue on item. Use native type-ahead instead: type into the
  // display input, wait for networkidle (dropdown resolves), then Tab to confirm.
  // Tab triggers a full page reload; waitForNavigation catches it. After reload,
  // poll Subsidiary as confirmation that all dependent-field scripts completed.
  async setCustomer(displayText: string): Promise<void> {
    const entityInput = this.page.locator('[id="entity_display"]');
    await entityInput.click();
    await entityInput.pressSequentially(displayText, { delay: 50 });
    // NS sometimes auto-commits on a single typeahead match and replaces the JS context
    // before we reach Tab. Detect this by catching only the "closed" error from
    // waitForLoadState; real timeouts are re-thrown. If closed, Tab is skipped — NS
    // already committed the selection. waitForNsApi retries through the context-replacement
    // window in either path.
    let needsTab = true;
    try {
      await this.page.waitForLoadState('networkidle');
    } catch (e: any) {
      if ((e?.message ?? '').includes('closed')) {
        needsTab = false;
      } else {
        throw e;
      }
    }
    if (needsTab) {
      await this.page.keyboard.press('Tab');
    }
    await this.waitForNsApi();
    await this.page.waitForFunction(
      () => {
        try {
          return !!(globalThis as any).nlapiGetFieldValue('subsidiary');
        } catch {
          return false;
        }
      },
      { timeout: 30000 },
    );
    await this.waitForFormReady();
  }

  async verifyOrderedBy(expected: string): Promise<void> {
    await expect(
      this.page.locator(
        '[data-field-name="custbody_eg_ordered_by"] [data-nsps-type="field_input"]',
      ),
    ).toHaveText(expected);
  }

  async verifyMemo(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="memo"] [data-nsps-type="field_input"]'),
    ).toHaveText(expected);
  }

  async verifyBillToCustomer(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="entity"] [data-nsps-type="field_input"]'),
    ).toHaveText(expected);
  }

  async verifySubsidiaryPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldValue('subsidiary', expected);
  }

  async verifySubsidiary(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="subsidiary"] [data-nsps-type="field_input"]'),
    ).toHaveText(expected);
  }

  async verifyCurrency(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="currency"] [data-nsps-type="field_input"]'),
    ).toHaveText(expected);
  }

  // nlapiSetCurrentLineItemValue crashes on checkvalid BEFORE storing the item value
  // in the Billing Responsible role context (confirmed: val=null after catch).
  // Use native Playwright type-ahead + Tab to mimic user input — this triggers NS
  // resolution and auto-population of dependent fields (tax code, units, price level).
  async addLineItem(itemText: string): Promise<void> {
    const itemInput = this.page.locator('#item_item_display');
    await itemInput.scrollIntoViewIfNeeded();
    await itemInput.click();
    await itemInput.pressSequentially(itemText, { delay: 50 });
    // NS debounces ~300ms after the last keystroke, then fires an AJAX search.
    // networkidle resolves once all pending requests complete + 500ms of silence,
    // ensuring the type-ahead dropdown has results before selection.
    await this.waitForNetworkIdle();
    // Tab commits the typeahead. For items where multiple entries share the same
    // prefix, NS opens a disambiguation popup with results pre-loaded after Tab.
    await this.page.keyboard.press('Tab');
    await this.waitForNetworkIdle();
    // After commit, NS fires AJAX to load item details and
    // auto-populate dependent fields. The popup-commit path replaces the JS
    // execution context mid-AJAX; retry on "Target closed" until the deadline.
    const taxcodeDeadline = Date.now() + 20000;
    while (true) {
      try {
        await this.page.waitForFunction(
          () => {
            try {
              return !!(globalThis as any).nlapiGetCurrentLineItemValue('item', 'taxcode');
            } catch {
              return false;
            }
          },
          { timeout: 15000 },
        );
        break;
      } catch (e: any) {
        if (!(e?.message ?? '').includes('closed') || Date.now() >= taxcodeDeadline) throw e;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    await this.waitForNetworkIdle();
    await this.ensureFormInited();
  }

  async setLineItemDescription(text: string): Promise<void> {
    await this.page.evaluate((v) => {
      const g = globalThis as any;
      const orig = g.nlapiFieldChanged;
      g.nlapiFieldChanged = () => {};
      try {
        g.nlapiSetCurrentLineItemValue('item', 'description', v, true);
      } finally {
        g.nlapiFieldChanged = orig;
      }
    }, text);
    await this.page.waitForTimeout(1000);
  }

  async setLineItemQuantity(quantity: string): Promise<void> {
    await this.page.evaluate((v) => {
      const g = globalThis as any;
      const orig = g.nlapiFieldChanged;
      g.nlapiFieldChanged = () => {};
      try {
        g.nlapiSetCurrentLineItemValue('item', 'quantity', v, true);
      } finally {
        g.nlapiFieldChanged = orig;
      }
    }, quantity);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  // Use firefieldchanged=true with nlapiFieldChanged stubbed — same pattern as other
  // setters — to run NS's internal pricing cascade (grossamt/tax1amt/amount).
  // Wait for amount > 0 to confirm pricing completed before setting cseg fields.
  async setLineItemRate(rate: string): Promise<void> {
    await this.page.evaluate((r) => {
      const g = globalThis as any;
      const orig = g.nlapiFieldChanged;
      g.nlapiFieldChanged = () => {};
      try {
        g.nlapiSetCurrentLineItemValue('item', 'rate', r, true);
      } finally {
        g.nlapiFieldChanged = orig;
      }
    }, rate);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForFunction(
      () => {
        try {
          const amount = (globalThis as any).nlapiGetCurrentLineItemValue('item', 'amount');
          return !!amount && Number(amount) > 0;
        } catch {
          return false;
        }
      },
      { timeout: 15000 },
    );
    await this.page.waitForTimeout(1000);
  }

  // Custom segment fields (cseg_*) in the item sublist are backed by hidden inputs
  // with associated global Synccseg_* functions that write values into NS's model.
  // Temporarily stub nlapiFieldChanged during Sync to prevent checkvalid crash
  // and dependent-field rollback.
  private async setCsegLineItemValue(fieldName: string, id: string): Promise<void> {
    await this.page.locator(`[name="${fieldName}"]`).waitFor({ state: 'attached', timeout: 10000 });
    await this.page.evaluate(
      ({ field, sync, val }) => {
        const el = (globalThis as any).document.querySelector(`[name="${field}"]`);
        if (el) {
          el.value = val;
          el.isvalid = true;
        }
        const orig = (globalThis as any).nlapiFieldChanged;
        (globalThis as any).nlapiFieldChanged = () => {};
        try {
          (globalThis as any)[sync](true);
        } finally {
          (globalThis as any).nlapiFieldChanged = orig;
        }
      },
      { field: fieldName, sync: `Sync${fieldName}`, val: id },
    );
    await this.page.waitForTimeout(1000);
  }

  async setLineItemMainProduct(id: string): Promise<void> {
    await this.setCsegLineItemValue('cseg_eg_main_prod', id);
  }

  async setLineItemSubProduct(id: string): Promise<void> {
    await this.setCsegLineItemValue('cseg_eg_sub_prod', id);
  }

  async setLineItemProductItem(id: string): Promise<void> {
    await this.setCsegLineItemValue('cseg_eg_prod_item', id);
  }

  async setLineItemRevenueCategory(id: string): Promise<void> {
    await this.setCsegLineItemValue('cseg_eg_rev_categ', id);
  }

  async setLineItemRevStartDate(date: string): Promise<void> {
    await this.page.evaluate((v) => {
      const g = globalThis as any;
      const orig = g.nlapiFieldChanged;
      g.nlapiFieldChanged = () => {};
      try {
        g.nlapiSetCurrentLineItemValue('item', 'custcol_eg_rev_rec_start', v, true);
      } finally {
        g.nlapiFieldChanged = orig;
      }
    }, date);
    await this.page.waitForTimeout(1000);
  }

  async setLineItemRevEndDate(date: string): Promise<void> {
    await this.page.evaluate((v) => {
      const g = globalThis as any;
      const orig = g.nlapiFieldChanged;
      g.nlapiFieldChanged = () => {};
      try {
        g.nlapiSetCurrentLineItemValue('item', 'custcol_eg_rev_rec_end', v, true);
      } finally {
        g.nlapiFieldChanged = orig;
      }
    }, date);
    await this.page.waitForTimeout(1000);
  }

  // Set the hidden input directly and dispatch change — the onchange handler
  // validates and stores via Syncdepartmentitem. Use the sublist-specific ID to
  // avoid matching the header-level department input.
  async setLineItemDepartment(id: string): Promise<void> {
    await this.page
      .locator('#hddn_item_department_fs')
      .waitFor({ state: 'attached', timeout: 10000 });
    await this.page.evaluate((val) => {
      try {
        const el = (globalThis as any).document.querySelector('#hddn_item_department_fs');
        if (el) {
          el.value = val;
          el.isvalid = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch {
        // onchange may crash at nlapiFieldChanged; value is stored before crash.
      }
    }, id);
    await this.page.waitForTimeout(1000);
  }

  // NS may replace the JS context during Add processing — retry on "Target closed".
  private async waitForLineItemAdded(): Promise<void> {
    const deadline = Date.now() + 20000;
    while (true) {
      try {
        await this.page.waitForFunction(
          () => {
            try {
              return (globalThis as any).nlapiGetLineItemCount('item') >= 1;
            } catch {
              return false;
            }
          },
          { timeout: 15000 },
        );
        break;
      } catch (e: any) {
        if (!(e?.message ?? '').includes('closed') || Date.now() >= deadline) throw e;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // After the Add click, NS commits the line and runs async item-options
  // initialization. Wait for the committed line count to confirm the commit
  // completed, then wait for any post-commit AJAX to settle before saving.
  async addItem(): Promise<void> {
    await this.waitForNetworkIdle();
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    await this.ensureFormInited();
    const addBtn = this.page.locator('[name="item_addedit"]');
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();
    await this.waitForNetworkIdle();
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    await this.waitForLineItemAdded();
    await this.waitForNetworkIdle();
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
  }

  async addConfiguredLineItem(line: InvoiceLineInput): Promise<void> {
    await this.addLineItem(line.itemText);
    await this.setLineItemDescription(line.description);
    await this.setLineItemQuantity(line.quantity);
    await this.setLineItemRate(line.rate);
    await this.setLineItemMainProduct(line.mainProductId);
    await this.setLineItemSubProduct(line.subProductId);
    await this.setLineItemProductItem(line.productItemId);
    await this.setLineItemRevenueCategory(line.revenueCategoryId);
    await this.setLineItemDepartment(line.departmentId);
    await this.setLineItemRevStartDate(line.revStartDate);
    await this.setLineItemRevEndDate(line.revEndDate);
    await this.addItem();
  }

  // The A/R account field is on the lazy-loaded Accounting tab — nlapiSetFieldValue
  // doesn't work because options aren't loaded. Set the hidden inputs directly.
  async setAccount(id: string): Promise<void> {
    await this.page.evaluate((val) => {
      const g = globalThis as any;
      // Main hidden input read by the form submission
      const main = g.document.querySelector("input[name='account'][id='account']");
      if (main) main.value = val;
      // Dropdown hidden input (Accounting tab variant)
      const dropdown = g.document.querySelector('#hddn_account_24');
      if (dropdown) dropdown.value = val;
    }, id);
  }

  override async save(): Promise<void> {
    await this.ensureFormInited();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    const saveBtn = this.page.locator('[id="btn_multibutton_submitter"]');
    await saveBtn.waitFor({ state: 'visible' });
    await saveBtn.click({ force: true });
    // NS save posts the form and redirects to the saved record URL (?id=).
    // Race against known NS error pages so we fail fast instead of waiting 60s.
    await Promise.race([
      this.page.waitForURL(/[?&]id=\d+/, { timeout: 60000 }),
      this.page
        .locator('text=Your connection has timed out')
        .waitFor({ state: 'visible', timeout: 60000 })
        .then(() => {
          throw new Error('NetSuite session timed out during save — re-run auth setup');
        }),
      this.page
        .locator('text=An unexpected error has occurred')
        .waitFor({ state: 'visible', timeout: 60000 })
        .then(() => {
          throw new Error('NetSuite unexpected error during save');
        }),
    ]);
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
  }

  async setOrderedBy(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue('custbody_eg_ordered_by', v, null, true),
      id,
    );
  }

  async verifyTranDate(): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="trandate"] [data-nsps-type="field_input"]'),
    ).toHaveText(today());
  }

  async getInvoiceNumber(): Promise<string> {
    return this.page
      .locator('[data-field-name="tranid"] [data-nsps-type="field_input"]')
      .innerText();
  }

  async printInCustomerLocale(): Promise<{ url: string; body: Buffer }> {
    const printMenu = this.page.locator('[data-automation-id="button-menu-print"]').first();
    const localePrintButton = this.page.getByRole('button', {
      name: "Print in Customer's Locale",
      exact: true,
    });

    await printMenu.locator('a:has(img[src*="print.svg"])').first().hover();
    await expect(localePrintButton).toBeVisible();

    // route.fetch() performs a Node-side request that gets the full PDF body before
    // Chrome's PDF viewer consumes the response — CDP response.body() only returns
    // a partial buffer (~536 bytes) for PDFs rendered by the native viewer.
    let resolvePdf!: (result: { url: string; body: Buffer }) => void;
    const pdfPromise = new Promise<{ url: string; body: Buffer }>((resolve) => {
      resolvePdf = resolve;
    });

    const routeHandler = async (route: Route) => {
      const response = await route.fetch();
      const body = await response.body();
      if ((response.headers()['content-type'] ?? '').includes('application/pdf')) {
        resolvePdf({ url: route.request().url(), body });
      }
      await route.fulfill({ status: response.status(), headers: response.headers(), body });
    };

    await this.page.context().route('**/hotprint.nl**', routeHandler);
    await localePrintButton.click();
    const result = await pdfPromise;
    await this.page.context().unroute('**/hotprint.nl**', routeHandler);

    return result;
  }
}
