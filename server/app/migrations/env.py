import os
import sys
from os.path import abspath, dirname
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv

# 1. Path Fix: Add the 'server' directory to the Python path
# This allows 'from database import Base' to work even when running from inside /server
sys.path.insert(0, abspath(dirname(dirname(__file__))))

# 2. Imports from your app
from database import Base
from models import user  # Import all models so Alembic sees them

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name)

# Load environment variables
load_dotenv()

# Get the Alembic config object
config = context.config

# 3. Password Syntax Fix: Escape '%' characters for Alembic's ConfigParser
# This handles the %40 (encoded @) in your password correctly
database_url = os.getenv("DATABASE_URL")
if database_url:
    database_url = database_url.replace("%", "%%")

config.set_main_option("sqlalchemy.url", database_url)

# Set target metadata for autogenerate
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()