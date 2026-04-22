import { dateMonthsFromNow } from '../utils/dateUtils';
import {
  ACTIVITY_CODES,
  BILLING_CLASSES,
  CUSTOMERS,
  DEPARTMENTS,
  EMPLOYEES,
  ITEMS,
  PRODUCTS,
} from './lookups';

const FORMS = {
  /** NS label: "EG Project Form - Finance Custom" */
  egProjectFinanceCustom: '650',
} as const;

const JOB_TYPES = {
  /** NS label: verify in NS Setup > Projects > Job Types */
  customerProject: '7',
  customerStandardProject: '8',
  internalAdministration: '6',
} as const;

const PROJECT_CATEGORIES = {
  newImplementation: { id: '1', displayName: 'New implementation' },
  moduleNewOrUpgrade: { id: '2', displayName: 'Module (new or upgrade)' },
  upgrade: { id: '3', displayName: 'Upgrade' },
  change: { id: '4', displayName: 'Change' },
  other: { id: '5', displayName: 'Other' },
} as const;

const SCHEDULING_METHOD = {
  /** NS internal value: "BACKWARD" = "Backward" */
  backward: 'BACKWARD',
  /** NS internal value: "FORWARD" = "Forward" */
  forward: 'FORWARD',
} as const;

const ENTITY_STATUS = {
  /** NS internal value: 1 = "Closed" */
  closed: '1',
  /** NS internal value: 2 = "In Progress - GREEN" */
  inProgressGreen: '2',
  /** NS internal value: 3 = "In Progress - YELLOW" */
  inProgressYellow: '3',
  /** NS internal value: 4 = "In Progress - RED" */
  inProgressRed: '4',
  /** NS internal value: 5 = "Not Started" */
  notStarted: '5',
} as const;

const SHIP_TO_ENTITY = {
  /** NS internal value: -1 = "- New -" */
  new: '-1',
  /** NS internal value: 1 = "Bill To" */
  billTo: '1',
  /** NS internal value: 2 = "Ordered By/End User" */
  orderedByEndUser: '2',
  /** NS internal value: 3 = "Partner/Reseller" */
  partnerReseller: '3',
} as const;

const TASK_STATUSES = {
  notStarted: 'NOTSTART',
  inProgress: 'PROGRESS',
  completed: 'COMPLETE',
} as const;

const TASK_STATUS_LABELS = {
  notStarted: 'Not Started',
  inProgress: 'In Progress',
  completed: 'Completed',
} as const;

export const PROJECT_TASK_DATA = {
  customerProjectTask: {
    activityCode: ACTIVITY_CODES.professionalServices,
    mainProduct: PRODUCTS.checkWare.id,
    subProduct: PRODUCTS.checkWare.checkWareMain.id,
    productItem: PRODUCTS.checkWare.checkWareMain.items.checkWareMain.id,
    projectCategory: PROJECT_CATEGORIES.other.id,
    projectCategoryDisplayName: PROJECT_CATEGORIES.other.displayName,
    defaultItem: ITEMS.hoursConsultancyServicesTAndM.id,
    defaultItemDisplayName: ITEMS.hoursConsultancyServicesTAndM.displayName,
    status: TASK_STATUSES.notStarted,
    statusDisplayName: TASK_STATUS_LABELS.notStarted,
    plannedWork: '1',
    startDate: dateMonthsFromNow(0),
    endDate: dateMonthsFromNow(2),
    assignee: {
      resource: EMPLOYEES.nstest10.id,
      plannedWork: '1',
      /** billingClass is not auto-populated for this resource — must be set manually */
      billingClass: BILLING_CLASSES.consultant.id,
      /** Expected values auto-populated by NS after resource is selected */
      units: '100.0%',
      serviceItem: ITEMS.hoursConsultancyServicesTAndM.id,
      billingClassPrepopulated: '',
    },
  },
} as const;

const CHARGE_RULE_TYPES = {
  /** NS internal value: "TIMEBASED" = "Time-Based" */
  timeBased: 'TIMEBASED',
  /** NS internal value: "MILESTONE" = "Milestone" */
  milestone: 'MILESTONE',
  /** NS internal value: "FIXEDDATE" = "Fixed Date" */
  fixedDate: 'FIXEDDATE',
  /** NS internal value: "EXPENSEBASED" = "Expense-Based" */
  expenseBased: 'EXPENSEBASED',
} as const;

const CHARGE_RULE_TYPE_LABELS = {
  timeBased: 'Time-Based',
  milestone: 'Milestone',
  fixedDate: 'Fixed Date',
  expenseBased: 'Expense-Based',
} as const;

const RATE_SOURCE_TYPES = {
  /** Use each resource's rate — driven by resource rate overrides on this rule */
  resources: 'RESOURCES',
  /** Use billing class rates — requires a billing rate card */
  billingClasses: 'CLASSES',
  /** Use service item rates — requires a service item */
  serviceItems: 'ITEMS',
} as const;

const CHARGE_RULE_STAGES = {
  /** NS internal value: "READY_FOR_BILLING" = "Ready for Billing" */
  readyForBilling: { id: 'READY_FOR_BILLING', displayName: 'Ready' },
} as const;

const BILLING_RATE_CARDS = {
  /** NS label: "A-Data - Standard - Time and material - Customer Standard Projects" */
  aDataStandardTimeAndMaterialCustomerStandardProjects: '443',
} as const;

const TIME_UNITS = {
  /** NS internal value: 1 = "Hours" */
  hours: '1',
} as const;

export const CHARGE_RULE_DATA = {
  timeBasedForCustomerProjectTask: {
    chargeRuleType: CHARGE_RULE_TYPES.timeBased,
    chargeRuleTypeDisplayName: CHARGE_RULE_TYPE_LABELS.timeBased,
    rateSourceType: RATE_SOURCE_TYPES.billingClasses,
    billingRateCard: BILLING_RATE_CARDS.aDataStandardTimeAndMaterialCustomerStandardProjects,
    saleUnit: TIME_UNITS.hours,
    description: 'Auto-generated time-based charge rule',
    /** Item filter enforced by SuiteScript UE ue_makeChargeRuleMandatory.js */
    itemFilter: ITEMS.hoursConsultancyServicesTAndM.id,
    itemFilterDescription: 'is .[Hours] Consultancy services - T&M',
    stageDisplayName: CHARGE_RULE_STAGES.readyForBilling.displayName,
  },
} as const;

export const PROJECT_DATA = {
  customerProject: {
    form: FORMS.egProjectFinanceCustom,
    projectCategory: PROJECT_CATEGORIES.other.id,
    customer: CUSTOMERS.psykologLouiseWestergaard.id,
    subsidiary: CUSTOMERS.psykologLouiseWestergaard.subsidiary,
    jobType: JOB_TYPES.customerProject,
    projectManager: EMPLOYEES.nstest10.id,
    projectManagerDisplayName: EMPLOYEES.nstest10.displayName,
    customerDisplayName: CUSTOMERS.psykologLouiseWestergaard.displayName,
    defaultItem: ITEMS.hoursConsultancyServicesTAndM.id,
    serviceItemTimeBased: ITEMS.hoursConsultancyServicesTAndM.id,
    department: DEPARTMENTS.transfer,
    projectedEndDate: dateMonthsFromNow(2),
    schedulingMethod: SCHEDULING_METHOD.forward,
    projectStatus: ENTITY_STATUS.inProgressGreen,
    shipToEntity: SHIP_TO_ENTITY.orderedByEndUser,
    billToAddress: CUSTOMERS.psykologLouiseWestergaard.primaryAddress,
    contactPerson: CUSTOMERS.psykologLouiseWestergaard.contactPerson,
    customerContractPortalAccess: CUSTOMERS.psykologLouiseWestergaard.customerContractPortalAcce,
  },
} as const;
