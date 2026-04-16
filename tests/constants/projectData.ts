import { CUSTOMERS, DEPARTMENTS, EMPLOYEES, ITEMS } from "./lookups";
import { dateMonthsFromNow } from "../utils/dateUtils";

const FORMS = {
  /** NS label: "EG Project Form - Finance Custom" */
  egProjectFinanceCustom: "650",
} as const;

const JOB_TYPES = {
  /** NS label: verify in NS Setup > Projects > Job Types */
  customerProject:         "7",
  customerStandardProject: "8",
  internalAdministration:  "6",
} as const;

const PROJECT_CATEGORIES = {
  /** NS label: "Other" — verify in NS Setup > Projects > Project Categories */
  other: "5",
} as const;

const SCHEDULING_METHOD = {
  /** NS internal value: "BACKWARD" = "Backward" */
  backward: "BACKWARD",
  /** NS internal value: "FORWARD" = "Forward" */
  forward:  "FORWARD",
} as const;

const ENTITY_STATUS = {
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

const SHIP_TO_ENTITY = {
  /** NS internal value: -1 = "- New -" */
  new:              "-1",
  /** NS internal value: 1 = "Bill To" */
  billTo:           "1",
  /** NS internal value: 2 = "Ordered By/End User" */
  orderedByEndUser: "2",
  /** NS internal value: 3 = "Partner/Reseller" */
  partnerReseller:  "3",
} as const;

export const PROJECT_DATA = {
  customerProject: {
    form:                 FORMS.egProjectFinanceCustom,
    projectCategory:      PROJECT_CATEGORIES.other,
    customer:             CUSTOMERS.psykologLouiseWestergaard.id,
    subsidiary:           CUSTOMERS.psykologLouiseWestergaard.subsidiary,
    jobType:              JOB_TYPES.customerProject,
    projectManager:       EMPLOYEES.nstest10,
    defaultItem:          ITEMS.hoursConsultancyServicesTAndM,
    serviceItemTimeBased: ITEMS.hoursConsultancyServicesTAndM,
    department:           DEPARTMENTS.transfer,
    projectedEndDate:     dateMonthsFromNow(2),
    schedulingMethod:     SCHEDULING_METHOD.forward,
    projectStatus:        ENTITY_STATUS.inProgressGreen,
    shipToEntity:                   SHIP_TO_ENTITY.orderedByEndUser,
    billToAddress:                  CUSTOMERS.psykologLouiseWestergaard.primaryAddress,
    contactPerson:                  CUSTOMERS.psykologLouiseWestergaard.contactPerson,
    customerContractPortalAcce:     CUSTOMERS.psykologLouiseWestergaard.customerContractPortalAcce,
  }

} as const;
