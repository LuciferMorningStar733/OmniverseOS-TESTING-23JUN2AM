import os
import re
import subprocess
import sys

BASE_DIR = r"c:\Users\gamin\Desktop\OmniverseOS-TESTING-23JUN2AM-main\OmniverseOS-TESTING-23JUN2AM-main"
MD_PATH = os.path.join(BASE_DIR, "OMNIVERSEOS_FINAL_FEATURE_CERTIFICATION.md")
HTML_PATH = os.path.join(BASE_DIR, "OMNIVERSEOS_FINAL_FEATURE_CERTIFICATION.html")
PDF_PATH = os.path.join(BASE_DIR, "OMNIVERSEOS_FINAL_FEATURE_CERTIFICATION.pdf")

EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
EDGE_PATH = next((p for p in EDGE_PATHS if os.path.exists(p)), None)

def escape_html(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def format_inline(text):
    text = escape_html(text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
    text = re.sub(r'`(.*?)`', r'<code>\1</code>', text)
    text = text.replace('🟢 PASS', '<span class="badge badge-pass">🟢 PASS</span>')
    text = text.replace('🟢 CERTIFIED PRODUCTION READY (100% AUDIT COMPLETE)', '<span class="badge badge-pass" style="font-size:13pt;padding:6px 14px;">🟢 CERTIFIED PRODUCTION READY (100% AUDIT COMPLETE)</span>')
    text = text.replace('PASSED', '<span class="badge badge-pass">PASSED</span>')
    text = text.replace('PASS', '<span class="badge badge-pass">PASS</span>')
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
            if not in_list:
                html_lines.append('<ul>')
                in_list = True
            html_lines.append(f'<li>{format_inline(stripped[2:])}</li>')
            continue
        elif in_list:
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
        elif stripped:
            html_lines.append(f'<p>{format_inline(stripped)}</p>')

    if in_table:
        flush_table()
    if in_list:
        flush_list()
    if in_code_block:
        html_lines.append(f'<pre><code>{escape_html(chr(10).join(code_block_content))}</code></pre>')

    return "\n".join(html_lines)

def build_pdf():
    if not os.path.exists(MD_PATH):
        print(f"Error: {MD_PATH} not found.")
        return False

    with open(MD_PATH, "r", encoding="utf-8") as f:
        md_content = f.read()

    body_html = render_markdown(md_content)

    html_document = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OmniverseOS — Final Feature-by-Feature Reticle Certification</title>
<style>
  @page {{
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-right {{
      content: counter(page) " / " counter(pages);
      font-family: 'JetBrains Mono', 'Segoe UI', monospace;
      font-size: 8pt;
      color: #64748b;
    }}
  }}

  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}

  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    line-height: 1.5;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
  }}

  h1 {{
    font-size: 19pt;
    font-weight: 800;
    color: #0284c7;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 6px;
    margin-top: 0;
    margin-bottom: 14px;
    letter-spacing: -0.02em;
    page-break-after: avoid;
  }}

  h2 {{
    font-size: 13.5pt;
    font-weight: 700;
    color: #0369a1;
    border-bottom: 1px solid #e0f2fe;
    padding-bottom: 4px;
    margin-top: 20px;
    margin-bottom: 10px;
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

  h4 {{
    font-size: 10pt;
    font-weight: 600;
    color: #334155;
    margin-top: 10px;
    margin-bottom: 4px;
    page-break-after: avoid;
  }}

  p {{
    margin-top: 0;
    margin-bottom: 8px;
  }}

  code {{
    font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace;
    font-size: 8.5pt;
    background: #f1f5f9;
    color: #0f172a;
    padding: 1px 4px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }}

  pre {{
    background: #0f172a;
    color: #f8fafc;
    padding: 10px 14px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 8pt;
    line-height: 1.4;
    margin-top: 6px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }}

  pre code {{
    background: transparent;
    color: inherit;
    padding: 0;
    border: none;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    margin-bottom: 14px;
    font-size: 8pt;
    page-break-inside: auto;
  }}

  tr {{
    page-break-inside: avoid;
    page-break-after: auto;
  }}

  th, td {{
    border: 1px solid #cbd5e1;
    padding: 5px 7px;
    text-align: left;
    vertical-align: top;
  }}

  th {{
    background-color: #f0f9ff;
    color: #0369a1;
    font-weight: 700;
  }}

  tr:nth-child(even) td {{
    background-color: #f8fafc;
  }}

  ul {{
    margin-top: 0;
    margin-bottom: 8px;
    padding-left: 20px;
  }}

  li {{
    margin-bottom: 3px;
  }}

  hr {{
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 16px 0;
  }}

  .badge {{
    display: inline-block;
    padding: 2px 7px;
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
            return True
        else:
            print(f"PDF conversion failed: {res.stderr}")
            return False
    else:
        print("Edge binary not found, relying on HTML.")
        return False

if __name__ == "__main__":
    build_pdf()
