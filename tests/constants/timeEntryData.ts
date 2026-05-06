import { today } from '../utils/dateUtils';
import {
  ACTIVITY_CODES,
  BILLING_CLASSES,
  DEPARTMENTS,
  EMPLOYEES,
  ITEMS,
  JOB_GROUPS,
  PRODUCTS,
  REVENUE_CATEGORIES,
  SUBSIDIARIES,
} from './lookups';
import { PROJECT_TASK_DATA } from './projectData';

const TIME_ENTRY_APPROVAL_STATUS = {
  /** NS internal value: 1 — display label "Open" (verified live against SB3) */
  open: { id: '1', displayName: 'Open' },
  /** NS internal value: 3 — display label "Approved" (verified live against SB3) */
  approved: { id: '3', displayName: 'Approved' },
} as const;

export const TIME_ENTRY_DATA = {
  forProjectTask: {
    employee: EMPLOYEES.nstest10,
    item: ITEMS.hoursConsultancyServicesTAndM.id,
    hours: PROJECT_TASK_DATA.customerProjectTask.plannedWork,
    date: today(),
    /** Fields auto-populated on the timebill form when employee is set */
    employeeDefaults: {
      subsidiary: SUBSIDIARIES.egdk,
      billingClass: BILLING_CLASSES.consultant,
      department: DEPARTMENTS.netSuite,
    },
    /** Fields auto-populated on the timebill form when project is set */
    projectDefaults: {
      billingSubsidiary: SUBSIDIARIES.egdk,
      jobGroup: JOB_GROUPS.rAndD2,
      /** 'T' because nonbillabletask is not marked on the project task */
      isBillable: 'T',
    },
    /** Fields auto-populated on the timebill form when project task is set */
    projectTaskDefaults: {
      defaultRevenueCategoryItem: REVENUE_CATEGORIES.revenueProfessionalServices,
      mainProduct: PRODUCTS.checkWare,
      subProduct: PRODUCTS.checkWare.checkWareMain,
      productItem: PRODUCTS.checkWare.checkWareMain.items.checkWareMain,
      activityCode: ACTIVITY_CODES.professionalServices,
    },
    openStatus: TIME_ENTRY_APPROVAL_STATUS.open,
    approvedStatus: TIME_ENTRY_APPROVAL_STATUS.approved,
  },
} as const;
