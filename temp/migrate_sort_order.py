"""Add sort_order column to checklist_items table on Supabase."""
import os
import sys

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2-binary...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
    import psycopg2

# Try to get DATABASE_URL from env, or use default
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    ""  # Will be set below
)

if not DATABASE_URL:
    # Render backend is already connected — we can try to infer
    # Standard Supabase Session Pooler format:
    # postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
    print("DATABASE_URL not set. Please provide the Supabase Session Pooler connection string.")
    print("Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres")
    sys.exit(1)

SQL = """
ALTER TABLE checklist_items
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
"""

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(SQL)
    print("SUCCESS: sort_order column added to checklist_items")
    cur.close()
    conn.close()
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
