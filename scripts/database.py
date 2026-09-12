"""Start an isolated local PostgreSQL 18 instance; never contacts an existing DB."""
import os, secrets, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
LOCAL=ROOT/'.local'; LOCAL.mkdir(exist_ok=True);os.chmod(LOCAL,0o700)
PG=Path('/usr/lib/postgresql/18/bin')
if not PG.exists(): raise SystemExit('Install PostgreSQL 18 or use docker compose up -d db; set DATABASE_URL.')
password=LOCAL/'pg-password'
if not password.exists():password.write_text(secrets.token_urlsafe(24));os.chmod(password,0o600)
data=LOCAL/'postgres'; sockets=LOCAL/'pg-socket';sockets.mkdir(exist_ok=True)
if not (data/'PG_VERSION').exists():
    subprocess.run([str(PG/'initdb'),'-D',str(data),'-U','ct_demo','-A','scram-sha-256','--pwfile',str(password)],check=True,stdout=subprocess.DEVNULL)
status=subprocess.run([str(PG/'pg_ctl'),'-D',str(data),'status'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
if status.returncode:
    subprocess.run([str(PG/'pg_ctl'),'-D',str(data),'-l',str(LOCAL/'postgres.log'),'-o',f'-p 55432 -h 127.0.0.1 -k {sockets}','start'],check=True)
url=f'postgresql://ct_demo:{password.read_text()}@127.0.0.1:55432/postgres'
p=LOCAL/'database-url';p.write_text(url);os.chmod(p,0o600)
print('Isolated local PostgreSQL is ready on 127.0.0.1:55432. Connection saved in .local/database-url.')
