"""Display identities for the local accounts; role and access IDs stay stable."""

ACCOUNT_NAMES = {
    'executive': 'Morgan Hayes', 'risk_analyst': 'Priya Shah',
    'retrieval_coordinator': 'Jamie Rivera', 'coder': 'Alex Chen',
    'qa_reviewer': 'Drew Collins', 'submission_analyst': 'Sam Bennett',
    'administrator': 'Jordan Patel', 'superuser': 'Albert Riera',
    'provider': 'Dr. Emily Carter', 'provider_2': 'Dr. Daniel Reyes',
    'provider_3': 'Dr. Maya Thompson', 'provider_4': 'Dr. Olivia Grant',
    'provider_5': 'Dr. Ethan Brooks', 'provider_6': 'Dr. Sofia Bennett',
}


def migrate_accounts(conn, role_names):
    """Rename only recognized bootstrap labels; never reset custom identities/access."""
    for account_id, name in ACCOUNT_NAMES.items():
        legacy = role_names.get(account_id, f"Practice {account_id.split('_')[-1]} provider")
        conn.execute('UPDATE users SET name=? WHERE id=? AND name IN (?,?)',
                     (name, account_id, legacy, legacy + ' demo'))
    conn.execute('UPDATE users SET name=? WHERE id=? AND name=?',
                 (ACCOUNT_NAMES['superuser'], 'superuser', 'Avery Morgan'))


def refresh_owners(conn, state):
    names = {u['id']: u['name'] for u in conn.execute('SELECT id,name FROM users')}
    for collection in ('opportunities', 'tasks', 'campaigns', 'chases'):
        for record in state.get(collection, []):
            if record.get('owner_id') in names:
                record['owner'] = names[record['owner_id']]
