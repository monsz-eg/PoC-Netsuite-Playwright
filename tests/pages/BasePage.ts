import { expect, Page } from "@playwright/test";

export class BasePage {
  constructor(protected readonly page: Page) {
    this.page.on("dialog", async (dialog) => await dialog.accept());
  }

  async waitForNetSuiteLoad(): Promise<void> {
    await this.page.waitForLoadState("load");
    await this.page.waitForSelector(".ns-loading", { state: "hidden" }).catch(() => {});
  }

  async navigateTo(url: string): Promise<void> {
    await this.page.goto(url);
    await this.waitForNetSuiteLoad();
  }

  private async waitForNsApi(): Promise<void> {
    await this.page.waitForFunction(
      () => typeof (globalThis as any).nlapiGetContext === 'function',
      { timeout: 15000 }
    );
  }

  async verifyRecordCreated(): Promise<void> {
    await expect(this.page).toHaveURL(/[?&]id=\d+/);
  }

  async switchRole(roleId: number): Promise<void> {
    if (!this.page.url().includes('netsuite.com')) {
      await this.page.goto('/');
      await this.waitForNetSuiteLoad();
    }

    // waitForNsApi() guarantees nlapiGetContext exists as a function, but the function
    // itself may still throw (e.g. not yet initialised for this page context).
    // The null-check below catches that case and surfaces a descriptive error.
    await this.waitForNsApi();

    const nsContext = await this.page.evaluate((): { empId: string; companyId: string } | null => {
      try {
        const ctx = (globalThis as any).nlapiGetContext();
        return { empId: String(ctx.user), companyId: String(ctx.company) };
      } catch {
        return null;
      }
    });

    if (!nsContext) {
      throw new Error(
        `switchRole(${roleId}): nlapiGetContext() not available on this page. ` +
        `Ensure a NetSuite page is fully loaded before switching roles.`
      );
    }

    const { empId, companyId } = nsContext;
    const environment = companyId.replace('_', '-').toLowerCase();
    const changeRoleUrl =
      `https://${environment}.app.netsuite.com/app/login/secure/changerole.nl` +
      `?id=${companyId}~${empId}~${roleId}~N`;

    await this.page.goto(changeRoleUrl);
    await this.waitForNetSuiteLoad();

    const activeRole = await this.page.evaluate((): number | null => {
      try {
        return Number((globalThis as any).nlapiGetContext().role);
      } catch {
        return null;
      }
    });

    if (activeRole !== roleId) {
      throw new Error(
        `switchRole(${roleId}): expected role ${roleId} but got ${activeRole ?? 'unknown'} — ` +
        `role may not be assigned to this user`
      );
    }
  }
}