# ==============================================================================
# STAGE 1: Builder (Compilação do dlib e pacotes C/C++)
# ==============================================================================
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir setuptools==69.5.1 wheel && \
    pip install --no-cache-dir face_recognition_models && \
    pip wheel --no-cache-dir --wheel-dir=/build/wheels -r requirements.txt

# ==============================================================================
# STAGE 2: Runtime Mínimo de Produção (Sem compiladores e sem root)
# ==============================================================================
FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instala estritamente as bibliotecas dinâmicas de runtime necessárias
RUN apt-get update && apt-get install -y --no-install-recommends \
    libopenblas0 \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instala dependências a partir dos wheels pré-compilados do estágio builder
COPY --from=builder /build/wheels /wheels
RUN pip install --no-cache-dir setuptools==69.5.1 wheel && \
    pip install --no-cache-dir face_recognition_models && \
    pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* && \
    rm -rf /wheels

COPY . .

# Executar processo como usuário restrito não-root
RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=20s \
  CMD curl -f http://127.0.0.1:8000/api/v1/health/live || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
