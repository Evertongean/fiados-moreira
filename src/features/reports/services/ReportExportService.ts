import { buildReportCsv, buildReportFilename } from '@/features/reports/domain/reportCsv';
import type { FinancialReportSnapshot, ReportKind } from '@/features/reports/domain/reportTypes';

export interface ReportFileGateway {
  shareTemporaryCsv(filename: string, content: string): Promise<void>;
}

export class ReportExportService {
  constructor(private readonly gateway: ReportFileGateway) {}

  exportAndShare(
    kind: ReportKind,
    snapshot: FinancialReportSnapshot,
    timezone: string,
  ): Promise<void> {
    return this.gateway.shareTemporaryCsv(
      buildReportFilename(kind, snapshot),
      buildReportCsv(kind, snapshot, timezone),
    );
  }
}
