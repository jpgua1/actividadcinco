# 🚀 Agente de Estimación y Alcance

> Genera artefactos completos para arranque de proyectos digitales con IA

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)
![LangChain](https://img.shields.io/badge/LangChain-0.1+-orange.svg)

## 📋 Descripción

Este agente utiliza **Azure OpenAI (GPT-4.1)** para analizar documentación técnica/funcional y generar automáticamente los siguientes artefactos:

| Artefacto | Descripción |
|-----------|-------------|
| 🏗️ **Arquitectura** | Diagrama Mermaid del sistema |
| 👥 **Equipo** | Propuesta de roles y perfiles |
| 📋 **Épicas** | Backlog con historias de usuario |
| 📅 **Gantt** | Cronograma timeline interactivo |
| 💰 **Económica** | Propuesta de costos por perfil |
| ⚠️ **Riesgos** | Análisis de riesgos SDLC |
| 📦 **Prerrequisitos** | Requisitos previos del proyecto |
| ❓ **Consultas** | Preguntas para el cliente |
| 🔧 **Mejoras** | Sugerencias técnicas |

## 🛠️ Instalación

```bash
# Clonar repositorio
git clone https://github.com/nttdata/agente-estimacion.git
cd agente-estimacion

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# .\venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt
```

## ⚙️ Configuración

Crear archivo `.env` con las variables de Azure OpenAI:

```env
AZURE_OPENAI_API_KEY=tu-api-key
AZURE_OPENAI_ENDPOINT=https://tu-recurso.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

## 🚀 Ejecución

```bash
# Iniciar servidor
uvicorn api:app --host 0.0.0.0 --port 8011 --reload

# Acceder a la aplicación
open http://localhost:8011
```

## 📁 Estructura

```
hackhaton/
├── api.py                 # Servidor FastAPI + endpoints
├── AS_langgraphEnabler.py # Orquestador LangGraph
├── requirements.txt       # Dependencias Python
├── pyproject.toml         # Metadatos del proyecto
├── .env                   # Variables de entorno (no versionado)
├── outputs/               # Archivos generados
└── web/
    ├── index.html         # Frontend principal
    ├── app.js             # Lógica JavaScript
    └── style.css          # Estilos CSS
```

## 🔌 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/preview` | Analiza documento y extrae info |
| POST | `/api/artifact/architecture` | Genera diagrama Mermaid |
| POST | `/api/artifact/team` | Genera propuesta de equipo |
| POST | `/api/artifact/epics` | Genera épicas del proyecto |
| POST | `/api/artifact/gantt` | Genera cronograma Gantt |
| POST | `/api/artifact/economics` | Genera propuesta económica |
| POST | `/api/artifact/risks` | Genera análisis de riesgos |
| POST | `/api/artifact/prerequisites` | Genera prerrequisitos |
| POST | `/api/artifact/questions` | Genera consultas al cliente |
| POST | `/api/artifact/improvements` | Genera mejoras técnicas |
| POST | `/api/artifact/export-all` | Exporta Word consolidado |
| GET | `/api/health` | Health check |

## ⌨️ Atajos de Teclado

- `Ctrl+Enter` - Procesar documentos
- `Escape` - Cerrar modal

## 📦 Funcionalidades

- ✅ Subida múltiple de archivos (PDF, TXT, DOC, DOCX, MD)
- ✅ Generación individual o masiva de artefactos
- ✅ Descarga en Word (.docx) de cada artefacto
- ✅ Exportación consolidada de toda la propuesta
- ✅ Persistencia de sesión en localStorage
- ✅ Notificaciones toast elegantes
- ✅ Diagramas Mermaid renderizados

## 📄 Licencia

MIT © NTT DATA
