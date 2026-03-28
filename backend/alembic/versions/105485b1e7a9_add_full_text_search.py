"""add full-text search

Revision ID: 105485b1e7a9
Revises: 80583bb24ac2
Create Date: 2026-03-28 09:12:01.624814

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from app.models.types import JSONType  # noqa: F401


# revision identifiers, used by Alembic.
revision: str = '105485b1e7a9'
down_revision: Union[str, None] = '80583bb24ac2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    dialect = op.get_bind().dialect.name

    if dialect == "postgresql":
        # Add tsvector column
        op.execute(
            "ALTER TABLE skills ADD COLUMN search_vector tsvector"
        )
        # GIN index for fast full-text search
        op.execute(
            "CREATE INDEX ix_skills_search_vector ON skills USING gin(search_vector)"
        )
        # Trigger function to auto-update search_vector on INSERT/UPDATE
        op.execute("""
            CREATE OR REPLACE FUNCTION skills_search_vector_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector :=
                    setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
                    setweight(to_tsvector('english', replace(coalesce(NEW.slug, ''), '-', ' ')), 'A') ||
                    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B');
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        """)
        op.execute("""
            CREATE TRIGGER skills_search_vector_trigger
            BEFORE INSERT OR UPDATE OF display_name, slug, summary
            ON skills
            FOR EACH ROW EXECUTE FUNCTION skills_search_vector_update();
        """)
        # Backfill existing rows
        op.execute("UPDATE skills SET display_name = display_name")
    else:
        # SQLite: FTS5 virtual table
        op.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
                slug, display_name, summary,
                content='skills',
                content_rowid='rowid'
            )
        """)
        # Sync triggers: INSERT
        op.execute("""
            CREATE TRIGGER IF NOT EXISTS skills_fts_ai AFTER INSERT ON skills BEGIN
                INSERT INTO skills_fts(rowid, slug, display_name, summary)
                VALUES (NEW.rowid, NEW.slug, NEW.display_name, NEW.summary);
            END
        """)
        # Sync triggers: DELETE
        op.execute("""
            CREATE TRIGGER IF NOT EXISTS skills_fts_ad AFTER DELETE ON skills BEGIN
                INSERT INTO skills_fts(skills_fts, rowid, slug, display_name, summary)
                VALUES ('delete', OLD.rowid, OLD.slug, OLD.display_name, OLD.summary);
            END
        """)
        # Sync triggers: UPDATE
        op.execute("""
            CREATE TRIGGER IF NOT EXISTS skills_fts_au AFTER UPDATE ON skills BEGIN
                INSERT INTO skills_fts(skills_fts, rowid, slug, display_name, summary)
                VALUES ('delete', OLD.rowid, OLD.slug, OLD.display_name, OLD.summary);
                INSERT INTO skills_fts(rowid, slug, display_name, summary)
                VALUES (NEW.rowid, NEW.slug, NEW.display_name, NEW.summary);
            END
        """)
        # Backfill existing rows
        op.execute(
            "INSERT INTO skills_fts(rowid, slug, display_name, summary) "
            "SELECT rowid, slug, display_name, summary FROM skills"
        )


def downgrade() -> None:
    dialect = op.get_bind().dialect.name

    if dialect == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS skills_search_vector_trigger ON skills")
        op.execute("DROP FUNCTION IF EXISTS skills_search_vector_update()")
        op.execute("DROP INDEX IF EXISTS ix_skills_search_vector")
        op.execute("ALTER TABLE skills DROP COLUMN IF EXISTS search_vector")
    else:
        op.execute("DROP TRIGGER IF EXISTS skills_fts_ai")
        op.execute("DROP TRIGGER IF EXISTS skills_fts_ad")
        op.execute("DROP TRIGGER IF EXISTS skills_fts_au")
        op.execute("DROP TABLE IF EXISTS skills_fts")
