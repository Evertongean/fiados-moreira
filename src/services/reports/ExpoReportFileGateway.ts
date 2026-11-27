import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { ReportFileGateway } from '@/features/reports/services/ReportExportService';

export class ExpoReportFileGateway implements ReportFileGateway {
  async shareTemporaryCsv(filename: string, content: string): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Compartilhamento indisponível neste dispositivo.');
    }
    const file = new File(Paths.cache, filename);
    try {
      file.create({ overwrite: true });
      await file.write(content);
      await Sharing.shareAsync(file.uri, {
        dialogTitle: 'Compartilhar relatório financeiro',
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
      });
    } finally {
      if (file.exists) file.delete();
    }
  }
}
