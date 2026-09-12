FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 CT_DATA_DIR=/app/runtime/state
WORKDIR /app
COPY apps/api/requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir -r /tmp/requirements.lock && useradd --uid 10001 --create-home app
COPY apps/api/app /app/apps/api/app
COPY seed/demo.json /app/seed/demo.json
RUN mkdir -p /app/runtime && chown app:app /app/runtime
WORKDIR /app/apps/api
USER 10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
