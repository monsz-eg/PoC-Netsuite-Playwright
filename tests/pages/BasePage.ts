import { expect, Page } from '@playwright/test';

export class BasePage {
  // Tracks pages that already have a dialog handler registered, so multiple page
  // objects sharing the same page don't register duplicate handlers.
  private static readonly dialogHandledPages = new WeakSet<Page>();

  constructor(protected readonly page: Page) {
    if (!BasePage.dialogHandledPages.has(page)) {
      BasePage.dialogHandledPages.add(page);
      this.page.on('dialog', async (dialog) => await dialog.accept());
    }
  }

  async waitForNetSuiteLoad(): Promise<void> {
    await this.page.waitForLoadState('load');
    await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
  }

  // Waits for networkidle while polling for the NS logout overlay every second.
  // When NS invalidates the session mid-test, background polling prevents networkidle
  // from ever resolving — this throws immediately with a clear error instead of
  // silently hanging until the test timeout.
  protected async waitForNetworkIdle(timeout = 30000): Promise<void> {
    const aborted = { value: false };
    const logoutPoller = (async () => {
      while (!aborted.value) {
        if (await this.page.getByText('You have been logged out.').isVisible()) {
          throw new Error('NetSuite session expired — re-run: npm run auth:setup');
        }
        await new Promise<void>((r) => setTimeout(r, 1000));
      }
    })();
    try {
      await Promise.race([
        this.page.waitForLoadState('networkidle', { timeout }),
        logoutPoller,
      ]);
    } finally {
      aborted.value = true;
    }
  }

  async navigateTo(url: string): Promise<void> {
    await this.page.goto(url);
    await this.waitForNetSuiteLoad();
  }

  protected async waitForNsApi(): Promise<void> {
    // NS occasionally replaces the JS context via document.open() or a similar mechanism.
    // Playwright briefly reports "Target closed" during the replacement window — the page
    // is still alive. Retry once after a short pause to let the new context attach.
    const deadline = Date.now() + 20000;
    while (true) {
      try {
        await this.page.waitForFunction(
          () => typeof (globalThis as any).nlapiGetContext === 'function',
          { timeout: 15000 },
        );
        return;
      } catch (e: any) {
        if (!(e?.message ?? '').includes('closed') || Date.now() >= deadline) throw e;
        // page.waitForTimeout also uses CDP — use a plain timer that survives the closed window.
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // nlapiSetFieldValue on select/dropdown fields calls NLEntryForm_querySelectText, which NS
  // defines asynchronously after the page load event. Call at the end of every subclass
  // navigateTo* method before returning — never call directly from tests.
  protected async waitForNsFormReady(): Promise<void> {
    await this.page.waitForFunction(
      () => typeof (globalThis as any).NLEntryForm_querySelectText === 'function',
      { timeout: 15000 },
    );
  }

  // NS.form.isInited() returns false in Playwright because the form's initialization
  // sequence (which sets window.isinited=true) never completes in the automated context.
  // This blocks canAddLine(), save validation, and other form operations.
  // Must be called after every navigation/reload that resets the flag.
  protected async ensureFormInited(): Promise<void> {
    await this.page.evaluate(() => (globalThis as any).NS?.form?.setInited?.(true));
  }

  // Waits for the NS form to be fully interactive: NLEntryForm_querySelectText available
  // (required for nlapiSetFieldValue on dropdowns) and window.isinited set to true
  // (required for canAddLine and save validation). Call after every navigateTo* method.
  protected async waitForFormReady(): Promise<void> {
    await this.waitForNsFormReady();
    await this.ensureFormInited();
  }

  // Waits for a SuiteScript-sourced field to reach the expected value.
  // Use this for fields auto-populated by field-change events (e.g. subsidiary after
  // setting customer) that don't trigger a page load or the NS spinner.
  async verifyFieldValue(fieldId: string, expected: string): Promise<void> {
    await this.page.waitForFunction(
      ({ id, exp }) => (globalThis as any).nlapiGetFieldValue(id) === exp,
      { id: fieldId, exp: expected },
      { timeout: 10000 },
    );
  }

  // Waits for a SuiteScript-sourced field to reach the expected display label.
  // Use this when asserting the human-readable text of a list/lookup field
  // (e.g. "EGDK") rather than its internal ID.
  async verifyFieldText(fieldId: string, expected: string): Promise<void> {
    try {
      await this.page.waitForFunction(
        ({ id, exp }) => (globalThis as any).nlapiGetFieldText(id) === exp,
        { id: fieldId, exp: expected },
        { timeout: 10000 },
      );
    } catch {
      const actual = await this.page.evaluate(
        (id) => (globalThis as any).nlapiGetFieldText?.(id),
        fieldId,
      );
      throw new Error(`verifyFieldText('${fieldId}'): expected '${expected}', got '${actual}'`);
    }
  }

  // Waits for a sublist line item field to reach the expected value.
  // Use this for fields auto-populated after setting a line item value (e.g. service item
  // auto-filled after selecting a resource in the assignee sublist).
  async verifyCurrentLineItemValue(
    sublistId: string,
    fieldId: string,
    expected: string,
  ): Promise<void> {
    await this.page.waitForFunction(
      ({ sub, id, exp }) => (globalThis as any).nlapiGetCurrentLineItemValue(sub, id) === exp,
      { sub: sublistId, id: fieldId, exp: expected },
      { timeout: 10000 },
    );
  }

  async verifyRecordCreated(): Promise<void> {
    await expect(this.page).toHaveURL(/[?&]id=\d+/);
  }

  getRecordId(): string {
    return new URL(this.page.url()).searchParams.get('id')!;
  }

  async save(): Promise<void> {
    // dispatchEvent bypasses Playwright's pointer-event interception check.
    // In headed mode NS renders a transparent <div></div> overlay after sublist
    // commits that blocks .click() indefinitely — the event dispatch goes directly
    // to the button element, making the overlay irrelevant.
    const saveBtn = this.page.locator('[id="btn_multibutton_submitter"]');
    await saveBtn.waitFor({ state: 'visible' });
    await saveBtn.dispatchEvent('click');
    await this.waitForNetSuiteLoad();
  }

  async switchToTab(tabLabel: string): Promise<void> {
    await this.page.locator(`[data-nsps-label="${tabLabel}"]`).click();
  }

  async clickGenerateEDocument(): Promise<void> {
    // Global dialog handler in BasePage constructor already accepts all dialogs —
    // no need for a page.once handler here.
    await this.page.locator('[id="custpage_generate_ei_button"]').click();
    await this.page.getByText('The e-document has been generated').waitFor({ timeout: 30_000 });
    // Wait for any post-generation AJAX (e.g. e-document record creation, tab refresh)
    // to settle before the caller switches to the E-Document tab.
    await this.waitForNetworkIdle();
  }

  async openEDocumentTab(): Promise<void> {
    await this.switchToTab('E-Document');
    // The tab renders its content via AJAX after the click — waitForNetSuiteLoad only
    // checks the page load event and the NS spinner, both of which resolve before the
    // tab's AJAX response arrives. waitForNetworkIdle captures the full AJAX cycle.
    await this.waitForNetworkIdle();
    await this.page.getByRole('link', { name: 'download' }).waitFor({ state: 'visible', timeout: 30_000 });
  }

  async downloadXml(): Promise<string> {
    const link = this.page.getByRole('link', { name: 'download' });
    const href = await link.getAttribute('href');
    if (!href) throw new Error('E-Document download link has no href');
    // Resolve root-relative NS URLs and fetch directly with the authenticated session.
    // The link does not trigger a browser download or page event — it is a plain GET.
    const url = new URL(href, this.page.url()).href;
    const response = await this.page.request.get(url);
    if (!response.ok()) throw new Error(`XML download failed: HTTP ${response.status()}`);
    return response.text();
  }

  async switchRole(roleId: number): Promise<void> {
    if (!this.page.url().includes('netsuite.com')) {
      await this.page.goto('/');
      await this.waitForNetSuiteLoad();
    }

    await this.waitForNsApi();

    // nlapiGetContext() may throw transiently after waitForNsApi resolves — NS replaces
    // the JS context via document.open() and the function exists briefly before the new
    // context object is ready. Only user+company are required here: the NS center/home page
    // returns role=0, so requiring role in this poll would exhaust on home-page navigations.
    const nsContext = await this.pollEvaluate(
      (): { empId: string; companyId: string } | null => {
        try {
          const ctx = (globalThis as any).nlapiGetContext();
          if (!ctx?.user || !ctx?.company) return null;
          return { empId: String(ctx.user), companyId: String(ctx.company) };
        } catch {
          return null;
        }
      },
    );

    if (!nsContext) {
      throw new Error(
        `switchRole(${roleId}): nlapiGetContext() not available on this page. ` +
          `Ensure a NetSuite page is fully loaded before switching roles.`,
      );
    }

    // Best-effort check: skip changerole if already on the target role.
    // Not retried — if the role is transiently unavailable we fall through to changerole.
    // Calling changerole.nl with the already-active role redirects back to changerole.nl
    // itself (no-op), leaving the page in a state where role verification fails.
    const currentRole = await this.page
      .evaluate((): number => {
        try {
          return Number((globalThis as any).nlapiGetContext()?.role) || 0;
        } catch {
          return 0;
        }
      })
      .catch(() => 0);
    if (currentRole === roleId) return;

    const { empId, companyId } = nsContext;
    const environment = companyId.replace('_', '-').toLowerCase();
    const changeRoleUrl =
      `https://${environment}.app.netsuite.com/app/login/secure/changerole.nl` +
      `?id=${companyId}~${empId}~${roleId}~N`;

    await this.page.goto(changeRoleUrl);
    await this.waitForNetSuiteLoad();
    await this.waitForNsApi();

    // Same transient-context race can occur after the changerole redirect.
    const activeRole = await this.pollEvaluate((): number | null => {
      try {
        const role = Number((globalThis as any).nlapiGetContext()?.role);
        return isNaN(role) || role === 0 ? null : role;
      } catch {
        return null;
      }
    });

    if (activeRole !== roleId) {
      throw new Error(
        `switchRole(${roleId}): expected role ${roleId} but got ${activeRole ?? 'unknown'} — ` +
          `role may not be assigned to this user`,
      );
    }
  }

  // Retries page.evaluate until the callback returns a non-null value or the deadline passes.
  // Guards against NS's transient JS context replacement window.
  private async pollEvaluate<T>(fn: () => T | null, timeoutMs = 10000): Promise<T | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await this.page.evaluate(fn);
      if (result !== null) return result;
      await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  }
}
