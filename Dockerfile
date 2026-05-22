FROM python:3.11-slim

WORKDIR /app

# Data files sit at /data/processed/ (referenced by dust_classifier.py via parents[2])
COPY data/ /data/

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
