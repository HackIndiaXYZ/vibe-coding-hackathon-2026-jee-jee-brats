# Builder Stage
FROM python:3.11-slim as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and build wheels
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /build/wheels -r requirements.txt


# Runner Stage
FROM python:3.11-slim as runner

WORKDIR /app

# Install runtime dependencies (asyncpg/psycopg requires libpq5)
RUN apt-get update && apt-get install -y \
    libpq5 \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder and install them
COPY --from=builder /build/wheels /wheels
COPY --from=builder /build/requirements.txt .
RUN pip install --no-cache /wheels/*

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/v1/health')"

# Run application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
