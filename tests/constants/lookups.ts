/**
 * NS internal ID lookup tables.
 * Verify labels via NS Field Help (click field label) or the relevant NS list record.
 *
 * Exported for use within tests/constants/ only — tests import from the data files, not here.
 */

export const CUSTOMERS = {
  /** NS label: "006954 Psykolog Louise H. Westergaard" */
  psykologLouiseWestergaard: {
    id: "142832",
    displayName: "006954 Psykolog Louise H. Westergaard",
    /** NS label: "EG DK" — subsidiary auto-populated from customer */
    subsidiary: "15",
    /** NS label: "Primary Address" — custentity_eg_bill_to_address dropdown value */
    primaryAddress: "66536",
    /** NS label: nstest13 — custentity_eg_contactperson */
    contactPerson: "3158891",
    /** NS label: test user — custentity_eg_customercontractportalacce */
    customerContractPortalAcce: "4753595",
  },
} as const;

export const DEPARTMENTS = {
  /** NS label: verify in NS Setup > Company > Departments */
  transfer: "236",
} as const;

export const EMPLOYEES = {
  /** NS label: "NSTest_10 NetSuite Test 10" */
  nstest10: {
    id: "2436735",
    displayName: "NSTest_10 NetSuite Test 10",
  },
} as const;


export const ITEMS = {
  /** NS label: "[Hours] Consultancy services - T&M" */
  hoursConsultancyServicesTAndM: "582",
  /** NS label: "[Hours] Consultancy services - T&M Training" */
  hoursConsultancyServicesTAndMTraining: "9180",

} as const;

