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
  lineItemText: ITEMS.poolPrepaidPoolIncrease.displayName,
  lineItemRate: '100000',
  lineItemDepartmentId: DEPARTMENTS.finance.id,
  lineItemMainProductId: PRODUCTS.other.id,
  lineItemSubProductId: PRODUCTS.other.other.id,
  lineItemProductItemId: PRODUCTS.other.other.items.other.id,
  lineItemRevenueCategoryId: REVENUE_CATEGORIES.professionalServices.id,
  expectedStatusAfterApproval: SALES_ORDER_STATUSES.pendingBilling,
} as const;
