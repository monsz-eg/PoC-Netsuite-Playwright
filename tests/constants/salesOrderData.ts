import {
  CUSTOMERS,
  DEPARTMENTS,
  ITEMS,
  PRODUCTS,
  REVENUE_CATEGORIES,
  SUBSIDIARIES,
} from './lookups';

export const SALES_ORDER_STATUSES = {
  pendingApproval: { statusRef: 'pendingApproval', status: 'Pending Approval' },
  pendingBilling: { statusRef: 'pendingBilling', status: 'Pending Billing' },
  fullyBilled: { statusRef: 'fullyBilled', status: 'Billed' },
} as const;

export const SALES_ORDER_DATA = {
  customerText: CUSTOMERS.hkDanmark.displayName,
  subsidiaryId: CUSTOMERS.hkDanmark.subsidiary,
  subsidiaryText: SUBSIDIARIES.egdk.displayName,
  lineItemText: ITEMS.hoursConsultancyServicesTAndMTraining.displayName,
  lineItemRate: '100000',
  lineItemDepartmentId: DEPARTMENTS.netSuite.id,
  lineItemMainProductId: PRODUCTS.dynawayEAM.id,
  lineItemSubProductId: PRODUCTS.dynawayEAM.dynawayFoEAM.id,
  lineItemProductItemId: PRODUCTS.dynawayEAM.dynawayFoEAM.items.advancedEnterpriseAssetManagementEAM.id,
  lineItemRevenueCategoryId: REVENUE_CATEGORIES.perpetualLicenses.id,
  expectedStatusAfterApproval: SALES_ORDER_STATUSES.pendingBilling,
} as const;
