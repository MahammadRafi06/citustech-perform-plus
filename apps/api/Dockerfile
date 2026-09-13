FROM python:3.13-slim AS model-assets
WORKDIR /build
COPY scripts/model_assets.py /build/scripts/model_assets.py
COPY apps/api/app/risk_models/assets.json /build/apps/api/app/risk_models/assets.json
RUN python scripts/model_assets.py install --dest /models --cache /tmp/model-downloads

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 CT_DATA_DIR=/app/runtime/state CT_MODEL_ASSETS=/app/models
WORKDIR /app
COPY apps/api/requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir -r /tmp/requirements.lock && useradd --uid 10001 --create-home app
COPY apps/api/app /app/apps/api/app
COPY seed/demo.json /app/seed/demo.json
COPY seed/risk /app/seed/risk
COPY --from=model-assets /models /app/models
RUN mkdir -p /app/runtime && chown app:app /app/runtime
WORKDIR /app/apps/api
USER 10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
