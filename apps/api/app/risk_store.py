"""Append-only scoring evidence beside the existing clinical workflow store."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import uuid


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def initialize(conn):
    conn.executescript('''
      CREATE TABLE IF NOT EXISTS risk_inputs (
        id TEXT PRIMARY KEY, member_id TEXT NOT NULL, config_id TEXT NOT NULL,
        input_hash TEXT NOT NULL, body JSONB NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS risk_inputs_member ON risk_inputs(member_id, config_id);
      CREATE TABLE IF NOT EXISTS risk_runs (
        id TEXT PRIMARY KEY, member_id TEXT NOT NULL, config_id TEXT NOT NULL,
        snapshot_id TEXT NOT NULL REFERENCES risk_inputs(id), score_basis TEXT NOT NULL,
        status TEXT NOT NULL, body JSONB NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS risk_runs_member ON risk_runs(member_id, config_id, score_basis, created_at);
      CREATE TABLE IF NOT EXISTS risk_stages (
        member_id TEXT NOT NULL, config_id TEXT NOT NULL, score_basis TEXT NOT NULL,
        run_id TEXT NOT NULL REFERENCES risk_runs(id), stale BOOLEAN NOT NULL DEFAULT FALSE,
        reason TEXT, PRIMARY KEY(member_id, config_id, score_basis));
      CREATE TABLE IF NOT EXISTS risk_records (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL, member_id TEXT,
        body JSONB NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS risk_records_kind ON risk_records(kind, created_at);
      CREATE TABLE IF NOT EXISTS risk_batches (
        id TEXT PRIMARY KEY, config_id TEXT NOT NULL, status TEXT NOT NULL,
        body JSONB NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    ''')


def body(row):
    if not row:
        return None
    value = row['body']
    return json.loads(value) if isinstance(value, str) else value


def snapshot(conn, config_id, value):
    value = {k: v for k, v in value.items() if k not in ('id', 'snapshot_id', 'created_at')}
    key = digest({'config_id': config_id, 'input': value})
    sid = 'IN-' + key
    result = {**value, 'id': sid, 'input_hash': digest(value)}
    conn.execute('INSERT INTO risk_inputs VALUES (?,?,?,?,?::jsonb,?) ON CONFLICT (id) DO NOTHING',
                 (sid, value['member_id'], config_id, result['input_hash'], json.dumps(result), timestamp()))
    return result


def get_input(conn, sid):
    return body(conn.execute('SELECT body FROM risk_inputs WHERE id=?', (sid,)).fetchone())


def save_run(conn, snapshot_value, result, basis, *, actor='', publish=True, origin='calculated'):
    run = {**result, 'id': 'RUN-' + uuid.uuid4().hex, 'snapshot_id': snapshot_value['id'],
           'member_id': snapshot_value['member_id'], 'created_at': timestamp(), 'score_basis': basis,
           'actor_id': actor, 'origin': origin, 'synthetic': bool(snapshot_value.get('synthetic', True))}
    conn.execute('INSERT INTO risk_runs VALUES (?,?,?,?,?,?,?::jsonb,?)',
                 (run['id'], run['member_id'], run['config_id'], run['snapshot_id'], basis,
                  run['status'], json.dumps(run), run['created_at']))
    if publish and run['status'] == 'completed':
        conn.execute('''INSERT INTO risk_stages VALUES (?,?,?,?,FALSE,NULL)
            ON CONFLICT(member_id,config_id,score_basis) DO UPDATE SET
            run_id=EXCLUDED.run_id, stale=FALSE, reason=NULL''',
                     (run['member_id'], run['config_id'], basis, run['id']))
    elif publish:
        conn.execute('''UPDATE risk_stages SET stale=TRUE,reason=?
          WHERE member_id=? AND config_id=? AND score_basis=?''',
          ('A newer calculation failed; this earlier valid result is retained.', run['member_id'], run['config_id'], basis))
    return run


def get_run(conn, rid):
    return body(conn.execute('SELECT body FROM risk_runs WHERE id=?', (rid,)).fetchone())


def current(conn, mid, config_id, basis='captured_baseline'):
    row = conn.execute('''SELECT r.body, s.stale, s.reason FROM risk_stages s
       JOIN risk_runs r ON r.id=s.run_id WHERE s.member_id=? AND s.config_id=? AND s.score_basis=?''',
                       (mid, config_id, basis)).fetchone()
    return {**body(row), 'stale': row['stale'], 'stale_reason': row['reason']} if row else None


def history(conn, mid, config_id, limit=30):
    return [body(r) for r in conn.execute('SELECT body FROM risk_runs WHERE member_id=? AND config_id=? ORDER BY created_at DESC LIMIT ?',
                                         (mid, config_id, limit))]


def mark_stale(conn, mid, reason, config_id=None):
    query = 'UPDATE risk_stages SET stale=TRUE, reason=? WHERE member_id=?'
    args = [reason, mid]
    if config_id:
        query += ' AND config_id=?'
        args.append(config_id)
    conn.execute(query, args)


def record(conn, kind, value, mid=None, rid=None):
    result = {**value, 'id': rid or kind.upper() + '-' + uuid.uuid4().hex, 'created_at': value.get('created_at', timestamp())}
    conn.execute('INSERT INTO risk_records VALUES (?,?,?,?::jsonb,?) ON CONFLICT(id) DO NOTHING',
                 (result['id'], kind, mid, json.dumps(result), result['created_at']))
    return result


def records(conn, kind, mid=None, limit=100):
    where = 'kind=?' + (' AND member_id=?' if mid else '')
    args = [kind] + ([mid] if mid else []) + [limit]
    return [body(r) for r in conn.execute(f'SELECT body FROM risk_records WHERE {where} ORDER BY created_at DESC LIMIT ?', args)]


def save_batch(conn, value):
    value['updated_at'] = timestamp()
    conn.execute('''INSERT INTO risk_batches VALUES (?,?,?,?::jsonb,?,?)
      ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,body=EXCLUDED.body,updated_at=EXCLUDED.updated_at''',
                 (value['id'], value['config_id'], value['status'], json.dumps(value), value['created_at'], value['updated_at']))
    return value


def get_batch(conn, bid):
    return body(conn.execute('SELECT body FROM risk_batches WHERE id=?', (bid,)).fetchone())
