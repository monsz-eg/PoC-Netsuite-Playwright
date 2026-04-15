/**
 * NS internal ID lookup tables.
 * Verify labels via NS Field Help (click field label) or the relevant NS list record.
 *
 * Exported for use within tests/constants/ only — tests import from the data files, not here.
 */

export const CATEGORIES = {
  /** NS label: verify in NS Setup > Projects > Project Categories */
  category5: "5",
} as const;

export const ADDRESSES = {
  /**
   * NS label: "Primary Address" — selected in custentity_eg_bill_to_address dropdown.
   * Selecting this auto-populates custentity_eg_bill_to from the customer's address tab.
   */
  primaryAddress: "66536",
} as const;

export const CUSTOMERS = {
  /** NS label: "006954 Psykolog Louise H. Westergaard" */
  psykologLouiseWestergaard: "142832",
} as const;

export const DEPARTMENTS = {
  /** NS label: verify in NS Setup > Company > Departments */
  transfer: "236",
} as const;

export const EMPLOYEES = {
  /** NS label: nstest10 */
  nstest10: "2436735",
  /** NS label: nstest13 */
  nstest13: "3158891",
  /** NS label: test user */
  testUser: "4753595",
} as const;

export const FORMS = {
  /** NS label: "EG Project Form - Finance Custom" */
  egProjectFinanceCustom: "650",
} as const;

export const SCHEDULING_METHOD = {
  /** NS internal value: "BACKWARD" = "Backward" */
  backward: "BACKWARD",
  /** NS internal value: "FORWARD" = "Forward" */
  forward:  "FORWARD",
} as const;

export const ENTITY_STATUS = {
  /** NS internal value: 1 = "Closed" */
  closed:           "1",
  /** NS internal value: 2 = "In Progress - GREEN" */
  inProgressGreen:  "2",
  /** NS internal value: 3 = "In Progress - YELLOW" */
  inProgressYellow: "3",
  /** NS internal value: 4 = "In Progress - RED" */
  inProgressRed:    "4",
  /** NS internal value: 5 = "Not Started" */
  notStarted:       "5",
} as const;

export const SHIP_TO_ENTITY = {
  /** NS internal value: -1 = "- New -" */
  new:              "-1",
  /** NS internal value: 1 = "Bill To" */
  billTo:           "1",
  /** NS internal value: 2 = "Ordered By/End User" */
  orderedByEndUser: "2",
  /** NS internal value: 3 = "Partner/Reseller" */
  partnerReseller:  "3",
} as const;

export const ITEMS = {
  /** NS label: "[Hours] Consultancy services - T&M" */
  hoursConsultancyServicesTAndM: "582",
  /** NS label: "[Hours] Consultancy services - T&M Training" */
  hoursConsultancyServicesTAndMTraining: "9180",

} as const;

