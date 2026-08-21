#!/usr/bin/env python3
"""
Imports a monthly lesson-booklet PDF into the admin panel as DRAFT lessons —
one lesson per day, each page kept exactly as designed (rendered to an
image, not re-typeset) and attached via lesson_images, matching how the
app already represents a lesson: `lessons` has no body-text field at all,
a lesson IS its ordered set of images (see supabase/migrations/
20260712000003_lessons.sql and 20260712000004_lesson_images.sql).

Everything is created as status='draft' — nothing is published
automatically. Review and publish each imported day from the admin panel
as usual (Lessons -> the date -> Publish), same as a lesson entered by
hand.

How day boundaries are detected
--------------------------------
Each day's first page carries a date badge (top-left corner) with a
DD/MM/YY date. Continuation pages for the same day carry no such badge.
Plain top-to-bottom text extraction does NOT reliably read this badge in
visual order (a known quirk of InDesign-exported PDFs with curved/graphic
text frames — the underlying content stream order doesn't match reading
order), so detection instead looks for text spans positioned in the
top-left corner region (x < 160pt, y < 110pt) matching a DD/MM/YY pattern.
This was verified against a real booklet: 29/29 days detected correctly,
each exactly 2 pages, with only the trailing non-daily appendix (fixed
reference content with no date badge, e.g. "ברכות השחר") incorrectly
swept into the last day — which is why the script warns loudly on any
unusually large day (see DAY_PAGE_COUNT_WARNING_THRESHOLD) instead of
silently trusting it. ALWAYS check the warning list before trusting a
run's output blindly.

Usage
-----
    python scripts/import-lesson-pdf.py <pdf-path> --track women --language he

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as environment
variables (or a --env-file pointing at a .env-style file that has them —
e.g. apps/admin/.env.local already has both). The service role key
bypasses RLS entirely, so only ever run this locally/by a trusted admin,
never commit the key, never run this against untrusted PDFs.
"""

import argparse
import os
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path

import fitz  # PyMuPDF
import requests

DATE_BADGE_MAX_X = 160
DATE_BADGE_MAX_Y = 110
DATE_PATTERN = re.compile(r"(\d{2})/(\d{2})/(\d{2})")
DAY_PAGE_COUNT_WARNING_THRESHOLD = 4
RENDER_SCALE = 2.5  # ~180dpi equivalent for a standard page — crisp on a phone screen


def load_env_file(path: Path) -> dict:
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip()
    return env


def detect_date_on_page(page: "fitz.Page") -> str | None:
    """Returns a DD/MM/YY string if this page starts a new day, else None."""
    text_dict = page.get_text("dict")
    for block in text_dict.get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                bbox = span["bbox"]
                if bbox[0] < DATE_BADGE_MAX_X and bbox[1] < DATE_BADGE_MAX_Y:
                    match = DATE_PATTERN.search(span["text"])
                    if match:
                        return match.group(0)
    return None


def ddmmyy_to_iso(date_str: str) -> str:
    dt = datetime.strptime(date_str, "%d/%m/%y")
    return dt.strftime("%Y-%m-%d")


def group_pages_into_days(doc: "fitz.Document") -> list[dict]:
    days = []
    current = None
    skipped_front_matter = 0

    for i in range(doc.page_count):
        page = doc.load_page(i)
        date_str = detect_date_on_page(page)
        if date_str:
            current = {"date": date_str, "pages": [i]}
            days.append(current)
        elif current is not None:
            current["pages"].append(i)
        else:
            skipped_front_matter += 1

    if skipped_front_matter:
        print(f"  (skipped {skipped_front_matter} front-matter page(s) before the first dated day)")

    return days


def supabase_headers(service_role_key: str) -> dict:
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }


def create_lesson(base_url: str, headers: dict, lesson_date: str, title: str, track: str, language: str) -> str | None:
    resp = requests.post(
        f"{base_url}/rest/v1/lessons",
        headers={**headers, "Prefer": "return=representation"},
        json={
            "lesson_date": lesson_date,
            "title": title,
            "gender_track": track,
            "language": language,
            "status": "draft",
        },
        timeout=30,
    )
    if resp.status_code == 409 or (resp.status_code == 400 and "duplicate key" in resp.text.lower()):
        print(f"  SKIP {lesson_date}: a lesson already exists for this date/track/language.")
        return None
    if not resp.ok:
        print(f"  ERROR creating lesson for {lesson_date}: {resp.status_code} {resp.text}")
        return None
    return resp.json()[0]["id"]


def upload_page_image(base_url: str, service_role_key: str, lesson_id: str, png_bytes: bytes, sort_order: int) -> bool:
    path = f"{lesson_id}/{uuid.uuid4()}.png"
    upload_resp = requests.post(
        f"{base_url}/storage/v1/object/lesson-images/{path}",
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "image/png",
        },
        data=png_bytes,
        timeout=60,
    )
    if not upload_resp.ok:
        print(f"  ERROR uploading page image: {upload_resp.status_code} {upload_resp.text}")
        return False

    public_url = f"{base_url}/storage/v1/object/public/lesson-images/{path}"
    insert_resp = requests.post(
        f"{base_url}/rest/v1/lesson_images",
        headers=supabase_headers(service_role_key),
        json={"lesson_id": lesson_id, "image_url": public_url, "sort_order": sort_order},
        timeout=30,
    )
    if not insert_resp.ok:
        print(f"  ERROR inserting lesson_images row: {insert_resp.status_code} {insert_resp.text}")
        return False
    return True


def main():
    # Windows terminals often default to a legacy codepage (e.g. cp1255)
    # that can't encode box-drawing/emoji characters used below — force
    # UTF-8 so the script doesn't crash mid-run on its own status output.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("pdf_path", type=Path)
    parser.add_argument("--track", required=True, choices=["men", "women"])
    parser.add_argument("--language", default="he", choices=["he", "en"])
    parser.add_argument("--env-file", type=Path, default=Path("apps/admin/.env.local"))
    parser.add_argument("--dry-run", action="store_true", help="Detect and report day boundaries only — no DB/storage writes.")
    args = parser.parse_args()

    env = {**load_env_file(args.env_file), **os.environ}
    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("SUPABASE_URL")
    service_role_key = env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not args.dry_run and (not base_url or not service_role_key):
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (checked environment and --env-file).", file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(args.pdf_path)
    print(f"Opened {args.pdf_path.name}: {doc.page_count} pages")

    days = group_pages_into_days(doc)
    print(f"Detected {len(days)} day(s)\n")

    warnings = [d for d in days if len(d["pages"]) > DAY_PAGE_COUNT_WARNING_THRESHOLD]

    created = 0
    skipped = 0
    for day in days:
        iso_date = ddmmyy_to_iso(day["date"])
        page_count = len(day["pages"])
        flag = "  ⚠ unusually many pages — likely includes trailing non-daily content, check before publishing" if page_count > DAY_PAGE_COUNT_WARNING_THRESHOLD else ""
        print(f"{day['date']} ({iso_date}) -> {page_count} page(s){flag}")

        if args.dry_run:
            continue

        title = day["date"].replace("/", ".")
        lesson_id = create_lesson(base_url, supabase_headers(service_role_key), iso_date, title, args.track, args.language)
        if not lesson_id:
            skipped += 1
            continue

        for sort_order, page_index in enumerate(day["pages"]):
            page = doc.load_page(page_index)
            pix = page.get_pixmap(matrix=fitz.Matrix(RENDER_SCALE, RENDER_SCALE))
            png_bytes = pix.tobytes("png")
            upload_page_image(base_url, service_role_key, lesson_id, png_bytes, sort_order)

        created += 1

    print(f"\nDone. Created {created} draft lesson(s), skipped {skipped} (already existed).")
    if warnings:
        print(f"\n⚠ {len(warnings)} day(s) had an unusually high page count — review these in the admin panel before publishing:")
        for w in warnings:
            print(f"   - {w['date']}: {len(w['pages'])} pages")
    if not args.dry_run:
        print("\nAll imported lessons are DRAFTS. Go to the admin panel -> Lessons to review and publish each one.")


if __name__ == "__main__":
    main()
