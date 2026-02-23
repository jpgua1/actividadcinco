#!/usr/bin/env python3
"""
Refinador de Historias de Usuario con Google Gemini (REST API)
Uso: python scripts/refinar.py hu/HU-001.txt
"""

import sys
import os
import re
import json
import requests
from pathlib import Path

PROMPT_SISTEMA = """
Eres un agente experto en metodologías ágiles. Tu única tarea es transformar
historias de usuario en borrador en versiones completamente refinadas.

Devuelve ÚNICAMENTE el markdown de la historia refinada, sin texto adicional
ni bloques de código (sin triple backtick). Usa exactamente este formato:

# [TÍTULO DE LA HISTORIA]

## Historia de Usuario
> Como **[rol]**, quiero **[acción]** para **[beneficio/valor]**.

## Criterios de Aceptación

### AC1 – [Nombre del criterio]
- **Dado** que [contexto/precondición]
- **Cuando** [acción del usuario o sistema]
- **Entonces** [resultado esperado]

### AC2 – [Nombre del criterio]
- **Dado** que ...
- **Cuando** ...
- **Entonces** ...

### AC3 – [Nombre del criterio]
- **Dado** que ...
- **Cuando** ...
- **Entonces** ...

## Definición de Listo (DoR)
- [ ] La historia está estimada en story points
- [ ] Los criterios de aceptación son claros y verificables
- [ ] El equipo entiende el alcance y no tiene dudas bloqueantes
- [ ] Las dependencias externas están identificadas
- [ ] Los mockups o diseños están disponibles (si aplica)

## Definición de Terminado (DoD)
- [ ] El código está desarrollado y revisado (code review aprobado)
- [ ] Las pruebas unitarias están escritas y pasan
- [ ] Las pruebas de integración pasan
- [ ] El criterio de aceptación fue validado con el Product Owner
- [ ] La documentación técnica está actualizada
- [ ] Desplegado en el ambiente de staging

## Estimación
| Campo           | Valor                     |
|-----------------|---------------------------|
| Story Points    | [1 / 2 / 3 / 5 / 8 / 13] |
| Prioridad       | [Alta / Media / Baja]     |
| Sprint sugerido | [Sprint N]                |

## Notas Técnicas
- **Dependencias:** [lista de dependencias o "Ninguna"]
- **Riesgos:** [posibles riesgos técnicos]
- **Consideraciones de seguridad:** [si aplica]
- **APIs / Servicios externos:** [si aplica]
"""

# Modelos a intentar en orden de preferencia
MODELOS = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro-latest",
    "gemini-pro",
]


def llamar_gemini(api_key: str, modelo: str, contenido: str) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{modelo}:generateContent?key={api_key}"
    )
    payload = {
        "system_instruction": {"parts": [{"text": PROMPT_SISTEMA}]},
        "contents": [
            {"parts": [{"text": f"Refina esta historia de usuario:\n\n{contenido}"}]}
        ],
        "generationConfig": {"temperature": 0.3},
    }
    resp = requests.post(url, json=payload, timeout=60)
    if resp.status_code == 200:
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    return None


def refinar_hu(ruta_entrada: str) -> None:
    entrada = Path(ruta_entrada)
    if not entrada.exists():
        print(f"❌ Archivo no encontrado: {ruta_entrada}")
        sys.exit(1)

    contenido = entrada.read_text(encoding="utf-8").strip()
    nombre_salida = entrada.stem + ".md"
    ruta_salida = Path("refinada") / nombre_salida
    api_key = os.environ["GEMINI_API_KEY"]

    print(f"📄 Leyendo: {entrada}")

    markdown = None
    for modelo in MODELOS:
        print(f"💬 Intentando con modelo: {modelo}...")
        markdown = llamar_gemini(api_key, modelo, contenido)
        if markdown:
            print(f"✅ Respuesta recibida de {modelo}")
            break
        else:
            print(f"⚠️  {modelo} no disponible, probando siguiente...")

    if not markdown:
        print("❌ Ningún modelo de Gemini respondió correctamente.")
        sys.exit(1)

    # Limpiar posibles bloques de código
    markdown = re.sub(r"^```(?:markdown)?\n?", "", markdown.strip())
    markdown = re.sub(r"\n?```$", "", markdown)

    ruta_salida.parent.mkdir(parents=True, exist_ok=True)
    ruta_salida.write_text(markdown, encoding="utf-8")
    print(f"✅ Historia refinada guardada en: {ruta_salida}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/refinar.py hu/HU-001.txt")
        sys.exit(1)
    refinar_hu(sys.argv[1])
