import { ACTIVITY_CODES, BILLING_CLASSES, CUSTOMERS, DEPARTMENTS, EMPLOYEES, ITEMS, PRODUCTS } from "./lookups";
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
  newImplementation:  { id: "1", displayName: "New implementation" },
  moduleNewOrUpgrade: { id: "2", displayName: "Module (new or upgrade)" },
  upgrade:            { id: "3", displayName: "Upgrade" },
  change:             { id: "4", displayName: "Change" },
  other:              { id: "5", displayName: "Other" },
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

const TASK_STATUSES = {
  notStarted:  "NOTSTART",
  inProgress:  "PROGRESS",
  completed:   "COMPLETE",
} as const;

const TASK_STATUS_LABELS = {
  notStarted:  "Not Started",
  inProgress:  "In Progress",
  completed:   "Completed",
} as const;

export const PROJECT_TASK_DATA = {
  customerProjectTask: {
    activityCode:              ACTIVITY_CODES.professionalServices,
    mainProduct:               PRODUCTS.checkWare.id,
    subProduct:                PRODUCTS.checkWare.checkWareMain.id,
    productItem:               PRODUCTS.checkWare.checkWareMain.items.checkWareMain,
    projectCategory:           PROJECT_CATEGORIES.other.id,
    projectCategoryDisplayName: PROJECT_CATEGORIES.other.displayName,
    defaultItem:               ITEMS.hoursConsultancyServicesTAndM.id,
    defaultItemDisplayName:    ITEMS.hoursConsultancyServicesTAndM.displayName,
    status:                    TASK_STATUSES.notStarted,
    statusDisplayName:         TASK_STATUS_LABELS.notStarted,
    plannedWork:               "1",
    startDate:                 dateMonthsFromNow(0),
    endDate:                   dateMonthsFromNow(2),
    assignee: {
      resource:     EMPLOYEES.nstest10.id,
      plannedWork:  "1",
      /** billingClass is not auto-populated for this resource — must be set manually */
      billingClass: BILLING_CLASSES.consultant.id,
      /** Expected values auto-populated by NS after resource is selected */
      units:                    "100.0%",
      serviceItem:              ITEMS.hoursConsultancyServicesTAndM.id,
      billingClassPrepopulated: "",
    },
  },
} as const;

export const PROJECT_DATA = {
  customerProject: {
    form:                 FORMS.egProjectFinanceCustom,
    projectCategory:      PROJECT_CATEGORIES.other.id,
    customer:             CUSTOMERS.psykologLouiseWestergaard.id,
    subsidiary:           CUSTOMERS.psykologLouiseWestergaard.subsidiary,
    jobType:              JOB_TYPES.customerProject,
    projectManager:       EMPLOYEES.nstest10.id,
    projectManagerDisplayName: EMPLOYEES.nstest10.displayName,
    customerDisplayName:  CUSTOMERS.psykologLouiseWestergaard.displayName,
    defaultItem:          ITEMS.hoursConsultancyServicesTAndM.id,
    serviceItemTimeBased: ITEMS.hoursConsultancyServicesTAndM.id,
    department:           DEPARTMENTS.transfer,
    projectedEndDate:     dateMonthsFromNow(2),
    schedulingMethod:     SCHEDULING_METHOD.forward,
    projectStatus:        ENTITY_STATUS.inProgressGreen,
    shipToEntity:                   SHIP_TO_ENTITY.orderedByEndUser,
    billToAddress:                  CUSTOMERS.psykologLouiseWestergaard.primaryAddress,
    contactPerson:                  CUSTOMERS.psykologLouiseWestergaard.contactPerson,
    customerContractPortalAccess:   CUSTOMERS.psykologLouiseWestergaard.customerContractPortalAcce,
  }

} as const;
