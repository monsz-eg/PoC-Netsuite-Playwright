/**
 * NS internal ID lookup tables.
 * Verify labels via NS Field Help (click field label) or the relevant NS list record.
 *
 * Exported for use within tests/constants/ only — tests import from the data files, not here.
 */

export const CUSTOMERS = {
  /** NS label: "006954 Psykolog Louise H. Westergaard" */
  psykologLouiseWestergaard: {
    id: '142832',
    displayName: '006954 Psykolog Louise H. Westergaard',
    /** NS label: "EG DK" — subsidiary auto-populated from customer */
    subsidiary: '15',
    /** NS label: "Primary Address" — custentity_eg_bill_to_address dropdown value */
    primaryAddress: '66536',
    /** NS label: nstest13 — custentity_eg_contactperson */
    contactPerson: '3158891',
    /** NS label: test user — custentity_eg_customercontractportalacce */
    customerContractPortalAcce: '4753595',
  },
} as const;

export const DEPARTMENTS = {
  /** NS label: verify in NS Setup > Company > Departments */
  transfer: '236',
} as const;

export const EMPLOYEES = {
  /** NS label: "NSTest_10 NetSuite Test 10" */
  nstest10: {
    id: '2436735',
    displayName: 'NSTest_10 NetSuite Test 10',
  },
} as const;

export const ITEMS = {
  hoursConsultancyServicesTAndM: {
    id: '582',
    /** Display label shown in view mode (dot prefix = NS item hierarchy) */
    displayName: '.[Hours] Consultancy services - T&M',
  },
  hoursConsultancyServicesTAndMTraining: {
    id: '9180',
    displayName: '.[Hours] Consultancy services - T&M Training',
  },
} as const;

export const BILLING_CLASSES = {
  architect: { id: '25', displayName: 'Architect' },
  architectSenior: { id: '26', displayName: 'Architect Senior' },
  businessAnalyst: { id: '6', displayName: 'Business Analyst' },
  businessAnalystSenior: { id: '8', displayName: 'Business Analyst Senior' },
  consultant: { id: '9', displayName: 'Consultant' },
  consultantSenior: { id: '10', displayName: 'Consultant Senior' },
  infrastructureConsultant: { id: '4', displayName: 'Infrastructure Consultant' },
  infrastructureConsultantSenior: { id: '5', displayName: 'Infrastructure Consultant Senior' },
  projectManager: { id: '11', displayName: 'Project Manager' },
  projectManagerSenior: { id: '18', displayName: 'Project Manager Senior' },
  softwareDeveloper: { id: '21', displayName: 'Software Developer' },
  softwareDeveloperSenior: { id: '24', displayName: 'Software Developer Senior' },
  supportConsultant: { id: '2', displayName: 'Support Consultant' },
  supportConsultantSenior: { id: '3', displayName: 'Support Consultant Senior' },
} as const;

export const ACTIVITY_CODES = {
  /** NS label: "Professional services : Professional services" — cseg_paactivitycode segment */
  professionalServices: '328',
} as const;

/**
 * Product segment hierarchy: cseg_eg_main_prod → cseg_eg_sub_prod → cseg_eg_prod_item.
 * Each level is a parent of the next — always select a full path (main + sub + item).
 * Add new sub products and items under the relevant main product entry.
 *
 * Usage:
 *   mainProduct: PRODUCTS.checkWare.id,
 *   subProduct:  PRODUCTS.checkWare.checkWareMain.id,
 *   productItem: PRODUCTS.checkWare.checkWareMain.items.checkWareMain,
 */
export const PRODUCTS = {
  /** cseg_eg_main_prod: "Hardware" */
  hardware: {
    id: '201',
    /** cseg_eg_sub_prod: "Hardware" */
    hardware: {
      id: '301',
      /** cseg_eg_prod_item values under Hardware > Hardware */
      items: {
        /** "Hardware" */
        hardware: '403',
      },
    },
  },
  /** cseg_eg_main_prod: "CheckWare" */
  checkWare: {
    id: '3523',
    /** cseg_eg_sub_prod: "CheckWare (Main)" */
    checkWareMain: {
      id: '4954',
      /** cseg_eg_prod_item values under CheckWare > CheckWare (Main) */
      items: {
        /** "CheckWare (Main)" */
        checkWareMain: '8323',
      },
    },
  },
} as const;
