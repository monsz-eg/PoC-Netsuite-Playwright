import { expect, Page } from '@playwright/test';
import { today } from '../utils/dateUtils';
import { BasePage } from './BasePage';

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
    await this.page.waitForLoadState('networkidle');
    await this.page.keyboard.press('Tab');
    // Tab triggers a full page reload. waitForNsApi polls through the unload/reload
    // cycle — nlapiGetContext throws while the page is navigating, so it naturally
    // waits until the new form is ready before we poll for subsidiary.
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
    // ensuring the type-ahead dropdown has results before Tab selects from it.
    await this.page.waitForLoadState('networkidle');
    await this.page.keyboard.press('Tab');
    // After Tab, NS fires AJAX to load item details and auto-populate dependent
    // fields. Wait for Tax Code, then networkidle for full initialization.
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
    await this.page.waitForLoadState('networkidle');
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

  // After the Add click, NS commits the line and runs async item-options
  // initialization. Wait for the committed line count to confirm the commit
  // completed, then wait for any post-commit AJAX to settle before saving.
  async addItem(): Promise<void> {
    // Flush any pending field events from the last setter before committing.
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    await this.ensureFormInited();
    const addBtn = this.page.locator('[name="item_addedit"]');
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    await this.page.waitForFunction(
      () => {
        try {
          return (globalThis as any).nlapiGetLineItemCount('item') >= 1;
        } catch {
          return false;
        }
      },
      { timeout: 30000 },
    );
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
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

  async save(): Promise<void> {
    await this.ensureFormInited();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    const saveBtn = this.page.locator('[id="btn_multibutton_submitter"]');
    await saveBtn.waitFor({ state: 'visible' });
    await saveBtn.click({ force: true });
    await this.waitForNetSuiteLoad();
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
}
