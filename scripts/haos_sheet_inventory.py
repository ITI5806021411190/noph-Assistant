#!/usr/bin/env python3
"""Read-only Google Sheets/XLSX inventory for Health Assistant OS exports."""

from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NS_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
NS_PACKAGE_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def xml_from_zip(zf: zipfile.ZipFile, name: str):
    with zf.open(name) as fh:
        return ET.parse(fh).getroot()


def load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        root = xml_from_zip(zf, "xl/sharedStrings.xml")
    except KeyError:
        return []
    values: list[str] = []
    for si in root.findall(f"{NS_MAIN}si"):
        parts: list[str] = []
        for t in si.iter(f"{NS_MAIN}t"):
            parts.append(t.text or "")
        values.append("".join(parts))
    return values


def column_index(cell_ref: str) -> int:
    letters = re.sub(r"[^A-Z]", "", cell_ref.upper())
    total = 0
    for ch in letters:
        total = total * 26 + (ord(ch) - 64)
    return total


def row_index(cell_ref: str) -> int:
    digits = re.sub(r"\D", "", cell_ref)
    return int(digits or "0")


def cell_value(cell, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t", "")
    if cell_type == "inlineStr":
        texts = [t.text or "" for t in cell.iter(f"{NS_MAIN}t")]
        return "".join(texts).strip()
    value_node = cell.find(f"{NS_MAIN}v")
    raw = value_node.text if value_node is not None else ""
    if cell_type == "s":
        try:
            return shared_strings[int(raw)].strip()
        except Exception:
            return ""
    return str(raw or "").strip()


def workbook_sheets(zf: zipfile.ZipFile) -> list[dict]:
    workbook = xml_from_zip(zf, "xl/workbook.xml")
    rels = xml_from_zip(zf, "xl/_rels/workbook.xml.rels")
    rel_map = {
        rel.attrib.get("Id"): rel.attrib.get("Target", "")
        for rel in rels.findall(f"{NS_PACKAGE_REL}Relationship")
    }
    sheets: list[dict] = []
    for sheet in workbook.findall(f"{NS_MAIN}sheets/{NS_MAIN}sheet"):
        rid = sheet.attrib.get(f"{NS_REL}id")
        target = rel_map.get(rid, "")
        if target.startswith("/"):
            target_path = target.lstrip("/")
        elif target.startswith("xl/"):
            target_path = target
        else:
            target_path = "xl/" + target
        sheets.append(
            {
                "name": sheet.attrib.get("name", ""),
                "sheetId": sheet.attrib.get("sheetId", ""),
                "path": target_path,
            }
        )
    return sheets


def inspect_sheet(zf: zipfile.ZipFile, sheet: dict, shared_strings: list[str]) -> dict:
    root = xml_from_zip(zf, sheet["path"])
    dimension = root.find(f"{NS_MAIN}dimension")
    declared_ref = dimension.attrib.get("ref", "") if dimension is not None else ""
    declared_rows = 0
    declared_cols = 0
    if declared_ref:
        last_ref = declared_ref.split(":")[-1]
        declared_rows = row_index(last_ref)
        declared_cols = column_index(last_ref)

    row_has_value: set[int] = set()
    first_row_values: dict[int, str] = {}
    max_row_seen = 0
    max_col_seen = 0
    non_empty_cells = 0

    sheet_data = root.find(f"{NS_MAIN}sheetData")
    if sheet_data is not None:
        for row in sheet_data.findall(f"{NS_MAIN}row"):
            r_num = int(row.attrib.get("r", "0") or "0")
            row_values = []
            for cell in row.findall(f"{NS_MAIN}c"):
                ref = cell.attrib.get("r", "")
                c_num = column_index(ref)
                value = cell_value(cell, shared_strings)
                max_row_seen = max(max_row_seen, r_num)
                max_col_seen = max(max_col_seen, c_num)
                if value != "":
                    non_empty_cells += 1
                    row_values.append((c_num, value))
                    row_has_value.add(r_num)
            if r_num == 1:
                first_row_values.update(row_values)

    non_empty_rows = len(row_has_value)
    last_non_empty_row = max(row_has_value) if row_has_value else 0
    headers = [
        first_row_values.get(i, "")
        for i in range(1, max(declared_cols, max_col_seen, len(first_row_values)) + 1)
    ]
    header_counts = Counter(h for h in headers if h)
    duplicate_headers = sorted([h for h, count in header_counts.items() if count > 1])

    return {
        "name": sheet["name"],
        "sheetId": sheet["sheetId"],
        "declaredRows": declared_rows or max_row_seen,
        "declaredCols": declared_cols or max_col_seen,
        "nonEmptyRows": non_empty_rows,
        "lastNonEmptyRow": last_non_empty_row,
        "blankTail": max(0, (declared_rows or max_row_seen) - last_non_empty_row),
        "nonEmptyCells": non_empty_cells,
        "headers": headers,
        "duplicateHeaders": duplicate_headers,
    }


def render_markdown(workbook: Path, rows: list[dict]) -> str:
    lines: list[str] = []
    lines.append("# Health Assistant OS Sheet Inventory")
    lines.append("")
    lines.append(f"Generated: {datetime.now(timezone.utc).isoformat()}")
    lines.append(f"Source workbook: `{workbook}`")
    lines.append("")
    lines.append("## Sheet summary")
    lines.append("")
    lines.append("| Sheet | Declared rows | Non-empty rows | Blank tail | Columns | Duplicate headers |")
    lines.append("| --- | ---: | ---: | ---: | ---: | --- |")
    for row in rows:
        dupes = ", ".join(row["duplicateHeaders"]) if row["duplicateHeaders"] else "-"
        lines.append(
            f"| {row['name']} | {row['declaredRows']} | {row['nonEmptyRows']} | "
            f"{row['blankTail']} | {row['declaredCols']} | {dupes} |"
        )
    lines.append("")
    lines.append("## Cleanup candidates")
    lines.append("")
    candidates = [
        row
        for row in rows
        if row["blankTail"] >= 20 or row["duplicateHeaders"] or row["nonEmptyRows"] <= 1
    ]
    if not candidates:
        lines.append("- No obvious cleanup candidates from metadata alone.")
    else:
        for row in candidates:
            reasons = []
            if row["blankTail"] >= 20:
                reasons.append(f"blank tail {row['blankTail']} rows")
            if row["duplicateHeaders"]:
                reasons.append("duplicate headers: " + ", ".join(row["duplicateHeaders"]))
            if row["nonEmptyRows"] <= 1:
                reasons.append("empty or header-only sheet")
            lines.append(f"- `{row['name']}`: " + "; ".join(reasons))
    lines.append("")
    lines.append("## Guardrail")
    lines.append("")
    lines.append("- This script is read-only. Use the output as a dry-run report before any database cleanup.")
    lines.append("- Do not delete `AuditLogs`, user, profile, schedule, notification, or active module sheets without a dated workbook backup.")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only XLSX sheet inventory.")
    parser.add_argument("--workbook", required=True, help="Path to exported .xlsx workbook")
    parser.add_argument("--output", help="Optional Markdown output path")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of Markdown")
    ns = parser.parse_args()

    workbook = Path(ns.workbook).resolve()
    if not workbook.exists():
        print(f"Workbook not found: {workbook}", file=sys.stderr)
        return 2

    with zipfile.ZipFile(workbook) as zf:
        shared_strings = load_shared_strings(zf)
        sheets = workbook_sheets(zf)
        rows = [inspect_sheet(zf, sheet, shared_strings) for sheet in sheets]

    if ns.json:
        payload = {"workbook": str(workbook), "generated": datetime.now(timezone.utc).isoformat(), "sheets": rows}
        text = json.dumps(payload, ensure_ascii=False, indent=2)
    else:
        text = render_markdown(workbook, rows)

    if ns.output:
        output = Path(ns.output).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8")
        print(f"Wrote {output}")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
