// Auto-generated seed data: the June/July 2026 ESE schedule (39 exam rows).
// Staff are referenced by NAME and resolved to the seeded ExamStaff records.

export interface SeedScheduledExam {
  orderIndex: number;
  serialCode: string | null;
  startAtLabel: string | null;
  examDate: string | null;
  weekday: string | null;
  revisedDate: string | null;
  intake: string | null;
  courseCode: string | null;
  courseName: string | null;
  expectedCount: number | null;
  session1: string | null;
  session2: string | null;
  session3: string | null;
  location: string | null;
  chiefExaminers: string[];
  supervisors: string[];
  invigilators: string[];
  supporting: string[];
}

export interface SeedSchedule {
  name: string;
  startDate: string;
  endDate: string;
  exams: SeedScheduledExam[];
}

export const juneJulySchedule: SeedSchedule = {
  "name": "June/July ESE Schedule (28 Jun – 25 Jul 2026)",
  "startDate": "2026-06-28",
  "endDate": "2026-07-25",
  "exams": [
    {
      "orderIndex": 0,
      "serialCode": "2026/165",
      "startAtLabel": "28. June",
      "examDate": "2026-06-28",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "3B WE/MOHE WE",
      "courseCode": "BMBA1212",
      "courseName": "Human Resource Management",
      "expectedCount": 62,
      "session1": "9.00-11.30am",
      "session2": null,
      "session3": null,
      "location": "Level 6 - CA Sri Lanka",
      "chiefExaminers": [
        "Dilshan Dissanayake",
        "Nipunee Jayasuriya"
      ],
      "supervisors": [
        "Hasitha",
        "Sandun"
      ],
      "invigilators": [
        "Ishanka",
        "Sasini"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 1,
      "serialCode": "2026/167",
      "startAtLabel": "28. June",
      "examDate": "2026-06-28",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "19B WE/ MOHE WE",
      "courseCode": "BSAA12033",
      "courseName": "Marketing Management",
      "expectedCount": 164,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": "Level 1 Main Hall - CA Sri Lanka",
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 2,
      "serialCode": "2026/168",
      "startAtLabel": "28. June",
      "examDate": "2026-06-28",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "17B/MOHE WD WE",
      "courseCode": "BSAA 32013",
      "courseName": "Governance, Ethics and Risk Management",
      "expectedCount": 170,
      "session1": null,
      "session2": "1.00- 4.00pm",
      "session3": null,
      "location": "Level 1 Main Hall - CA Sri Lanka / Level 6  - CASL _ (Only Repeat/Medical Students)",
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 3,
      "serialCode": "2026/169",
      "startAtLabel": "28. June",
      "examDate": "2026-07-04",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "3B WE/MOHE WE",
      "courseCode": "BMBA1223",
      "courseName": "Statistical Methods for Management Decisions",
      "expectedCount": 62,
      "session1": null,
      "session2": "1.00- 4.00pm",
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Sirini Punsara"
      ],
      "supervisors": [
        "Pasindu",
        "Sandun"
      ],
      "invigilators": [
        "Ishanka",
        "Sasini",
        "Niyumi",
        "Nimansha"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 4,
      "serialCode": "2026/170",
      "startAtLabel": "28. June",
      "examDate": "2026-07-04",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "19B WE/ MOHE WE",
      "courseCode": "BSAA 12023",
      "courseName": "Cost & Management Accounting",
      "expectedCount": 164,
      "session1": null,
      "session2": "1.00- 4.00pm",
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 5,
      "serialCode": "2026/171",
      "startAtLabel": "28. June",
      "examDate": "2026-07-04",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "17B/MOHE WD WE",
      "courseCode": "BSAA 32024",
      "courseName": "Corporate Taxation",
      "expectedCount": 170,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 6,
      "serialCode": "2026/172",
      "startAtLabel": "28. June",
      "examDate": "2026-07-05",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "3B WE/MOHE WE",
      "courseCode": "BMBA1232",
      "courseName": "Principles of Economics",
      "expectedCount": 62,
      "session1": "9.00- 11.30am",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Supun Madhushanka"
      ],
      "supervisors": [
        "Hasitha",
        "Sandun"
      ],
      "invigilators": [
        "Thilanka",
        "Ishanka",
        "Sasini",
        "Niyumi"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 7,
      "serialCode": "2026/173",
      "startAtLabel": "28. June",
      "examDate": "2026-07-05",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "19B WE/ MOHE WE",
      "courseCode": "BSAA 12033",
      "courseName": "Marketing Management",
      "expectedCount": 164,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 8,
      "serialCode": "2026/174",
      "startAtLabel": "05. July",
      "examDate": "2026-07-05",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "18B WE",
      "courseCode": "BSAA 22023",
      "courseName": "Advanced Management Accounting",
      "expectedCount": 100,
      "session1": null,
      "session2": "1.00- 4.00pm",
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 9,
      "serialCode": "2026/175",
      "startAtLabel": "05. July",
      "examDate": "2026-07-05",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "2B WE/ WD",
      "courseCode": "BMBA2212",
      "courseName": "Customer Analytics",
      "expectedCount": 37,
      "session1": null,
      "session2": "1.00-3.30pm",
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 10,
      "serialCode": "2026/176",
      "startAtLabel": "06. July",
      "examDate": "2026-07-07",
      "weekday": "Tuesday",
      "revisedDate": null,
      "intake": "3A WD/MOHE WD",
      "courseCode": "BMBA2112",
      "courseName": "Business Analytical Techniques",
      "expectedCount": 28,
      "session1": "9.00-11.30am",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Isuri Samarawickrama"
      ],
      "supervisors": [
        "Hasitha"
      ],
      "invigilators": [
        "Thilanka",
        "Niyumi",
        "Ishanka",
        "Sasini",
        "Vajira"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 11,
      "serialCode": "2026/177",
      "startAtLabel": "06. July",
      "examDate": "2026-07-07",
      "weekday": "Tuesday",
      "revisedDate": null,
      "intake": "19A WD/MOHE WD",
      "courseCode": "BSAA 21013",
      "courseName": "Financial Reporting",
      "expectedCount": 86,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 12,
      "serialCode": "2026/178",
      "startAtLabel": "06. July",
      "examDate": "2026-07-09",
      "weekday": "Thursday",
      "revisedDate": null,
      "intake": "3A WD/MOHE WD",
      "courseCode": "BMBA2123",
      "courseName": "Financial Management",
      "expectedCount": 28,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Nishanthini Simon"
      ],
      "supervisors": [
        "Hasitha"
      ],
      "invigilators": [
        "Thilanka",
        "Niyumi",
        "Ishanka",
        "Sasini",
        "Vajira"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 13,
      "serialCode": "2026/179",
      "startAtLabel": "06. July",
      "examDate": "2026-07-09",
      "weekday": "Thursday",
      "revisedDate": null,
      "intake": "19A WD/MOHE WD",
      "courseCode": "BSAA 21032",
      "courseName": "Human Resource Management",
      "expectedCount": 86,
      "session1": "9.00-11.30am",
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 14,
      "serialCode": "2026/180",
      "startAtLabel": "06. July",
      "examDate": "2026-07-14",
      "weekday": "Tuesday",
      "revisedDate": null,
      "intake": "3A WD/MOHE WD",
      "courseCode": "BMBA2132",
      "courseName": "Marketing Management",
      "expectedCount": 28,
      "session1": "9.00-11.30am",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Dilshan Dissanayake"
      ],
      "supervisors": [
        "Hasitha"
      ],
      "invigilators": [
        "Thilanka",
        "Niyumi",
        "Ishanka",
        "Sasini"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 15,
      "serialCode": "2026/181",
      "startAtLabel": "06. July",
      "examDate": "2026-07-14",
      "weekday": "Tuesday",
      "revisedDate": null,
      "intake": "19A WD/MOHE WD",
      "courseCode": "BSAA 21023",
      "courseName": "Business Processes, Controls & Audits",
      "expectedCount": 86,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 16,
      "serialCode": "2026/182",
      "startAtLabel": "28. June",
      "examDate": "2026-07-05",
      "weekday": "Sunday",
      "revisedDate": "2026-07-11",
      "intake": "17B/MOHE WD WE",
      "courseCode": "BSAA 32034",
      "courseName": "Package Based Data Analysis",
      "expectedCount": 170,
      "session1": null,
      "session2": "1.00- 4.00pm",
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Lakdinithi Subasinghe"
      ],
      "supervisors": [
        "Hasitha",
        "Sandun"
      ],
      "invigilators": [
        "Ishanka",
        "Sasini",
        "Niyumi",
        "Viraj",
        "Vajira",
        "Salinda"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 17,
      "serialCode": "2026/183",
      "startAtLabel": "28. June",
      "examDate": "2026-07-11",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "3B WE/MOHE WE",
      "courseCode": "BMBA1242",
      "courseName": "Leadership in Organizations",
      "expectedCount": 62,
      "session1": null,
      "session2": "1.00- 3.30pm",
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 18,
      "serialCode": "2026/184",
      "startAtLabel": "28. June",
      "examDate": "2026-07-11",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "19B WE/ MOHE WE",
      "courseCode": "BSAA 12042",
      "courseName": "Business Economics",
      "expectedCount": 164,
      "session1": "9.00-11.30am",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 19,
      "serialCode": "2026/185",
      "startAtLabel": "05. July",
      "examDate": "2026-07-11",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "18B WE",
      "courseCode": "BSAA 22033",
      "courseName": "Audit & Assurance",
      "expectedCount": 100,
      "session1": "9.00 - 12.00am",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 20,
      "serialCode": "2026/186",
      "startAtLabel": "05. July",
      "examDate": "2026-07-11",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "2B WE/ WD",
      "courseCode": "BMBA2233",
      "courseName": "Data Science and Visualization for Business (Practical)",
      "expectedCount": 37,
      "session1": "9.00 - 12.00pm",
      "session2": null,
      "session3": null,
      "location": "IT Lab SAB Campus",
      "chiefExaminers": [
        "Nishanthini Simon"
      ],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 21,
      "serialCode": "2026/187",
      "startAtLabel": "28. June",
      "examDate": "2026-07-12",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "3B WE/MOHE WE",
      "courseCode": "BMBA1262",
      "courseName": "Accounting Information Systems",
      "expectedCount": 62,
      "session1": null,
      "session2": "1.00- 3.30pm",
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Ishara Ranasinghe"
      ],
      "supervisors": [
        "Shashinika",
        "Sandun"
      ],
      "invigilators": [
        "Thilanka",
        "Ishanka",
        "Sasini",
        "Niyumi"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 22,
      "serialCode": "2026/188",
      "startAtLabel": "28. June",
      "examDate": "2026-07-12",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "19B WE/ MOHE WE",
      "courseCode": "BSAA 12062",
      "courseName": "Business Taxation",
      "expectedCount": 164,
      "session1": null,
      "session2": "1.00- 3.30pm",
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 23,
      "serialCode": "2026/189",
      "startAtLabel": "05. July",
      "examDate": "2026-07-12",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "18B WE",
      "courseCode": "BSAA 22043",
      "courseName": "Operations Management",
      "expectedCount": 100,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 24,
      "serialCode": "2026/190",
      "startAtLabel": "05. July",
      "examDate": "2026-07-12",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "2B WE/ WD",
      "courseCode": "BMBA2262",
      "courseName": "Competitor Analysis and Market Intelligence",
      "expectedCount": 37,
      "session1": "9.00- 11.30am",
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 25,
      "serialCode": "2026/191",
      "startAtLabel": "06. July",
      "examDate": "2026-07-16",
      "weekday": "Thursday",
      "revisedDate": null,
      "intake": "3A WD/MOHE WD",
      "courseCode": "BMBA2153",
      "courseName": "Cost and Management Accounting",
      "expectedCount": 28,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Ishara Ranasinghe"
      ],
      "supervisors": [
        "Hasitha"
      ],
      "invigilators": [
        "Thilanka",
        "Niyumi",
        "Ishanka",
        "Sasini"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 26,
      "serialCode": "2026/192",
      "startAtLabel": "06. July",
      "examDate": "2026-07-16",
      "weekday": "Thursday",
      "revisedDate": null,
      "intake": "19A WD/MOHE WD",
      "courseCode": "BSAA 21053",
      "courseName": "Business Finance",
      "expectedCount": 86,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 27,
      "serialCode": "2026/193",
      "startAtLabel": "06. July",
      "examDate": "2026-07-21",
      "weekday": "Tuesday",
      "revisedDate": null,
      "intake": "3A WD/MOHE WD",
      "courseCode": "BMBA2142",
      "courseName": "Descriptive Analytics & Data Management",
      "expectedCount": 28,
      "session1": "9.00-11.30am",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Lakdinithi Subasinghe"
      ],
      "supervisors": [
        "Hasitha"
      ],
      "invigilators": [
        "Thilanka",
        "Niyumi",
        "Ishanka",
        "Sasini"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 28,
      "serialCode": "2026/194",
      "startAtLabel": "06. July",
      "examDate": "2026-07-21",
      "weekday": "Tuesday",
      "revisedDate": null,
      "intake": "19A WD/MOHE WD",
      "courseCode": "BSAA 21042",
      "courseName": "Management Information Systems",
      "expectedCount": 86,
      "session1": "9.00-11.30am",
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 29,
      "serialCode": "2026/195",
      "startAtLabel": "06. July",
      "examDate": "2026-07-23",
      "weekday": "Thursday",
      "revisedDate": null,
      "intake": "3A WD/MOHE WD",
      "courseCode": "BMBA2163",
      "courseName": "Digital Transformation",
      "expectedCount": 28,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Supun Madhushanka"
      ],
      "supervisors": [
        "Hasitha"
      ],
      "invigilators": [
        "Thilanka",
        "Niyumi",
        "Ishanka",
        "Sasini"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 30,
      "serialCode": "2026/196",
      "startAtLabel": "06. July",
      "examDate": "2026-07-23",
      "weekday": "Thursday",
      "revisedDate": null,
      "intake": "19A WD/MOHE WD",
      "courseCode": "BSAA 21062",
      "courseName": "Business Communication & Skill Development II",
      "expectedCount": 86,
      "session1": "9.00-11.30am",
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 31,
      "serialCode": "2026/197",
      "startAtLabel": "28. June",
      "examDate": "2026-07-18",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "3B WE/MOHE WE",
      "courseCode": "BMBA1253",
      "courseName": "Foundations of Business Analytics (Practical)",
      "expectedCount": 62,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": "SAB IT Lab",
      "chiefExaminers": [
        "Nipunee Jayasuriya"
      ],
      "supervisors": [
        "Hasitha",
        "Sandun"
      ],
      "invigilators": [
        "Thilanka",
        "Niyumi",
        "Ishanka",
        "Sasini",
        "Salinda"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 32,
      "serialCode": "2026/199",
      "startAtLabel": "05. July",
      "examDate": "2026-07-18",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "2B WE/ WD",
      "courseCode": "BMBA2223",
      "courseName": "Predictive Analytics with Excel (Practical)",
      "expectedCount": 37,
      "session1": null,
      "session2": "1.00-4.00pm",
      "session3": null,
      "location": "SAB IT Lab",
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 33,
      "serialCode": "2026/198",
      "startAtLabel": "28. June",
      "examDate": "2026-07-18",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "19B WE/ MOHE WE",
      "courseCode": "BSAA 12052",
      "courseName": "Business Statistics & Forecasting",
      "expectedCount": 164,
      "session1": "9.00-11.30am",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [
        "Isuri Chandeepa"
      ],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 34,
      "serialCode": "2026/200",
      "startAtLabel": "05. July",
      "examDate": "2026-07-18",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "18B WE",
      "courseCode": "BSAA 22053",
      "courseName": "Corporate Law",
      "expectedCount": 100,
      "session1": "9.00 - 12.00pm",
      "session2": null,
      "session3": null,
      "location": "New Building  Ranjanaaz - 7 Story",
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 35,
      "serialCode": "2026/201",
      "startAtLabel": "05. July",
      "examDate": "2026-07-19",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "18B WE",
      "courseCode": "BSAA 22013",
      "courseName": "Accounting in Digital Environment (Practical)",
      "expectedCount": 110,
      "session1": "9.00-12.00pm",
      "session2": "1.00-4.00pm",
      "session3": null,
      "location": "SAB IT Lab",
      "chiefExaminers": [
        "Malintha Perera"
      ],
      "supervisors": [
        "Shashinika",
        "Sandun"
      ],
      "invigilators": [
        "Thilanka",
        "Sasini",
        "Salinda"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 36,
      "serialCode": "2026/202",
      "startAtLabel": "05. July",
      "examDate": "2026-07-19",
      "weekday": "Sunday",
      "revisedDate": null,
      "intake": "2B WE/ WD",
      "courseCode": "BMBA2253",
      "courseName": "Operations Analytics",
      "expectedCount": 37,
      "session1": "9.00-12.00pm",
      "session2": null,
      "session3": null,
      "location": "SAB Campus",
      "chiefExaminers": [
        "Isuri Samarawickrama"
      ],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    },
    {
      "orderIndex": 37,
      "serialCode": "2026/203",
      "startAtLabel": "05. July",
      "examDate": "2026-07-25",
      "weekday": "Saturday",
      "revisedDate": null,
      "intake": "2B WE/ WD",
      "courseCode": "BMBA2243",
      "courseName": "Big Data Analytics (Practical)",
      "expectedCount": 37,
      "session1": "9.00 - 12.00pm",
      "session2": null,
      "session3": null,
      "location": "SAB IT Lab",
      "chiefExaminers": [
        "Isuri Samarawickrama"
      ],
      "supervisors": [
        "Sandun"
      ],
      "invigilators": [
        "Ishanka",
        "Niyumi",
        "Salinda"
      ],
      "supporting": [
        "Roshan"
      ]
    },
    {
      "orderIndex": 38,
      "serialCode": "2026/204",
      "startAtLabel": null,
      "examDate": "2026-07-29",
      "weekday": "Wednesday",
      "revisedDate": null,
      "intake": "17B/MOHE WD WE",
      "courseCode": "BSAA 32054",
      "courseName": "Internship in Accounting II",
      "expectedCount": null,
      "session1": null,
      "session2": null,
      "session3": null,
      "location": null,
      "chiefExaminers": [],
      "supervisors": [],
      "invigilators": [],
      "supporting": []
    }
  ]
};
