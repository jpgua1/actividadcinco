# 📘 Cómo Usar el Skill de Refinamiento Automático de Historias de Usuario

## 🎯 ¿Qué hace este skill?

Este skill **refina automáticamente** historias de usuario cada vez que subes un archivo `.txt` a la carpeta `hu/`. Utiliza Azure OpenAI (GPT-4.1) para transformar borradores simples en historias completas con criterios de aceptación, estimaciones y notas técnicas.

---

## 📋 Requisitos Previos

### 1. Configurar GitHub Secrets

Ve a tu repositorio en GitHub:
```
Settings → Secrets and variables → Actions → New repository secret
```

Agrega estos 4 secrets:

| Secret Name | Valor |
|-------------|-------|
| `AZURE_OPENAI_ENDPOINT` | `https://autbra-new.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | Tu API Key de Azure OpenAI |
| `AZURE_OPENAI_API_VERSION` | `2025-01-01-preview` |
| `AZURE_DEPLOYMENT_NAME` | `gpt-4.1` |

---

## 🚀 Paso a Paso para Usar el Skill

### Paso 1: Crear una Historia de Usuario Borrador

Crea un archivo `.txt` en la carpeta `hu/` con un nombre descriptivo:

```bash
# Ejemplo: hu/HU-020.txt
Historia de Usuario: Notificaciones por email

Como usuario registrado quiero recibir notificaciones por email cuando mi pedido cambie de estado.
```

**Formato mínimo recomendado:**
- Título de la historia
- Rol del usuario
- Acción que desea realizar
- Beneficio/valor esperado

### Paso 2: Subir el Archivo al Repositorio

```bash
# Agregar el archivo
git add hu/HU-020.txt

# Hacer commit
git commit -m "Nueva HU: Notificaciones por email"

# Subir al repositorio
git push
```

### Paso 3: Esperar el Refinamiento Automático

**¿Qué sucede automáticamente?**

1. GitHub Actions detecta el nuevo archivo `.txt` en `hu/`
2. Se ejecuta el workflow `🤖 Refinador de Historias de Usuario`
3. El script `scripts/refinar.py` procesa cada archivo modificado
4. Azure OpenAI genera la historia refinada
5. El workflow hace commit de los archivos refinados en `refinada/`

**Tiempo estimado:** 30-60 segundos (dependiendo de cuántas HU subas)

### Paso 4: Obtener la Historia Refinada

```bash
# Traer los cambios del repositorio
git pull
```

Tu historia refinada estará en:
```
refinada/HU-020.md
```

---

## 📝 Ejemplo Completo

### Entrada: `hu/HU-020.txt`
```
Historia de Usuario: Notificaciones por email

Como usuario registrado quiero recibir notificaciones por email cuando mi pedido cambie de estado.
```

### Salida: `refinada/HU-020.md`
```markdown
# Notificaciones por Email de Estado de Pedidos

## Historia de Usuario
> Como **usuario registrado**, quiero **recibir notificaciones por email cuando mi pedido cambie de estado** para **estar informado en tiempo real del progreso de mi compra**.

## Criterios de Aceptación

### AC1 – Notificación al confirmar pedido
- **Dado** que realicé un pedido exitosamente
- **Cuando** el sistema confirma la orden
- **Entonces** recibo un email con los detalles del pedido

### AC2 – Notificación al cambiar estado
- **Dado** que tengo un pedido en proceso
- **Cuando** el estado cambia (preparando, enviado, entregado)
- **Entonces** recibo un email informando el nuevo estado

### AC3 – Preferencias de notificación
- **Dado** que estoy en mi perfil de usuario
- **Cuando** accedo a configuración de notificaciones
- **Entonces** puedo activar/desactivar notificaciones por email

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
| Campo           | Valor     |
|-----------------|-----------|
| Story Points    | 5         |
| Prioridad       | Media     |
| Sprint sugerido | Sprint 2  |

## Notas Técnicas
- **Dependencias:** Servicio de email (SendGrid/AWS SES), sistema de gestión de pedidos
- **Riesgos:** Emails marcados como spam, latencia en envío
- **Consideraciones de seguridad:** No incluir información sensible en emails, usar enlaces seguros
- **APIs / Servicios externos:** API de envío de emails, webhooks del sistema de pedidos
```

---

## 🔍 Verificar el Estado del Workflow

### Desde GitHub Web
1. Ve a tu repositorio
2. Click en la pestaña **Actions**
3. Verás el workflow `🤖 Refinador de Historias de Usuario` ejecutándose

### Desde Terminal
```bash
# Ver las últimas ejecuciones
gh run list --limit 5

# Ver en tiempo real
gh run watch
```

---

## 💰 Control de Costos

El script está configurado con:
- **max_tokens:** 4000 (balance calidad/costo)
- **temperature:** 0.3 (respuestas consistentes)

**Para reducir costos aún más**, edita `scripts/refinar.py:98`:
```python
max_tokens=2000,  # Historias más cortas
```

---

## 🛠️ Troubleshooting

### El workflow no se ejecuta
- Verifica que los secrets estén configurados correctamente
- Asegúrate de que el archivo esté en `hu/` y tenga extensión `.txt`
- Revisa los logs en GitHub Actions

### La historia refinada tiene errores
- Asegúrate de que el borrador tenga un mínimo de contexto
- Revisa que la API Key de Azure OpenAI sea válida
- Verifica que el deployment `gpt-4.1` esté disponible

### El commit automático falla
- Verifica los permisos del workflow en Settings → Actions → General
- Asegúrate de que `contents: write` esté habilitado

---

## 📁 Estructura del Proyecto

```
.
├── .github/
│   └── workflows/
│       └── refinar-hu.yml          # Workflow de GitHub Actions
├── hu/                             # Historias borradores (.txt)
│   ├── HU-001.txt
│   ├── HU-002.txt
│   └── ...
├── refinada/                       # Historias refinadas (.md)
│   ├── HU-001.md
│   ├── HU-002.md
│   └── ...
├── scripts/
│   └── refinar.py                  # Script de refinamiento con Azure OpenAI
├── requirements.txt                # Dependencias Python
├── agent.md                        # Descripción del agente
└── README.md                       # Documentación general
```

---

## ⚡ Tips Pro

1. **Refinar múltiples HU a la vez:** Sube varios archivos `.txt` en un solo commit
2. **Nombrar archivos consistentemente:** Usa el formato `HU-XXX.txt`
3. **Revisar la salida:** Siempre valida la historia refinada antes de usarla
4. **Personalizar el prompt:** Edita `scripts/refinar.py` líneas 13-69 para ajustar el formato

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en GitHub Actions
2. Verifica que los secrets estén configurados
3. Consulta el archivo `agent.md` para entender el formato esperado
