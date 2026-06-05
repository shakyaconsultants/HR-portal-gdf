export const DESIGNATION_OPTIONS = [
  "Marketing Manager and Team",
  "HR Manager -Operations",
  "Floor Manager -Operations",
  "Quality Analyst",
  "Case Assessor and Supervisor",
  "Team Leader/Supervisor",
  "Agents International Financial Advisors",
  "Office Help",
  "Office Supervisor",
] as const;

export type DesignationOption = (typeof DESIGNATION_OPTIONS)[number];

export const JOINING_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
