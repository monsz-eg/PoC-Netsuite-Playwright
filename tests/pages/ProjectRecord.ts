import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProjectRecord extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToProject(): Promise<void> {
    await this.navigateTo(`/app/accounting/project/project.nl`);
    await this.waitForNsFormReady();
  }

  // EG Project Form - Finance Custom: changing the form triggers a full NS page reload.
  // waitForNsFormReady() waits for the form JS to fully initialise before further nlapi calls.
  async setCustomForm(formId: string): Promise<void> {
    await this.page.evaluate(
      (id) => (globalThis as any).nlapiSetFieldValue('customform', id, null, true),
      formId,
    );
    await this.waitForNsFormReady();
  }

  // Setting the Bill To Customer (parent) triggers SuiteScript field-change events
  // that populate dependent fields such as Subsidiary — wait for NS to settle.
  async setBillToCustomer(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue('parent', v, null, true),
      id,
    );
    await this.waitForNetSuiteLoad();
  }
}
