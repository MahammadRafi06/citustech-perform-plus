"""Prepare local secret input, without contacting or changing a cluster."""
import os
import secrets
from pathlib import Path
folder = Path(__file__).resolve().parents[1] / '.local'
folder.mkdir(exist_ok=True)
path = folder / 'k8s-secrets.env'
if path.exists():
    raise SystemExit('Existing .local/k8s-secrets.env preserved. Reuse it for this database.')
password = secrets.token_urlsafe(32)
path.write_text(f'POSTGRES_PASSWORD={password}\nDATABASE_URL=postgresql://ct_demo:{password}@db:5432/perform_plus\nCT_DEMO_PASSWORD={secrets.token_urlsafe(20)}\n')
os.chmod(path, 0o600)
print('Prepared .local/k8s-secrets.env. No cluster changes made.')
