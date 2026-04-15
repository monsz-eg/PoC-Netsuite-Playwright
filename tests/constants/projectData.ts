import { ADDRESSES, CATEGORIES, CUSTOMERS, DEPARTMENTS, EMPLOYEES, ENTITY_STATUS, FORMS, ITEMS, SCHEDULING_METHOD, SHIP_TO_ENTITY } from "./lookups";
import { dateMonthsFromNow } from "../utils/dateUtils";

const JOB_TYPES = {
  /** NS label: verify in NS Setup > Projects > Job Types */
  customerProject:         "7",
  customerStandardProject: "8",
  internalAdministration:  "6",
} as const;

export const PROJECT_DATA = {
  customerProject: {
    form:                 FORMS.egProjectFinanceCustom,
    projectCategory:      CATEGORIES.category5,
    customer:             CUSTOMERS.psykologLouiseWestergaard,
    jobType:              JOB_TYPES.customerProject,
    projectManager:       EMPLOYEES.nstest10,
    defaultItem:          ITEMS.hoursConsultancyServicesTAndM,
    serviceItemTimeBased: ITEMS.hoursConsultancyServicesTAndM,
    department:           DEPARTMENTS.transfer,
    projectedEndDate:     dateMonthsFromNow(2),
    schedulingMethod:     SCHEDULING_METHOD.forward,
    projectStatus:        ENTITY_STATUS.inProgressGreen,
    shipToEntity:                   SHIP_TO_ENTITY.orderedByEndUser,
    billToAddress:                  ADDRESSES.primaryAddress,
    contactPerson:                  EMPLOYEES.nstest13,
    customerContractPortalAcce:     EMPLOYEES.testUser,
  },
} as const;
