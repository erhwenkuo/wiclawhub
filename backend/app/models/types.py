import json

from sqlalchemy import Text, TypeDecorator


class JSONType(TypeDecorator):
    """JSON type that works with both SQLite and PostgreSQL.

    SQLite lacks a native JSON column, so we store JSON as TEXT.
    PostgreSQL can use its native JSON type, but TEXT works there too
    and keeps the migration portable.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):  # type: ignore[override]
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):  # type: ignore[override]
        if value is not None:
            return json.loads(value)
        return None
