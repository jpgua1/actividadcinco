#!/usr/bin/env python3
"""
Refinador de Historias de Usuario con Google Gemini (SDK google-genai)
Uso: python scripts/refinar.py hu/HU-001.txt
"""

import sys
import os
import re
from pathlib import Path
from google import genai
from google.genai import types

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


def refinar_hu(ruta_entrada: str) -> None:
    entrada = Path(ruta_entrada)
    if not entrada.exists():
        print(f"❌ Archivo no encontrado: {ruta_entrada}")
        sys.exit(1)

    contenido = entrada.read_text(encoding="utf-8").strip()
    nombre_salida = entrada.stem + ".md"
    ruta_salida = Path("refinada") / nombre_salida

    print(f"📄 Leyendo: {entrada}")
    print(f"💬 Enviando a Gemini 1.5 Flash para refinamiento...")

    cliente = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    respuesta = cliente.models.generate_content(
        model="gemini-1.5-flash",
        contents=f"Refina esta historia de usuario:\n\n{contenido}",
        config=types.GenerateContentConfig(
            system_instruction=PROMPT_SISTEMA,
            temperature=0.3,
        ),
    )

    markdown = respuesta.text.strip()

    # Limpiar posibles bloques de código que el modelo pudo agregar
    markdown = re.sub(r"^```(?:markdown)?\n?", "", markdown)
    markdown = re.sub(r"\n?```$", "", markdown)

    ruta_salida.parent.mkdir(parents=True, exist_ok=True)
    ruta_salida.write_text(markdown, encoding="utf-8")

    print(f"✅ Historia refinada guardada en: {ruta_salida}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/refinar.py hu/HU-001.txt")
        sys.exit(1)
    refinar_hu(sys.argv[1])
