import { expect, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SalesOrderRecord extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToSalesOrder(): Promise<void> {
    await this.navigateTo('/app/accounting/transactions/salesord.nl');
    await this.waitForNsApi();
    await this.waitForFormReady();
  }

  // custbody_eg_is_pool_provision — verify field ID via NS Field Help (click field label)
  async setPoolProvisionSalesOrder(): Promise<void> {
    await this.page.evaluate(
      () =>
        (globalThis as any).nlapiSetFieldValue('custbody_eg_is_pool_provision', 'T', null, true),
    );
  }

  // nlapiSetFieldValue for entity does not trigger the client-side fieldChanged chain
  // that populates Subsidiary — use native type-ahead instead: type into the display input,
  // wait for networkidle, then Tab to confirm. Poll Subsidiary as confirmation that all
  // dependent-field scripts completed.
  async setCustomer(displayText: string): Promise<void> {
    const entityInput = this.page.locator('[id="entity_display"]');
    await entityInput.click();
    await entityInput.pressSequentially(displayText, { delay: 50 });
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

  async verifySubsidiaryPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldValue('subsidiary', expected);
  }

  // nlapiSetCurrentLineItemValue crashes on checkvalid in the Billing Responsible role —
  // use native type-ahead + Tab to trigger NS resolution and auto-population of dependent
  // fields (tax code, units, price level).
  async addLineItem(itemText: string): Promise<void> {
    const itemInput = this.page.locator('#item_item_display');
    await itemInput.scrollIntoViewIfNeeded();
    await itemInput.click();
    await itemInput.pressSequentially(itemText, { delay: 50 });
    await this.page.waitForLoadState('networkidle');
    await this.page.keyboard.press('Tab');
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
        // onchange may crash at nlapiFieldChanged; value is stored before crash
      }
    }, id);
    await this.page.waitForTimeout(1000);
  }

  // Custom segment fields (cseg_*) are backed by hidden inputs with associated global
  // Sync* functions that write values into NS's model. Stub nlapiFieldChanged during
  // Sync to prevent checkvalid crash and dependent-field rollback. Sync writes the value
  // synchronously but also fires an AJAX request whose response can reset the line state
  // — wait for the poll AND for networkidle, otherwise a later setter's cascade observes
  // an in-flight cseg and the row preview drops it. Verified via the row snapshot: only
  // the last-Sync'd cseg survives without this wait.
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
    await this.page.waitForFunction(
      ({ field, val }) => {
        try {
          return (globalThis as any).nlapiGetCurrentLineItemValue('item', field) === val;
        } catch {
          return false;
        }
      },
      { field: fieldName, val: id },
      { timeout: 15000 },
    );
    await this.page.waitForLoadState('networkidle');
  }

  // Setting a line column via nlapiSetCurrentLineItemValue triggers checkvalid which can
  // crash inside nlapiFieldChanged on Billing Responsible — stub it for the call, poll
  // the line context until NS confirms the value committed, then wait for networkidle so
  // any field-change AJAX has a chance to settle before the next setter runs.
  private async setLineItemColumnValue(fieldName: string, value: string): Promise<void> {
    await this.page.evaluate(
      ({ field, val }) => {
        const g = globalThis as any;
        const orig = g.nlapiFieldChanged;
        g.nlapiFieldChanged = () => {};
        try {
          g.nlapiSetCurrentLineItemValue('item', field, val, true);
        } finally {
          g.nlapiFieldChanged = orig;
        }
      },
      { field: fieldName, val: value },
    );
    await this.page.waitForFunction(
      ({ field, val }) => {
        try {
          return (globalThis as any).nlapiGetCurrentLineItemValue('item', field) === val;
        } catch {
          return false;
        }
      },
      { field: fieldName, val: value },
      { timeout: 15000 },
    );
    await this.page.waitForLoadState('networkidle');
  }

  // Each product cseg pairs with a custcol_*_mandat_item="T" flag. NS line-add validation
  // checks the flag — without it, the dialog "mandatory to provide a value" fires even
  // when the cseg ID is set in the line context.
  async setLineItemMainProduct(id: string): Promise<void> {
    await this.setCsegLineItemValue('cseg_eg_main_prod', id);
    await this.setLineItemColumnValue('custcol_eg_main_product_mandat_item', 'T');
  }

  async setLineItemSubProduct(id: string): Promise<void> {
    await this.setCsegLineItemValue('cseg_eg_sub_prod', id);
    await this.setLineItemColumnValue('custcol_eg_sub_product_mandat_item', 'T');
  }

  async setLineItemProductItem(id: string): Promise<void> {
    await this.setCsegLineItemValue('cseg_eg_prod_item', id);
    await this.setLineItemColumnValue('custcol_eg_product_item_mandat_item', 'T');
  }

  // Revenue Category: cseg holds the ID, and two custcol mirrors hold the same ID.
  // All three must be set or NS validation rejects the line at Add.
  async setLineItemRevenueCategory(id: string): Promise<void> {
    await this.setCsegLineItemValue('cseg_eg_rev_categ', id);
    await this.setLineItemColumnValue('custcol_eg_def_rev_cat_item', id);
    await this.setLineItemColumnValue('custcol_eg_rev_cat_item_pr', id);
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

  async addItem(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    await this.ensureFormInited();
    const addBtn = this.page.locator('[name="item_addedit"]');
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    // NS may replace the JS context during Add processing — retry on "Target closed".
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
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
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

  async approveSalesOrder(): Promise<void> {
    await this.page.locator('#approve').click();
    await this.waitForNetSuiteLoad();
    await this.waitForNsApi();
  }

  async verifyCustomer(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="entity"] [data-nsps-type="field_input"]'),
    ).toHaveText(expected);
  }

  async verifySubsidiary(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="subsidiary"] [data-nsps-type="field_input"]'),
    ).toHaveText(expected);
  }

  // nlapiGetFieldValue returns null on view-mode records — NS 1.0 API field context is not
  // available after save/approve. Status is shown only in the record header badge.
  async verifyStatus(expectedStatusText: string): Promise<void> {
    await expect(this.page.locator('.uir-record-status')).toHaveText(expectedStatusText);
  }
}
