# ═══════════════════════════════════════════════════════════════
# Dockerfile - Agente de Estimación y Alcance
# NTT DATA - Hackathon 2026
# ═══════════════════════════════════════════════════════════════

FROM python:3.12-slim

# Metadatos
LABEL maintainer="NTT DATA"
LABEL description="Agente de Estimación - Genera artefactos para proyectos digitales con IA"
LABEL version="1.0"

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primero (para cache de Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código
COPY api.py .
COPY AS_langgraphEnabler.py .
COPY web/ ./web/

# Crear directorio de outputs
RUN mkdir -p outputs

# Exponer puerto
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Comando de inicio
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
