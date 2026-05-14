/**
 * report-foundation-service.ts
 *
 * Thin compatibility adapter that re-exports the production report generator
 * under the original surface API.
 *
 * Purpose:
 *  - Routes and any callers that import from report-foundation-service continue
 *    to work unchanged.
 *  - All actual generation work is delegated to report-generator.ts (Puppeteer
 *    pipeline, HTML templates, DB persistence, content hashing).
 *
 * Migration note:
 *  - Future callers should import from report-generator.ts directly.
 *  - This module exists purely for backward compatibility.
 */

export type {
  FoundationReportType,
  ReportStatus,
  GeneratedReportRecord,
} from "./report-generator";

export {
  reportGeneratorService as reportFoundationService,
  reportGeneratorService,
  ReportGeneratorService,
} from "./report-generator";
