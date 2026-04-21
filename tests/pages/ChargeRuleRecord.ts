import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ChargeRuleRecord extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToNewTimeBased(projectId: string): Promise<void> {
    await this.navigateTo(
      `/app/accounting/transactions/billing/chargerule.nl?l=T&project=${projectId}&chargeruletype=TIMEBASED`,
    );
    await this.waitForNsFormReady();
  }

  async setName(name: string): Promise<void> {
    await this.page.locator('#name').fill(name);
  }

  async setDescription(text: string): Promise<void> {
    await this.page.locator('textarea[name="description"]').fill(text);
  }

  async setRateSourceType(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue('ratesourcetype', v, null, true),
      value,
    );
  }

  async setBillingRateCard(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue('billingratecard', v, null, true),
      value,
    );
  }

  async addItemFilter(itemId: string, description: string): Promise<void> {
    await this.waitForNetSuiteLoad();
    await this.page.locator('#filterstabtxt').click();
    // The tab click occasionally doesn't register (NS still settling after field-change
    // events that don't surface a loading spinner). Retry once if the button stays hidden.
    await this.page
      .locator('#filters_addedit')
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(async () => {
        await this.page.locator('#filterstabtxt').click();
        await this.page.locator('#filters_addedit').waitFor({ state: 'visible', timeout: 12000 });
      });

    // doAddEdit() is dual-purpose on this sublist:
    //   First click  (view mode) → machine advances to a new current line (add mode).
    //   Second click (add mode)  → commits the staged values to the sublist.
    // nlapiCommitLineItem is blocked in our page.evaluate context (SS2 sandbox restriction),
    // so the two DOM clicks are the only reliable commit path.
    const beforeCount = await this.page.evaluate(() =>
      (globalThis as any).nlapiGetLineItemCount('filters'),
    );
    await this.page.locator('#filters_addedit').click();
    await this.page.evaluate(
      ([id, descr]) => {
        const g = globalThis as any;
        g.nlapiSetCurrentLineItemValue('filters', 'filterfilter', 'Time_ITEM', false, false);
        g.nlapiSetCurrentLineItemValue('filters', 'filtervals', id, false, false);
        g.nlapiSetCurrentLineItemValue('filters', 'filterdescr', descr, false, false);
      },
      [itemId, description],
    );
    await this.page.locator('#filters_addedit').click();
    await this.page.waitForFunction(
      (n) => (globalThis as any).nlapiGetLineItemCount('filters') > n,
      beforeCount,
      { timeout: 5000 },
    );
  }

  // This form has no multi-button submitter — Save is a plain input#submitter.
  async save(): Promise<void> {
    await this.page.locator('#submitter').click();
    await this.waitForNetSuiteLoad();
  }

  async findByProjectAndName(projectId: string, ruleName: string): Promise<string> {
    return this.page.evaluate(
      ([pid, name]) => {
        return new Promise<string>((resolve, reject) => {
          (globalThis as any).require(['N/search'], (search: any) => {
            try {
              const byProject = search
                .create({
                  type: 'chargerule',
                  filters: [['project', 'anyof', pid], 'AND', ['name', 'is', name]],
                  columns: ['internalid'],
                })
                .run()
                .getRange({ start: 0, end: 1 });
              if (byProject.length > 0) {
                resolve(byProject[0].id);
                return;
              }

              const byName = search
                .create({
                  type: 'chargerule',
                  filters: [['name', 'is', name]],
                  columns: ['internalid', 'project'],
                })
                .run()
                .getRange({ start: 0, end: 1 });
              if (byName.length > 0)
                reject(
                  new Error(
                    `Charge rule found (id=${byName[0].id}) but linked to project ${byName[0].getValue('project')}, expected ${pid}`,
                  ),
                );
              else reject(new Error(`Charge rule "${name}" not found`));
            } catch (e: any) {
              reject(new Error(`N/search failed: ${e.message ?? e}`));
            }
          });
        });
      },
      [projectId, ruleName],
    );
  }

  async verifyName(expected: string): Promise<void> {
    await expect(this.fieldInput('name')).toHaveText(expected);
  }

  // chargeruletype has no view-mode field element — the type is in the page heading.
  async verifyChargeRuleType(expected: string): Promise<void> {
    await expect(this.page.locator('h1')).toContainText(expected);
  }

  async verifyProject(expected: string): Promise<void> {
    await expect(this.fieldInput('project')).toContainText(expected);
  }

  async verifyStage(expected: string): Promise<void> {
    await expect(this.fieldInput('stage')).toHaveText(expected);
  }

  private fieldInput(fieldName: string) {
    return this.page.locator(`[data-field-name="${fieldName}"] [data-nsps-type="field_input"]`);
  }
}
