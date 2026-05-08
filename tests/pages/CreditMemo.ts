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

  async navigateToCreditMemo(creditMemoId: string): Promise<void> {
    await this.navigateTo(`/app/accounting/transactions/custcred.nl?id=${creditMemoId}`);
  }

  async clickGenerateEDocument(): Promise<void> {
    // NS shows a confirm dialog when a document was previously generated/sent
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.page.locator('[id="custpage_generate_ei_button"]').click();
    // Wait for the generation banner rather than a load-state — the operation is
    // an AJAX call that updates the page in-place, so waitForNetSuiteLoad() hangs
    await this.page
      .getByText('The e-document has been generated')
      .waitFor({ timeout: 30_000 });
  }

  async openEDocumentTab(): Promise<void> {
    await this.switchToTab('E-Document');
    // Tab click triggers a full page navigation (URL gains ei_process=generation params)
    await this.page.waitForURL(/ei_process=generation/, { timeout: 30_000 });
    await this.waitForNetSuiteLoad();
  }

  async downloadXml(): Promise<string> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.getByRole('link', { name: 'download' }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }
}
