// import { MainEmployeeRole, MainJobType, MainLanguageLevel } from 'enums';
// import { BackendRef } from 'types';
//
// export interface MainContact {
//   link?: string;
//   name: string;
//   value: string;
//   isPublic: boolean;
// }
//
// export interface MainCertificate {
//   organization: string;
//   link: string;
//   name: string;
//   date: Date;
// }
//
// export interface MainLanguage {
//   name: string;
//   level: MainLanguageLevel;
// }
//
// export interface MainEducation {
//   title: string;
//   place: string;
//   city: string;
//   country: string;
//   startDate: Date;
//   endDate?: Date;
// }
//
// export interface MainJob {
//   title: string;
//   type: MainJobType;
//   isPublic: boolean;
// }
//
// export interface MainIdentity {
//   job: BackendRef<MainJob>;
//   fullName: string;
//   summary: string[];
//   isPublic: boolean;
// }
//
// export interface MainContact {
//   name: string;
//   value: string;
//   // type: MainContactType;
//   link?: string;
//   isPublic: boolean;
// }
//
// export interface MainCompany {
//   name: string;
//   summary: string;
//   link?: string;
// }
//
// export interface MainProject {
//   name?: string;
//   link?: string;
//   repo?: string;
//   domain: string;
//   role: MainEmployeeRole;
//   isPersonal: boolean;
//   responsibilities: string[];
//   stack: string[];
// }
//
// export interface MainExperience {
//   projects: BackendRef<MainProject>[];
//   company: BackendRef<MainCompany>;
//   position: string;
//   startDate: Date;
//   endDate?: Date;
//   isPublic: boolean;
// }
//
// export interface MainCv {
//   identity: BackendRef<MainIdentity>;
//   job: BackendRef<MainJob>;
//   contacts: BackendRef<MainContact>[];
//   certificates: BackendRef<MainCertificate>[];
//   languages: BackendRef<MainLanguage>[];
//   workExperience: BackendRef<MainExperience>[];
//   education: BackendRef<MainEducation>[];
//   personalProjects: BackendRef<MainProject>[];
//   alias: string;
//   skills: string[];
//   isPrimary: boolean;
// }
