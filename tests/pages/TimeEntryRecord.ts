import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class TimeEntryRecord extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToNewTimeEntry(): Promise<void> {
    await this.navigateTo('/app/accounting/transactions/timebill.nl');
    await this.waitForFormReady();
  }

  // Creates a timebill record via the N/record API and navigates to the saved record.
  // Use this as the reliable setup step in serial suites where form UI is not under test.
  async createViaApi(params: {
    employeeId: string;
    projectId: string;
    taskId: string;
    date: string;
    hours: string;
    itemId: string;
  }): Promise<string> {
    // N/record's AMD require is only injected on NS form pages — changerole.nl does not have it.
    await this.navigateTo('/app/accounting/transactions/timebill.nl');
    await this.waitForNsFormReady();

    const recId = await this.page.evaluate(
      (p) =>
        new Promise<string>((resolve, reject) => {
          (globalThis as any).require(['N/record'], (record: any) => {
            try {
              const rec = record.create({ type: 'timebill', isDynamic: true });
              rec.setValue({ fieldId: 'employee', value: p.employeeId });
              rec.setValue({ fieldId: 'customer', value: p.projectId });
              rec.setValue({ fieldId: 'casetaskevent', value: p.taskId });
              rec.setText({ fieldId: 'trandate', text: p.date });
              rec.setValue({ fieldId: 'item', value: p.itemId });
              rec.setValue({ fieldId: 'hours', value: Number(p.hours) });
              resolve(String(rec.save()));
            } catch (e: any) {
              reject(e?.message ?? String(e));
            }
          });
        }),
      params,
    );
    await this.navigateTo(`/app/accounting/transactions/timebill.nl?id=${recId}`);
    await this.waitForNsApi();
    return recId;
  }

  // NS entity-field cascades (subsidiary, billing class, dept) only fire when the typeahead
  // selection is completed via UI. After networkidle the dropdown is rendered — clicking the
  // full display name (which the input doesn't contain yet) targets the suggestion uniquely.
  async setEmployee(displayName: string): Promise<void> {
    const input = this.page.locator('#employee_display');
    const suggestion = this.page.getByText(displayName, { exact: true }).first();
    await input.click();
    await input.fill('');
    await input.pressSequentially(displayName.split(' ')[0], { delay: 100 });
    await suggestion.waitFor({ state: 'visible', timeout: 15000 });
    await suggestion.click();
    await this.waitForNetSuiteLoad();
  }

  // In NS timebill the project is stored in the 'customer' field.
  // firefieldchanged=true fires the cascade that populates billingSubsidiary, jobGroup, isBillable.
  async setProject(projectId: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue('customer', v, true, true),
      projectId,
    );
    await this.waitForNetSuiteLoad();
  }

  // firefieldchanged=true fires the SS1.0 cascade that populates custcol_ fields from the task.
  // cseg_ fields (mainProduct, subProduct, productItem, activityCode) do not cascade in Playwright
  // regardless of the trigger mechanism — those verifications are excluded from the UI spec.
  async setProjectTask(taskId: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue('casetaskevent', v, true, true),
      taskId,
    );
    await this.waitForNetSuiteLoad();
  }

  async setDate(date: string): Promise<void> {
    await this.page.locator('[name="trandate"]').fill(date);
  }

  async setServiceItem(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue('item', v, null, true),
      id,
    );
    await this.waitForNetSuiteLoad();
  }

  async setHours(hours: string): Promise<void> {
    const input = this.page.locator('[name="hours"]');
    await input.fill(hours);
    await input.press('Tab');
  }

  async setHoursToBeBilled(hours: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue('custcol_eg_hours_to_be_billed', v, null, true),
      hours,
    );
  }

  async setJobGroup(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue('cseg_eg_job_group', v, null, true),
      value,
    );
  }

  // NS redirects to a new blank entry form after saving a timebill (time-tracking workflow).
  // The saved record URL is never surfaced in the browser. After save, search for the most
  // recently created timebill for this employee+project+task and navigate to it.
  async saveTimeEntry(employeeId: string, projectId: string, taskId: string): Promise<string> {
    await this.save();
    const recId = await this.page.evaluate(
      ({ emp, proj, task }) =>
        new Promise<string>((resolve, reject) =>
          (globalThis as any).require(['N/search'], (s: any) => {
            try {
              const results = s
                .create({
                  type: 'timebill',
                  filters: [
                    ['employee', 'is', emp],
                    'AND',
                    ['customer', 'is', proj],
                    'AND',
                    ['casetaskevent', 'is', task],
                  ],
                  columns: [{ name: 'internalid', sort: s.Sort.DESC }],
                })
                .run()
                .getRange({ start: 0, end: 1 });
              results.length > 0 ? resolve(results[0].id) : reject('timebill not found after save');
            } catch (e: any) {
              reject(e?.message ?? String(e));
            }
          }),
        ),
      { emp: employeeId, proj: projectId, task: taskId },
    );
    await this.navigateTo(`/app/accounting/transactions/timebill.nl?id=${recId}`);
    await this.waitForNsApi();
    return recId;
  }

  // Navigates to edit mode for the current time entry and sets approval status to Approved.
  // Extracts the record ID from the current view-mode URL before navigating.
  async approve(): Promise<void> {
    const id = new URL(this.page.url()).searchParams.get('id')!;
    await this.navigateTo(`/app/accounting/transactions/timebill.nl?id=${id}&e=T`);
    await this.waitForNsFormReady();
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue('approvalstatus', v, null, true),
      '3',
    );
    await this.save();
    // NS redirects away from the record after saving an approved timebill — navigate back to view mode.
    await this.navigateTo(`/app/accounting/transactions/timebill.nl?id=${id}`);
    await this.waitForNsApi();
  }

  async verifyBillingSubsidiaryPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldText('billingsubsidiary', expected);
  }

  async verifyJobGroupPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldText('cseg_eg_job_group', expected);
  }

  async verifySubsidiaryPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldText('subsidiary', expected);
  }

  // billingclass stores the display name directly (not an ID) — use verifyFieldValue, not verifyFieldText.
  async verifyBillingClassPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldValue('billingclass', expected);
  }

  async verifyDepartmentPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldText('department', expected);
  }

  async verifyDefaultRevenueCategoryItemPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldText('custcol_eg_def_rev_cat_item', expected);
  }

  async verifyMainProductPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldText('cseg_eg_main_prod', expected);
  }

  async verifySubProductPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldText('cseg_eg_sub_prod', expected);
  }

  async verifyProductItemPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldText('cseg_eg_prod_item', expected);
  }

  async verifyActivityCodePrepopulated(expected: string): Promise<void> {
    await this.verifyFieldText('cseg_paactivitycode', expected);
  }

  async verifyIsBillablePrepopulated(expected: string): Promise<void> {
    await this.verifyFieldValue('isbillable', expected);
  }

  async verifyApprovalStatus(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="approvalstatus"] [data-nsps-type="field_input"]'),
    ).toHaveText(expected);
  }
}
