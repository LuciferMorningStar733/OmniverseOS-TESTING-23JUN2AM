import os
import re
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def markdown_to_pdf(md_file_path, pdf_file_path):
    with open(md_file_path, "r", encoding="utf-8") as f:
        text = f.read()

    doc = SimpleDocTemplate(
        pdf_file_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#00F0FF'),
        spaceAfter=10
    )

    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=14,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )

    code_style = ParagraphStyle(
        'DocCode',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0F172A'),
        backColor=colors.HexColor('#F1F5F9'),
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=6
    )

    elements = []

    lines = text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        if not line:
            i += 1
            continue

        # Header 1
        if line.startswith('# '):
            elements.append(Paragraph(line[2:].strip(), title_style))
            elements.append(Spacer(1, 4))
            i += 1
            continue

        # Header 2
        if line.startswith('## '):
            elements.append(Paragraph(line[3:].strip(), h2_style))
            elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E2E8F0'), spaceAfter=8))
            i += 1
            continue

        # Header 3
        if line.startswith('### '):
            elements.append(Paragraph(line[4:].strip(), h2_style))
            i += 1
            continue

        # Horizontal rule
        if line.startswith('---'):
            elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceBefore=8, spaceAfter=8))
            i += 1
            continue

        # Code block
        if line.startswith('```'):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            if i < len(lines):
                i += 1
            code_text = "<br/>".join(code_lines).replace(" ", "&nbsp;")
            elements.append(Paragraph(code_text, code_style))
            continue

        # Table
        if line.startswith('|'):
            table_data = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                tline = lines[i].strip()
                if '---' in tline:
                    i += 1
                    continue
                cells = [c.strip() for c in tline.split('|')[1:-1]]
                table_data.append(cells)
                i += 1

            if table_data:
                formatted_data = []
                for row_idx, row in enumerate(table_data):
                    formatted_row = []
                    for col in row:
                        # Replace markdown bold
                        cleaned = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', col)
                        if row_idx == 0:
                            formatted_row.append(Paragraph(cleaned, table_header_style))
                        else:
                            if 'PASS' in col:
                                cleaned = cleaned.replace('PASS', '<font color="#10B981"><b>PASS</b></font>')
                            formatted_row.append(Paragraph(cleaned, table_cell_style))
                    formatted_data.append(formatted_row)

                # Determine col widths dynamically
                num_cols = len(table_data[0])
                available_width = 540  # 612 - 72
                if num_cols == 4:
                    col_widths = [130, 90, 240, 80]
                elif num_cols == 5:
                    col_widths = [75, 95, 80, 210, 80]
                else:
                    col_widths = [available_width / num_cols] * num_cols

                t = Table(formatted_data, colWidths=col_widths)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                    ('LEFTPADDING', (0, 0), (-1, -1), 5),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ]))
                elements.append(Spacer(1, 4))
                elements.append(t)
                elements.append(Spacer(1, 8))
            continue

        # Bullet list
        if line.startswith('- ') or line.startswith('* '):
            bullet_text = line[2:].strip()
            bullet_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', bullet_text)
            bullet_text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', bullet_text)
            elements.append(Paragraph(f"• {bullet_text}", body_style))
            i += 1
            continue

        # Numbered list
        if re.match(r'^\d+\.', line):
            num_text = line.split('.', 1)[1].strip()
            num_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', num_text)
            num_text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', num_text)
            elements.append(Paragraph(line, body_style))
            i += 1
            continue

        # Standard paragraph
        p_text = line
        p_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', p_text)
        p_text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', p_text)
        elements.append(Paragraph(p_text, body_style))
        i += 1

    doc.build(elements)
    print(f"Successfully generated PDF at: {pdf_file_path}")

if __name__ == '__main__':
    md_path = r"c:\Users\mabdu\OmniverseOS-TESTING-23JUN2AM\OMNIVERSEOS_FINAL_SHIP_CERTIFICATION.md"
    pdf_path = r"c:\Users\mabdu\OmniverseOS-TESTING-23JUN2AM\OMNIVERSEOS_FINAL_SHIP_CERTIFICATION.pdf"
    markdown_to_pdf(md_path, pdf_path)
