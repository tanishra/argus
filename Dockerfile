FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home appuser
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
COPY configs/ ./configs/
USER appuser
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
