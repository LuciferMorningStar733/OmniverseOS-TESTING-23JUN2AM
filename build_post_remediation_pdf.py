import os
import re
import subprocess
import sys

MD_PATH = r"c:\Users\gamin\Desktop\OmniverseOS-TESTING-23JUN2AM-main\OmniverseOS-TESTING-23JUN2AM-main\OMNIVERSEOS_POST_REMEDIATION_FORENSIC_REPORT.md"
HTML_PATH = r"c:\Users\gamin\Desktop\OmniverseOS-TESTING-23JUN2AM-main\OmniverseOS-TESTING-23JUN2AM-main\OMNIVERSEOS_POST_REMEDIATION_FORENSIC_REPORT.html"
PDF_PATH = r"c:\Users\gamin\Desktop\OmniverseOS-TESTING-23JUN2AM-main\OmniverseOS-TESTING-23JUN2AM-main\OMNIVERSEOS_POST_REMEDIATION_FORENSIC_REPORT.pdf"
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(EDGE_PATH):
    EDGE_PATH = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

with open(MD_PATH, "r", encoding="utf-8") as f:
    md_content = f.read()

def escape_html(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def format_inline(text):
    text = escape_html(text)
    # Bold
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    # Italic
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
    # Code inline
    text = re.sub(r'`(.*?)`', r'<code>\1</code>', text)
    # Status icons/badges
    text = text.replace('🟢 PASS', '<span class="badge badge-pass">🟢 PASS</span>')
    text = text.replace('🟢 RETICLE VERIFIED', '<span class="badge badge-pass">🟢 RETICLE VERIFIED</span>')
    text = text.replace('🟢 FULLY WORKING', '<span class="badge badge-pass">🟢 FULLY WORKING</span>')
    text = text.replace('🟡 PARTIAL (P2)', '<span class="badge badge-warn">🟡 PARTIAL (P2)</span>')
    text = text.replace('🟡 PARTIALLY WORKING', '<span class="badge badge-warn">🟡 PARTIALLY WORKING</span>')
    text = text.replace('⚪ MOCK', '<span class="badge badge-mock">⚪ MOCK</span>')
    text = text.replace('🔴 FAIL (P0)', '<span class="badge badge-fail">🔴 FAIL (P0)</span>')
    text = text.replace('🔴 BROKEN', '<span class="badge badge-fail">🔴 BROKEN</span>')
    text = text.replace('FIXED', '<span class="badge badge-pass">FIXED</span>')
    return text

def render_markdown(md):
    lines = md.split("\n")
    html_lines = []
    in_code_block = False
    code_block_content = []
    code_lang = ""
    in_table = False
    table_lines = []
    in_list = False

    def flush_table():
        nonlocal in_table, table_lines, html_lines
        if not table_lines:
            in_table = False
            return
        header_line = table_lines[0]
        rows = table_lines[2:] if len(table_lines) > 2 else []
        headers = [c.strip() for c in header_line.split("|")[1:-1]]
        
        html_lines.append('<div class="no-break"><table>')
        html_lines.append('<thead><tr>')
        for h in headers:
            html_lines.append(f'<th>{format_inline(h)}</th>')
        html_lines.append('</tr></thead>')
        html_lines.append('<tbody>')
        for r in rows:
            cols = [c.strip() for c in r.split("|")[1:-1]]
            html_lines.append('<tr>')
            for c in cols:
                html_lines.append(f'<td>{format_inline(c)}</td>')
            html_lines.append('</tr>')
        html_lines.append('</tbody></table></div>')
        table_lines = []
        in_table = False

    def flush_list():
        nonlocal in_list, html_lines
        if in_list:
            html_lines.append('</ul>')
            in_list = False

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("```"):
            if in_code_block:
                html_lines.append(f'<pre><code>{escape_html(chr(10).join(code_block_content))}</code></pre>')
                code_block_content = []
                in_code_block = False
            else:
                flush_table()
                flush_list()
                in_code_block = True
                code_lang = stripped[3:].strip()
            continue

        if in_code_block:
            code_block_content.append(line)
            continue

        if stripped.startswith("|") and stripped.endswith("|"):
            flush_list()
            in_table = True
            table_lines.append(stripped)
            continue
        elif in_table:
            flush_table()

        if stripped.startswith("* ") or stripped.startswith("- "):
            flush_table()
            if not in_list:
                html_lines.append('<ul>')
                in_list = True
            item_text = stripped[2:]
            html_lines.append(f'<li>{format_inline(item_text)}</li>')
            continue
        else:
            flush_list()

        if stripped.startswith("# "):
            html_lines.append(f'<h1>{format_inline(stripped[2:])}</h1>')
        elif stripped.startswith("## "):
            html_lines.append(f'<h2>{format_inline(stripped[3:])}</h2>')
        elif stripped.startswith("### "):
            html_lines.append(f'<h3>{format_inline(stripped[4:])}</h3>')
        elif stripped.startswith("#### "):
            html_lines.append(f'<h4>{format_inline(stripped[5:])}</h4>')
        elif stripped == "---":
            html_lines.append('<hr/>')
        elif stripped.startswith("> "):
            html_lines.append(f'<blockquote>{format_inline(stripped[2:])}</blockquote>')
        elif stripped.startswith("$$") and stripped.endswith("$$"):
            clean_math = stripped.replace("$$", "").replace(r"\mathbf", "").replace(r"\longrightarrow", "→").replace("{", "").replace("}", "").replace("\\", "")
            html_lines.append(f'<div class="callout callout-math">{clean_math}</div>')
        elif stripped == "":
            pass
        else:
            html_lines.append(f'<p>{format_inline(stripped)}</p>')

    flush_table()
    flush_list()
    return "\n".join(html_lines)

body_html = render_markdown(md_content)

html_document = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OmniverseOS — Post-Remediation Forensic Audit & Certification Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {{
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-right {{
      content: counter(page);
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #71717a;
    }}
  }}

  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 9.5pt;
    line-height: 1.55;
    color: #18181b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
  }}

  h1 {{
    font-size: 19pt;
    font-weight: 800;
    color: #09090b;
    border-bottom: 2px solid #06b6d4;
    padding-bottom: 6px;
    margin-top: 0;
    margin-bottom: 14px;
    letter-spacing: -0.02em;
    page-break-after: avoid;
  }}

  h2 {{
    font-size: 13pt;
    font-weight: 700;
    color: #0f172a;
    border-left: 4px solid #06b6d4;
    padding-left: 8px;
    margin-top: 22px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }}

  h3 {{
    font-size: 10.5pt;
    font-weight: 600;
    color: #1e293b;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }}

  h4 {{
    font-size: 9.5pt;
    font-weight: 600;
    color: #334155;
    margin-top: 10px;
    margin-bottom: 4px;
    page-break-after: avoid;
  }}

  p {{
    margin-top: 0;
    margin-bottom: 8px;
    color: #27272a;
  }}

  ul {{
    margin-top: 0;
    margin-bottom: 8px;
    padding-left: 20px;
  }}

  li {{
    margin-bottom: 3px;
  }}

  code {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    background-color: #f1f5f9;
    color: #0f766e;
    padding: 1px 4px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }}

  pre {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.8pt;
    line-height: 1.4;
    background-color: #090d16;
    color: #38bdf8;
    padding: 10px 12px;
    border-radius: 6px;
    border: 1px solid #1e293b;
    overflow-x: auto;
    margin-top: 6px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }}

  pre code {{
    background: transparent;
    color: inherit;
    padding: 0;
    border: none;
    font-size: inherit;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
    margin-bottom: 12px;
    font-size: 8pt;
    page-break-inside: avoid;
  }}

  th {{
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #334155;
    font-size: 8pt;
  }}

  td {{
    padding: 5px 8px;
    border: 1px solid #e2e8f0;
    color: #1e293b;
    vertical-align: top;
  }}

  tr:nth-child(even) td {{
    background-color: #f8fafc;
  }}

  blockquote {{
    border-left: 3px solid #8b5cf6;
    margin: 8px 0;
    padding: 6px 12px;
    background-color: #faf5ff;
    color: #581c87;
    font-style: italic;
    page-break-inside: avoid;
  }}

  hr {{
    border: none;
    border-top: 1px solid #e4e4e7;
    margin: 16px 0;
  }}

  .badge {{
    display: inline-block;
    padding: 1px 5px;
    font-size: 7.2pt;
    font-weight: 600;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }}

  .badge-pass {{
    background-color: #dcfce7;
    color: #15803d;
    border: 1px solid #86efac;
  }}

  .badge-fail {{
    background-color: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fca5a5;
  }}

  .badge-warn {{
    background-color: #fef3c7;
    color: #b45309;
    border: 1px solid #fde68a;
  }}

  .badge-mock {{
    background-color: #f3f4f6;
    color: #4b5563;
    border: 1px solid #d1d5db;
  }}

  .callout-math {{
    background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%);
    color: #ffffff;
    font-weight: 800;
    font-size: 13pt;
    text-align: center;
    padding: 12px 18px;
    border-radius: 6px;
    letter-spacing: 0.05em;
    margin: 14px 0;
    page-break-inside: avoid;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }}

  .no-break {{
    page-break-inside: avoid;
  }}
</style>
</head>
<body>
{body_html}
</body>
</html>
"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html_document)

print(f"HTML report successfully written to: {HTML_PATH}")

cmd = [
    EDGE_PATH,
    "--headless",
    "--disable-gpu",
    "--run-all-compositor-stages-before-draw",
    f"--print-to-pdf={PDF_PATH}",
    "--no-pdf-header-footer",
    HTML_PATH
]

print("Rendering PDF via headless Edge...")
result = subprocess.run(cmd, capture_output=True, text=True)
if result.returncode == 0:
    print(f"PDF report successfully created at: {PDF_PATH}")
    print(f"PDF size: {os.path.getsize(PDF_PATH)} bytes")
else:
    print(f"PDF generation failed with return code {result.returncode}: {result.stderr}")
