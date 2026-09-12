import os
import re
import subprocess
import sys

BASE_DIR = r"c:\Users\gamin\Desktop\OmniverseOS-TESTING-23JUN2AM-main\OmniverseOS-TESTING-23JUN2AM-main"
MD_PATH = os.path.join(BASE_DIR, "OMNIVERSEOS_FINAL_CRASH_AND_UI_CERTIFICATION.md")
HTML_PATH = os.path.join(BASE_DIR, "OMNIVERSEOS_FINAL_CRASH_AND_UI_CERTIFICATION.html")
PDF_PATH = os.path.join(BASE_DIR, "OMNIVERSEOS_FINAL_CRASH_AND_UI_CERTIFICATION.pdf")

EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
EDGE_PATH = next((p for p in EDGE_PATHS if os.path.exists(p)), None)

with open(MD_PATH, "r", encoding="utf-8") as f:
    md_content = f.read()

def escape_html(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def format_inline(text):
    text = escape_html(text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
    text = re.sub(r'`(.*?)`', r'<code>\1</code>', text)
    text = text.replace('🟢 PASS', '<span class="badge badge-pass">🟢 PASS</span>')
    text = text.replace('🟢 CERTIFIED PRODUCTION READY TO SHIP (99.9 / 100)', '<span class="badge badge-pass" style="font-size:14pt;padding:6px 14px;">🟢 CERTIFIED PRODUCTION READY TO SHIP (99.9 / 100)</span>')
    text = text.replace('PASSED', '<span class="badge badge-pass">PASSED</span>')
    text = text.replace('Default Export OK', '<span class="badge badge-pass">Default Export OK</span>')
    return text

def render_markdown(md):
    lines = md.split("\n")
    html_lines = []
    in_code_block = False
    code_block_content = []
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
            content = stripped[2:].strip()
            html_lines.append(f'<li>{format_inline(content)}</li>')
            continue
        else:
            flush_list()

        if stripped.startswith("# "):
            flush_table()
            flush_list()
            html_lines.append(f'<h1>{format_inline(stripped[2:])}</h1>')
        elif stripped.startswith("## "):
            flush_table()
            flush_list()
            html_lines.append(f'<h2>{format_inline(stripped[3:])}</h2>')
        elif stripped.startswith("### "):
            flush_table()
            flush_list()
            html_lines.append(f'<h3>{format_inline(stripped[4:])}</h3>')
        elif stripped.startswith("---"):
            flush_table()
            flush_list()
            html_lines.append('<hr/>')
        elif stripped.startswith("> "):
            flush_table()
            flush_list()
            html_lines.append(f'<blockquote>{format_inline(stripped[2:])}</blockquote>')
        elif stripped:
            html_lines.append(f'<p>{format_inline(stripped)}</p>')

    flush_table()
    flush_list()
    return "\n".join(html_lines)

body_html = render_markdown(md_content)

html_document = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OmniverseOS — Final Crash Hunt & Desktop UI 2.0 Master Certification</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

  @page {{
    size: letter portrait;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-right {{
      content: "Page " counter(page) " of " counter(pages);
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #94a3b8;
    }}
  }}

  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}

  body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 9.5pt;
    line-height: 1.55;
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 0;
  }}

  h1 {{
    font-size: 19pt;
    font-weight: 900;
    color: #0284c7;
    margin-top: 0;
    margin-bottom: 8px;
    letter-spacing: -0.02em;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 8px;
  }}

  h2 {{
    font-size: 13.5pt;
    font-weight: 800;
    color: #0369a1;
    margin-top: 18px;
    margin-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    page-break-after: avoid;
  }}

  h3 {{
    font-size: 11pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }}

  p {{
    margin-top: 0;
    margin-bottom: 8px;
  }}

  ul {{
    margin-top: 0;
    margin-bottom: 10px;
    padding-left: 20px;
  }}

  li {{
    margin-bottom: 3px;
  }}

  code {{
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 8.5pt;
    background: #f1f5f9;
    color: #0369a1;
    padding: 1px 4px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }}

  pre {{
    background: #090d16;
    color: #e2e8f0;
    padding: 12px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 8pt;
    line-height: 1.45;
    overflow-x: auto;
    page-break-inside: avoid;
    margin: 10px 0;
    border-left: 4px solid #0284c7;
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
    margin: 10px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }}

  th, td {{
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
    text-align: left;
  }}

  th {{
    background: #f8fafc;
    font-weight: 700;
    color: #1e293b;
    border-bottom: 2px solid #94a3b8;
  }}

  tr:nth-child(even) td {{
    background: #f8fafc;
  }}

  blockquote {{
    margin: 12px 0;
    padding: 10px 14px;
    background: #f0fdf4;
    border-left: 4px solid #16a34a;
    color: #166534;
    font-size: 9pt;
    border-radius: 0 6px 6px 0;
    page-break-inside: avoid;
  }}

  hr {{
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 16px 0;
  }}

  .badge {{
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }}

  .badge-pass {{
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #86efac;
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

if EDGE_PATH:
    cmd = [
        EDGE_PATH,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={PDF_PATH}",
        "--no-pdf-header-footer",
        HTML_PATH
    ]
    print(f"Rendering PDF via headless Edge: {EDGE_PATH}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0 and os.path.exists(PDF_PATH):
        print(f"PDF report successfully created at: {PDF_PATH}")
        print(f"PDF size: {os.path.getsize(PDF_PATH)} bytes")
    else:
        print(f"PDF conversion failed: {res.stderr}")
else:
    print("Edge binary not found, relying on HTML.")
