.PHONY: setup dev build check test db
setup:
	uv venv --python 3.13 .venv
	uv pip install --python .venv/bin/python -r apps/api/requirements.lock
	cd apps/web && npm ci

db:
	python3 scripts/database.py

dev:
	python3 scripts/dev.py

build:
	cd apps/web && npm run build

check:
	cd apps/web && npm run typecheck
	.venv/bin/python -m compileall -q apps/api/app scripts

test:
	.venv/bin/python -m pytest apps/api/tests -q
