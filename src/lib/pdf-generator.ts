import jsPDF from 'jspdf';
import { Institute, Student, FeePayment, StudentFeeDue, ExamReportCardData } from '@/types/app.types';

/**
 * Generate and download Official Fee Receipt PDF
 */
export function generateFeeReceiptPdf({
  payment,
  due,
  student,
  institute,
}: {
  payment: FeePayment;
  due?: StudentFeeDue | null;
  student: Student;
  institute?: Institute | null;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Compact, mobile-friendly Indian receipt size
  });

  // Background Header
  doc.setFillColor(79, 70, 229); // Brand Indigo
  doc.rect(0, 0, 148, 28, 'F');

  // Institute Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(institute?.name || 'ClassDesk Education', 10, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${institute?.address || ''}, ${institute?.city || 'India'} | Phone: ${institute?.phone || ''}`, 10, 18);
  doc.text('OFFICIAL FEE PAYMENT RECEIPT', 10, 24);

  // Receipt Meta Grid
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Receipt No: ${payment.receipt_number}`, 10, 36);
  doc.text(`Date: ${new Date(payment.paid_at).toLocaleDateString('en-IN')}`, 95, 36);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(10, 40, 138, 40);

  // Student Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Student Name:', 10, 48);
  doc.setFont('helvetica', 'bold');
  doc.text(student.full_name, 38, 48);

  doc.setFont('helvetica', 'normal');
  doc.text('Admission / Roll:', 10, 55);
  doc.setFont('helvetica', 'bold');
  doc.text(`${student.admission_number || '-'} / Roll ${student.roll_number || '-'}`, 38, 55);

  doc.setFont('helvetica', 'normal');
  doc.text('Parent Name:', 90, 48);
  doc.setFont('helvetica', 'bold');
  doc.text(student.parent_name, 112, 48);

  doc.setFont('helvetica', 'normal');
  doc.text('Payment Mode:', 90, 55);
  doc.setFont('helvetica', 'bold');
  doc.text(payment.payment_method.toUpperCase(), 115, 55);

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(10, 62, 128, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Description', 14, 67);
  doc.text('Amount (INR)', 105, 67);

  // Table Body
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const feeTitle = due?.title || 'School & Tuition Composite Fee';
  doc.text(feeTitle, 14, 78);
  doc.text(`Rs. ${Number(payment.amount).toLocaleString('en-IN')}`, 105, 78);

  // Total Box
  doc.line(10, 85, 138, 85);
  doc.setFillColor(238, 242, 255);
  doc.rect(10, 87, 128, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('TOTAL PAID:', 70, 93);
  doc.text(`Rs. ${Number(payment.amount).toLocaleString('en-IN')}`, 105, 93);

  // Payment Note & Status
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  if (payment.razorpay_payment_id) {
    doc.text(`Razorpay ID: ${payment.razorpay_payment_id}`, 10, 105);
  }
  doc.text('Status: PAID & VERIFIED (System Generated)', 10, 110);

  // Signatures
  doc.text('Authorized Signatory / Cashier', 95, 125);
  doc.line(90, 121, 138, 121);

  doc.save(`Receipt_${payment.receipt_number}.pdf`);
}

/**
 * Generate and download Student Report Card PDF
 */
export function generateReportCardPdf(data: ExamReportCardData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top Banner
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 36, 'F');

  // Institute Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.institute.name, 15, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.institute.address || ''}, ${data.institute.city || ''}`, 15, 23);
  doc.text(`PROGRESS REPORT: ${data.exam.name.toUpperCase()}`, 15, 30);

  // Student Info Card
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 42, 180, 26, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Student Name:', 20, 50);
  doc.setFont('helvetica', 'bold');
  doc.text(data.student.full_name, 50, 50);

  doc.setFont('helvetica', 'normal');
  doc.text('Roll No:', 120, 50);
  doc.setFont('helvetica', 'bold');
  doc.text(data.student.roll_number || '-', 140, 50);

  doc.setFont('helvetica', 'normal');
  doc.text('Class / Batch:', 20, 58);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.classBatch.name} - Section ${data.classBatch.section || 'A'}`, 50, 58);

  doc.setFont('helvetica', 'normal');
  doc.text('Academic Year:', 120, 58);
  doc.setFont('helvetica', 'bold');
  doc.text(data.classBatch.academic_year, 150, 58);

  // Marks Table Header
  let y = 78;
  doc.setFillColor(79, 70, 229);
  doc.rect(15, y, 180, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Subject', 20, y + 6);
  doc.text('Max Marks', 85, y + 6);
  doc.text('Pass Marks', 115, y + 6);
  doc.text('Marks Obtained', 145, y + 6);
  doc.text('Grade', 180, y + 6);

  // Marks Rows
  y += 10;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');

  data.marks.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 8, 'F');
    }
    doc.text(item.subject.name, 20, y + 5.5);
    doc.text(String(item.maxMarks), 90, y + 5.5);
    doc.text(String(item.passMarks), 120, y + 5.5);
    doc.text(item.isAbsent ? 'ABSENT' : String(item.obtainedMarks ?? '-'), 150, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(item.grade, 183, y + 5.5);
    doc.setFont('helvetica', 'normal');
    y += 8;
  });

  // Total & Performance Summary
  y += 6;
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(15, y, 180, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(`Total Marks: ${data.totalObtained} / ${data.totalMax}`, 20, y + 8);
  doc.text(`Percentage: ${data.percentage.toFixed(1)}%`, 85, y + 8);
  doc.text(`Overall Grade: ${data.overallGrade}`, 145, y + 8);

  doc.setTextColor(16, 185, 129); // Green passed
  doc.text(`Result: ${data.result}`, 20, y + 15);
  if (data.rank) {
    doc.setTextColor(79, 70, 229);
    doc.text(`Class Rank: #${data.rank}`, 85, y + 15);
  }

  // Teacher Remarks
  y += 30;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Class Teacher Remarks:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    data.teacherRemarks || 'Consistent performance. Keep up the dedication and curiosity!',
    15,
    y + 6
  );

  // Signatures
  y += 35;
  doc.setDrawColor(148, 163, 184);
  doc.line(15, y, 65, y);
  doc.line(80, y, 130, y);
  doc.line(145, y, 195, y);

  doc.setFontSize(8);
  doc.text('Class Teacher', 25, y + 5);
  doc.text('Principal / Headmaster', 88, y + 5);
  doc.text('Parent Signature', 155, y + 5);

  doc.save(`ReportCard_${data.student.full_name}_${data.exam.name}.pdf`);
}
