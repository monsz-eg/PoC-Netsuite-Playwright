import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ProjectTaskRecord extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToNewTask(projectId: string): Promise<void> {
    await this.navigateTo(`/app/accounting/project/projecttask.nl?company=${projectId}`);
  }

  // Two elements share name="title" (task name + notes sublist title) — .first() targets the task name.
  async setTitle(name: string): Promise<void> {
    await this.page.locator('[name="title"]').first().fill(name);
  }

  // Activity code and product segments (cseg_*) are custom segments — must use nlapiSetFieldValue.
  async setActivityCode(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("cseg_paactivitycode", v, null, true),
      value
    );
  }

  async setMainProduct(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("cseg_eg_main_prod", v, null, true),
      value
    );
  }

  async setSubProduct(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("cseg_eg_sub_prod", v, null, true),
      value
    );
  }

  async setProductItem(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("cseg_eg_prod_item", v, null, true),
      value
    );
  }

  async setProjectCategory(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("custevent_project_category", v, null, true),
      value
    );
  }

  async setStartDate(date: string): Promise<void> {
    await this.page.locator('[name="startdate"]').first().fill(date);
  }

  async setEndDate(date: string): Promise<void> {
    await this.page.locator('[name="finishbydate"]').fill(date);
  }

  async setPlannedWork(hours: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("plannedwork", v, null, true),
      hours
    );
  }

  // Assignee sublist — sets and verifies the current (unsaved) line item before clicking Add.
  async setAssigneeResource(employeeId: string): Promise<void> {
    await this.page.evaluate(
      (id) => (globalThis as any).nlapiSetCurrentLineItemValue("assignee", "resource", id, null, true),
      employeeId
    );
  }

  async setAssigneePlannedWork(hours: string): Promise<void> {
    await this.page.evaluate(
      (h) => (globalThis as any).nlapiSetCurrentLineItemValue("assignee", "plannedwork", h, null, true),
      hours
    );
  }

  async verifyAssigneeUnitsPrepopulated(expected: string): Promise<void> {
    await this.verifyCurrentLineItemValue("assignee", "units", expected);
  }

  async verifyAssigneeServiceItemPrepopulated(expected: string): Promise<void> {
    await this.verifyCurrentLineItemValue("assignee", "serviceitem", expected);
  }

  async verifyAssigneeBillingClassPrepopulated(expected: string): Promise<void> {
    await this.verifyCurrentLineItemValue("assignee", "billingclass", expected);
  }

  async setAssigneeBillingClass(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetCurrentLineItemValue("assignee", "billingclass", v, null, true),
      value
    );
  }

  async addAssignee(): Promise<void> {
    await this.page.locator('[name="assignee_addedit"]').click();
  }

  async verifyTitle(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="title"] [data-nsps-type="field_input"]')
    ).toHaveText(expected);
  }

  async verifyStatus(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="status"] [data-nsps-type="field_input"]')
    ).toHaveText(expected);
  }

  async verifyProjectName(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="company"] [data-nsps-type="field_input"]')
    ).toContainText(expected);
  }

  // Edit-mode checks (nlapiGetFieldValue) — use before save to verify pre-population.
  async verifyDefaultItemPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldValue("custevent_eg_default_item_auto_ass", expected);
  }

  async verifyProjectCategoryPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldValue("custevent_project_category", expected);
  }

  async verifyCustomerCopyPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldValue("custevent_eg_project_customer_copy", expected);
  }

  // View-mode checks (data-field-name) — use after save to verify saved values.
  async verifyDefaultItem(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="custevent_eg_default_item_auto_ass"] [data-nsps-type="field_input"]')
    ).toHaveText(expected);
  }

  async verifyProjectCategory(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="custevent_project_category"] [data-nsps-type="field_input"]')
    ).toHaveText(expected);
  }

  async verifyCustomerCopy(expected: string): Promise<void> {
    await expect(
      this.page.locator('[data-field-name="custevent_eg_project_customer_copy"] [data-nsps-type="field_input"]')
    ).toContainText(expected);
  }
}
