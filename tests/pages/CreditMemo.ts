import { expect, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CreditMemo extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  override async save(): Promise<void> {
    await this.ensureFormInited();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
    const saveBtn = this.page.locator('[id="btn_multibutton_submitter"]');
    await saveBtn.waitFor({ state: 'visible' });
    await saveBtn.click({ force: true });
    // The create-from-transform URL already contains id= (e.g. ?memdoc=0&transform=custinvc&e=T&id=...)
    // so we wait for the post-save URL where id= is the first query param.
    await this.page.waitForURL(/custcred\.nl\?id=\d+/, { timeout: 60000 });
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
  }

  async navigateToInvoice(invoiceId: string): Promise<void> {
    await this.navigateTo(`/app/accounting/transactions/custinvc.nl?id=${invoiceId}`);
  }

  async clickCreditButton(): Promise<void> {
    const creditBtn = this.page.locator('[id="credit"]');
    await creditBtn.waitFor({ state: 'visible' });
    await creditBtn.click();
    await this.waitForNetSuiteLoad();
  }

  async verifyCreatedFromPrepopulated(invoiceNumber: string): Promise<void> {
    await this.verifyFieldText('createdfrom', `Invoice #${invoiceNumber}`);
  }

  async verifyCreatedFrom(invoiceNumber: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="createdfrom"] [data-nsps-type="field_input"]'),
    ).toHaveText(`Invoice #${invoiceNumber}`);
  }
}
