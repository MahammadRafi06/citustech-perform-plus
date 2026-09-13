"""Run this worktree against its own private local database and ports."""
import argparse
import os
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('component', choices=['api', 'ui'])
parser.add_argument('--api-port', type=int, default=8004)
parser.add_argument('--ui-port', type=int, default=3005)
args = parser.parse_args()
os.chdir(root)
os.environ.setdefault('CT_DATA_DIR', str(root / '.local/v2-runtime'))
os.environ.setdefault('CT_MODEL_ASSETS', str(root / '.local/model-assets'))
os.environ.setdefault('CT_MODEL_PYTHON', str(root / '.venv/bin/python'))
os.environ.setdefault('CT_ALLOWED_ORIGINS', f'http://localhost:{args.ui_port},http://127.0.0.1:{args.ui_port},http://localhost:{args.api_port},http://127.0.0.1:{args.api_port}')
if not os.environ.get('DATABASE_URL'):
    database_file = root / '.local/database-url'
    if not database_file.exists():
        parser.error('Set DATABASE_URL to a dedicated local PostgreSQL database or create the ignored .local/database-url file. See docs/V2_LOCAL_RUN.md.')
    os.environ['DATABASE_URL'] = database_file.read_text().strip()
if args.component == 'api':
    os.execv(str(root / '.venv/bin/python'), [str(root / '.venv/bin/python'), '-m', 'uvicorn', 'apps.api.app.main:app', '--host', '127.0.0.1', '--port', str(args.api_port)])
else:
    os.chdir(root / 'apps/web')
    os.environ['API_INTERNAL_URL'] = f'http://127.0.0.1:{args.api_port}'
    os.execvp('npm', ['npm', 'exec', '--', 'next', 'dev', '--hostname', '127.0.0.1', '--port', str(args.ui_port)])
