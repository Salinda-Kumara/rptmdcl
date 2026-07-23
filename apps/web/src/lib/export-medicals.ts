// Excel export for the Medical Submissions view in Admin / Staff panel.
import { MedicalSubmission, MEDICAL_STATUS_LABELS } from './medicals-api';
import { fmtDateTime } from './applications-api';

const fmtDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export interface MedicalExportRow {
  no: number;
  serialNumber: string;
  studentName: string;
  registrationNumber: string;
  nic: string;
  intake: string;
  contactNumbers: string;
  subjects: string;
  totalDays: string;
  status: string;
  submittedAt: string;
  reviewedBy: string;
  reviewedAt: string;
  reviewRemarks: string;
}

const COLUMNS: { header: string; key: keyof MedicalExportRow; width: number; wrap?: boolean }[] = [
  { header: '#', key: 'no', width: 8 },
  { header: 'Serial No.', key: 'serialNumber', width: 22 },
  { header: 'Student Name', key: 'studentName', width: 28 },
  { header: 'Registration No.', key: 'registrationNumber', width: 24 },
  { header: 'NIC / Passport', key: 'nic', width: 16 },
  { header: 'Intake', key: 'intake', width: 12 },
  { header: 'Contact Numbers', key: 'contactNumbers', width: 18 },
  { header: 'Absent Subjects', key: 'subjects', width: 40, wrap: true },
  { header: 'Leave Days', key: 'totalDays', width: 12 },
  { header: 'Status', key: 'status', width: 16 },
  { header: 'Submitted Date', key: 'submittedAt', width: 22 },
  { header: 'Reviewed By', key: 'reviewedBy', width: 24 },
  { header: 'Reviewed Date', key: 'reviewedAt', width: 22 },
  { header: 'Review Remarks', key: 'reviewRemarks', width: 30, wrap: true },
];

function saveBlob(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Build and download a styled .xlsx of the filtered medical submissions. */
export async function exportMedicalsExcel(items: MedicalSubmission[], meta: { filterNote?: string } = {}) {
  const ExcelJS: any = (await import('exceljs')).default ?? (await import('exceljs'));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SAB Campus ERMS';
  wb.created = new Date();
  const ws = wb.addWorksheet('Medical Submissions', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const NCOLS = COLUMNS.length;

  // Title Block
  ws.mergeCells(1, 1, 1, NCOLS);
  const titleRow = ws.getRow(1);
  titleRow.height = 28;
  const titleCell = titleRow.getCell(1);
  titleCell.value = 'MEDICAL SUBMISSIONS REPORT';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } }; // Rose-600
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Subtitle / Filter note
  ws.mergeCells(2, 1, 2, NCOLS);
  const subRow = ws.getRow(2);
  subRow.height = 18;
  const subCell = subRow.getCell(1);
  subCell.value = `Exported on: ${new Date().toLocaleString('en-LK')}${meta.filterNote ? ` | Filters: ${meta.filterNote}` : ''} | Total Records: ${items.length}`;
  subCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left' };

  ws.getRow(3).height = 8; // Spacer

  // Header Row
  const headerRow = ws.getRow(4);
  headerRow.height = 24;
  COLUMNS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9F1239' } }; // Rose-800
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF475569' } },
    };
    ws.getColumn(idx + 1).width = col.width;
  });

  // Data Rows
  items.forEach((m, idx) => {
    const rIdx = idx + 5;
    const row = ws.getRow(rIdx);
    row.height = 22;

    const ad: any = m.applicantDetails ?? {};
    const rowData: MedicalExportRow = {
      no: idx + 1,
      serialNumber: m.serialNumber || '—',
      studentName: m.student?.fullName || ad.fullName || '—',
      registrationNumber: m.student?.registrationNumber || ad.registrationNumber || '—',
      nic: m.student?.nic || ad.nic || '—',
      intake: ad.intake || '—',
      contactNumbers: ad.contactNumbers || '—',
      subjects: m.items.map((i) => `${i.subject.code} - ${i.subject.name} (${fmtDay(i.examDate)})`).join('; '),
      totalDays: m.totalDays != null ? String(m.totalDays) : '—',
      status: MEDICAL_STATUS_LABELS[m.status] || m.status,
      submittedAt: fmtDateTime(m.submittedAt),
      reviewedBy: m.reviewedBy || '—',
      reviewedAt: fmtDateTime(m.reviewedAt),
      reviewRemarks: m.reviewRemarks || '—',
    };

    const isZebra = idx % 2 === 1;

    COLUMNS.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = rowData[col.key];
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: !!col.wrap };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isZebra ? 'FFFDF2F8' : 'FFFFFFFF' }, // Soft rose tint zebra
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().slice(0, 10);
  saveBlob(buffer, `Medical_Submissions_${dateStr}.xlsx`);
}
