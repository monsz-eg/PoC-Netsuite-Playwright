import {
  ACCOUNTS,
  CURRENCIES,
  CUSTOMERS,
  DEPARTMENTS,
  ITEMS,
  PRODUCTS,
  REVENUE_CATEGORIES,
  SUBSIDIARIES,
  TAX_RATES,
} from './lookups';

const LINE_ITEM_DEFAULTS = {
  description: 'test',
  quantity: '1',
  rate: '100',
} as const;

export const INVOICE_DATA = {
  customerId: CUSTOMERS.priessAS.id,
  customerText: CUSTOMERS.priessAS.displayName,
  subsidiaryId: CUSTOMERS.priessAS.subsidiary,
  subsidiaryText: SUBSIDIARIES.egdk.displayName,
  accountId: ACCOUNTS.tradeReceivables.id,
  currencyText: CURRENCIES.dkk.displayName,
  orderedById: CUSTOMERS.searsManufacturingCo.id,
  orderedByText: CUSTOMERS.searsManufacturingCo.displayName,
  lineItemTextFixedFee: ITEMS.hoursConsultancyServicesFixedFee.itemName,
  lineItemTextConsultancyServicesTAndMTraining:
    ITEMS.hoursConsultancyServicesTAndMTraining.itemName,
  lineItemTextConsultancyServicesTAndM: ITEMS.hoursConsultancyServicesTAndM.itemName,
  lineItemPdfNameFixedFee: ITEMS.hoursConsultancyServicesFixedFee.displayName,
  lineItemPdfNameConsultancyServicesTAndMTraining:
    ITEMS.hoursConsultancyServicesTAndMTraining.displayName,
  lineItemPdfNameConsultancyServicesTAndM: ITEMS.hoursConsultancyServicesTAndM.displayName,
  lineItemDescription: LINE_ITEM_DEFAULTS.description,
  lineItemQuantity: LINE_ITEM_DEFAULTS.quantity,
  lineItemRate: LINE_ITEM_DEFAULTS.rate,
  lineItemTaxRate: TAX_RATES.denmark.standardRate.rate,
  lineItemRevenueCategoryId: REVENUE_CATEGORIES.perpetualLicenses.id,
  lineItemRevenueCategoryText: REVENUE_CATEGORIES.perpetualLicenses.displayName,
  lineItemDepartmentId: DEPARTMENTS.netSuite.id,
  lineItemDepartmentText: DEPARTMENTS.netSuite.displayName,
  lineItemMainProductId: PRODUCTS.dynawayEAM.id,
  lineItemMainProductText: PRODUCTS.dynawayEAM.displayName,
  lineItemSubProductId: PRODUCTS.dynawayEAM.dynawayFoEAM.id,
  lineItemSubProductText: PRODUCTS.dynawayEAM.dynawayFoEAM.displayName,
  lineItemProductItemId:
    PRODUCTS.dynawayEAM.dynawayFoEAM.items.advancedEnterpriseAssetManagementEAM.id,
  lineItemProductItemText:
    PRODUCTS.dynawayEAM.dynawayFoEAM.items.advancedEnterpriseAssetManagementEAM.displayName,
};
