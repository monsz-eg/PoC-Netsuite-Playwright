import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ProjectRecord extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToProject(): Promise<void> {
    await this.navigateTo(`/app/accounting/project/project.nl`);
  }

  // EG Project Form - Finance Custom: changing the form triggers a full NS page reload,
  // so we wait for domcontentloaded before proceeding with other field setters.
  async setCustomForm(formId: string): Promise<void> {
    await this.page.evaluate(
      (id) => (globalThis as any).nlapiSetFieldValue("customform", id, null, true),
      formId
    );
    await this.page.waitForLoadState("domcontentloaded");
  }

  async setCompanyName(name: string): Promise<void> {
    await this.page.locator('[name="companyname"]').fill(name);
  }

  // Setting the Bill To Customer (parent) triggers SuiteScript field-change events
  // that populate dependent fields such as Subsidiary — wait for NS to settle.
  async setBillToCustomer(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("parent", v, null, true),
      id
    );
    await this.waitForNetSuiteLoad();
  }

  async setJobType(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("jobtype", v, null, true),
      value
    );
  }

  async setProjectCategory(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("custentity_project_category", v, null, true),
      id
    );
  }

  async setProjectManager(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("projectmanager", v, null, true),
      id
    );
  }

  async setDefaultItemAutoAss(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("custentity_eg_default_item_auto_ass", v, null, true),
      id
    );
  }

  async setServiceItemForTimeBased(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("custentity_eg_serviceitemfortimebased", v, null, true),
      id
    );
  }

  async setDepartment(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("custentity_eg_department_project", v, null, true),
      id
    );
  }

  async setProjectedEndDate(date: string): Promise<void> {
    await this.page.locator('[name="projectedenddate"]').fill(date);
  }

  async verifySubsidiaryPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldValue("subsidiary", expected);
  }

  async verifySchedulingMethodPrepopulated(expected: string): Promise<void> {
    await this.verifyFieldValue("schedulingmethod", expected);
  }

  async setProjectStatus(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("entitystatus", v, null, true),
      value
    );
  }

  async setShipToEntity(value: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("custentity_eg_ship_to_entity", v, null, true),
      value
    );
  }

  async setContactPerson(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("custentity_eg_contactperson", v, null, true),
      id
    );
  }

  async setCustomerContractPortalAcce(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("custentity_eg_customercontractportalacce", v, null, true),
      id
    );
  }

  async setBillToAddress(id: string): Promise<void> {
    await this.page.evaluate(
      (v) => (globalThis as any).nlapiSetFieldValue("custentity_eg_bill_to_address", v, null, true),
      id
    );
  }

  async verifyCompanyName(expected: string): Promise<void> {
    await expect(this.page.locator('[data-field-name="companyname"] [data-nsps-type="field_input"]')).toHaveText(expected);
  }

  async verifyBillToCustomer(expected: string): Promise<void> {
    await expect(this.page.locator('[data-field-name="parent"] [data-nsps-type="field_input"]')).toHaveText(expected);
  }

  async verifyProjectManager(expected: string): Promise<void> {
    await expect(this.page.locator('[data-field-name="projectmanager"] [data-nsps-type="field_input"]')).toHaveText(expected);
  }


}
