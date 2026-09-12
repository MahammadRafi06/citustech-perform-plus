"""Run the UI and API locally; PostgreSQL keeps its own persistent local process."""
import os
import signal
import subprocess
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
if not os.environ.get('DATABASE_URL'):
    subprocess.run([sys.executable, 'scripts/database.py'], check=True)
processes = []
try:
    processes.append(subprocess.Popen([str(ROOT / '.venv/bin/python'), '-m', 'uvicorn', 'app.main:app', '--app-dir', 'apps/api', '--host', '127.0.0.1', '--port', '8000', '--reload']))
    processes.append(subprocess.Popen(['npm', 'run', 'dev'], cwd=ROOT / 'apps/web', start_new_session=True))
    print('Perform+ UI: http://localhost:3000 | local accounts: .local/demo-accounts.json', flush=True)
    processes[1].wait()
except KeyboardInterrupt:
    pass
finally:
    for process in processes:
        if process.poll() is None:
            if process is processes[-1]: os.killpg(process.pid, signal.SIGTERM)
            else: process.terminate()
    for process in processes:
        try: process.wait(timeout=10)
        except subprocess.TimeoutExpired: process.kill()
