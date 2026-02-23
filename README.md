# 🤖 GitHub Actions Skill: Refinador de Historias de Usuario

Un **GitHub Actions Skill** que refina automáticamente historias de usuario en borrador usando Azure OpenAI. Cuando haces push de un archivo `.txt` en la carpeta `hu/`, el workflow lo procesa y genera una versión completamente refinada en `refinada/`.

## 🗂️ Estructura del repositorio

```
├── .github/
│   └── workflows/
│       └── refinar-hu.yml   ← Workflow automático
├── hu/                      ← Coloca aquí tus HUs en borrador (.txt)
├── refinada/                ← Las HUs refinadas aparecen aquí (.md)
├── scripts/
│   └── refinar.py           ← Script que llama a Azure OpenAI
├── requirements.txt
└── agent.md                 ← Definición del comportamiento del agente
```

## ⚡ Cómo funciona

```
Push de hu/HU-XXX.txt
       ↓
GitHub Actions detecta el cambio
       ↓
Azure OpenAI refina la historia con el formato ágil completo
       ↓
Auto-commit de refinada/HU-XXX.md en el repositorio
```

## 🚀 Cómo usar el skill

### 1. Crea una historia en borrador

```bash
# Crea un archivo en hu/ con tu historia en borrador
echo "Como usuario quiero poder ver mi historial de pedidos para saber qué he comprado." > hu/HU-006.txt
```

### 2. Haz push al repositorio

```bash
git add hu/HU-006.txt
git commit -m "Nueva historia: historial de pedidos"
git push
```

### 3. El skill trabaja automáticamente

En ~30 segundos aparece `refinada/HU-006.md` con:
- ✅ Historia de usuario en formato estándar
- ✅ 3 criterios de aceptación (Dado/Cuando/Entonces)
- ✅ Definición de Listo (DoR) y de Terminado (DoD)
- ✅ Estimación en Story Points
- ✅ Notas técnicas

---

## 🛠️ Cómo crear tu propio GitHub Actions Skill

### Paso 1 — Instala las herramientas requeridas

```bash
# Git (verificar)
git --version

# GitHub CLI
brew install gh

# Node.js y npm (opcional, para proyectos JavaScript)
brew install node
```

### Paso 2 — Autentícate en GitHub

```bash
gh auth login
# Elige: GitHub.com → HTTPS → Login with web browser
```

### Paso 3 — Crea tu repositorio

```bash
mkdir mi-skill && cd mi-skill
git init
gh repo create mi-skill --public --source=. --remote=origin --push
```

### Paso 4 — Crea el workflow en `.github/workflows/mi-skill.yml`

```yaml
name: 🤖 Mi Skill

on:
  push:
    paths:
      - 'input/**.txt'   # Se dispara solo cuando cambian archivos aquí

permissions:
  contents: write        # Necesario para que el bot pueda hacer commit

jobs:
  procesar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - run: pip install openai

      - name: Detectar archivos modificados
        id: cambios
        run: |
          FILES=$(git diff --name-only HEAD~1 HEAD -- 'input/*.txt' | tr '\n' ' ')
          echo "archivos=$FILES" >> $GITHUB_OUTPUT

      - name: Ejecutar el skill
        env:
          AZURE_OPENAI_API_KEY: ${{ secrets.AZURE_OPENAI_API_KEY }}
          AZURE_OPENAI_ENDPOINT: ${{ secrets.AZURE_OPENAI_ENDPOINT }}
          AZURE_OPENAI_API_VERSION: ${{ secrets.AZURE_OPENAI_API_VERSION }}
          AZURE_DEPLOYMENT_NAME: ${{ secrets.AZURE_DEPLOYMENT_NAME }}
        run: |
          for FILE in ${{ steps.cambios.outputs.archivos }}; do
            python scripts/mi_script.py "$FILE"
          done

      - name: Auto-commit del resultado
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add output/
          git diff --staged --quiet || git commit -m "✅ Skill ejecutado" && git push
```

### Paso 5 — Crea el script Python (`scripts/mi_script.py`)

```python
from openai import AzureOpenAI
import os, sys
from pathlib import Path

cliente = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version=os.environ["AZURE_OPENAI_API_VERSION"],
)

entrada = Path(sys.argv[1])
contenido = entrada.read_text()

respuesta = cliente.chat.completions.create(
    model=os.environ["AZURE_DEPLOYMENT_NAME"],
    messages=[
        {"role": "system", "content": "Tu instrucción de sistema aquí"},
        {"role": "user", "content": contenido},
    ],
)

salida = Path("output") / (entrada.stem + ".md")
salida.parent.mkdir(exist_ok=True)
salida.write_text(respuesta.choices[0].message.content)
print(f"✅ Guardado: {salida}")
```

### Paso 6 — Configura los secrets en GitHub

```bash
# Con GitHub CLI directamente desde la terminal:
gh secret set AZURE_OPENAI_ENDPOINT --body "https://tu-endpoint.openai.azure.com/"
gh secret set AZURE_OPENAI_API_KEY   --body "tu-api-key"
gh secret set AZURE_OPENAI_API_VERSION --body "2025-04-01-preview"
gh secret set AZURE_DEPLOYMENT_NAME  --body "gpt-4.1"
```

O manualmente en:
`https://github.com/TU_USUARIO/TU_REPO/settings/secrets/actions/new`

### Paso 7 — ¡Prueba el skill!

```bash
echo "Tu contenido de prueba" > input/prueba.txt
git add . && git commit -m "test" && git push
```

Verifica el resultado en:
`https://github.com/TU_USUARIO/TU_REPO/actions`

---

## 📋 Secrets requeridos

| Secret | Descripción | Ejemplo |
|---|---|---|
| `AZURE_OPENAI_ENDPOINT` | URL del endpoint de Azure OpenAI | `https://xxx.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | Clave de la API | `AodBGUX...` |
| `AZURE_OPENAI_API_VERSION` | Versión de la API | `2025-04-01-preview` |
| `AZURE_DEPLOYMENT_NAME` | Nombre del deployment/modelo | `gpt-4.1` |

## 💡 Ideas para otros skills

Con el mismo patrón puedes automatizar:
- 📝 **Generador de documentación** — push de código → genera docs en Markdown
- 🧪 **Generador de casos de prueba** — push de historia → genera tests
- 🌐 **Traductor** — push de archivo en español → versión en inglés
- 📊 **Analizador de código** — push de PR → análisis de calidad
- 📧 **Redactor de comunicados** — push de notas → comunicado formal
