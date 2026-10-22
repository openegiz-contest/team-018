# Pinned Debian Bookworm micro-version
FROM python:3.12.8-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY simulator.py setup_twins.py scenarios.py monitor.py tui_renderer.py twins.json ./
COPY modules/ ./modules/
COPY data/ ./data/
COPY policies/ ./policies/

# Безопасный запуск без root
USER nobody

CMD ["python", "simulator.py"]
