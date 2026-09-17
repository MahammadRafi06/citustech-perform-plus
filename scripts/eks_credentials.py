"""Prepare private EKS credentials, or explicitly install those account passwords."""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / '.local/aws-deploy'
ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'


def password(length=10):
    return ''.join(secrets.choice(ALPHABET) for _ in range(length))


def save(path, text):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as stream:
        stream.write(text)


def prepare():
    FOLDER.mkdir(parents=True, exist_ok=True)
    if any((FOLDER / name).exists() for name in ('secrets.env', 'accounts.json', 'credentials.md')):
        raise SystemExit('Existing credentials preserved; no passwords changed.')
    roles = [
        ('executive', 'executive'), ('risk_analyst', 'analyst'),
        ('retrieval_coordinator', 'retrieval'), ('coder', 'coder'),
        ('qa_reviewer', 'qa'), ('provider', 'provider'),
        ('submission_analyst', 'submission'), ('administrator', 'admin'),
        *[(f'provider_{i}', f'provider{i}') for i in range(2, 7)],
        ('superuser', 'superuser'),
    ]
    accounts = [{'id': role, 'email': f'{alias}@perform.test', 'password': password(12 if role == 'superuser' else 10)} for role, alias in roles]
    database_password = secrets.token_urlsafe(32)
    superuser = accounts[-1]['password']
    save(FOLDER / 'secrets.env', f'POSTGRES_PASSWORD={database_password}\nDATABASE_URL=postgresql://ct_demo:{database_password}@db:5432/perform_plus\nCT_DEMO_PASSWORD={secrets.token_urlsafe(24)}\nCT_SUPERUSER_PASSWORD={superuser}\n')
    save(FOLDER / 'accounts.json', json.dumps(accounts, indent=2) + '\n')
    save(FOLDER / 'credentials.md', '# Perform+ access\n\nhttps://performplus.idaibhealth.com\n\nhttps://performplus.citiustech.online\n\nBoth addresses use the same accounts; sign in separately on each domain. These passwords belong to the EKS environment. Keep this file private.\n\n| Account | Password | Role |\n| --- | --- | --- |\n' + ''.join(f"| {row['email']} | {row['password']} | {row['id']} |\n" for row in accounts))
    print('Private credentials prepared in .local/aws-deploy; no secrets printed or committed.')


def install():
    accounts = json.loads((FOLDER / 'accounts.json').read_text())
    code = '''import json,sys
from app.main import db,PASSWORD_HASHER
accounts=json.load(sys.stdin)
with db() as conn:
    for row in accounts:
        existing=conn.execute('SELECT id FROM users WHERE id=?',(row['id'],)).fetchone()
        if not existing: raise RuntimeError('Expected account not found: '+row['id'])
    for row in accounts:
        conn.execute('UPDATE users SET password=? WHERE id=?',(PASSWORD_HASHER.hash(row['password']),row['id']))
        conn.execute('DELETE FROM sessions WHERE user_id=?',(row['id'],))
print('Installed passwords for',len(accounts),'existing accounts; roles and application records preserved.')
'''
    subprocess.run(['kubectl', '--context', 'meshalloc-control-plane', '-n', 'perform-plus', 'exec', '-i', 'deploy/api', '--', 'python', '-c', code], input=json.dumps(accounts), text=True, check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['prepare', 'install'])
    args = parser.parse_args()
    prepare() if args.action == 'prepare' else install()
