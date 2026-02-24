import sys
import os
import tempfile
import shutil
import types
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Importar la función a testear
def import_refinar_hu():
    import importlib.util
    spec = importlib.util.spec_from_file_location("refinar", "scripts/refinar.py")
    refinar = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(refinar)
    return refinar.refinar_hu


def test_archivo_no_encontrado(monkeypatch):
    refinar_hu = import_refinar_hu()
    with pytest.raises(SystemExit) as excinfo:
        refinar_hu("no_existe.txt")
    assert excinfo.value.code == 1


def test_refinar_hu_ok(monkeypatch):
    refinar_hu = import_refinar_hu()
    # Crear archivo temporal de entrada
    with tempfile.TemporaryDirectory() as tmpdir:
        entrada_path = Path(tmpdir) / "HU-001.txt"
        entrada_path.write_text("Historia de usuario de prueba", encoding="utf-8")
        salida_dir = Path(tmpdir) / "refinada"
        salida_path = salida_dir / "HU-001.md"

        # Mock AzureOpenAI y respuesta
        mock_cliente = MagicMock()
        mock_respuesta = MagicMock()
        mock_respuesta.choices = [MagicMock()]
        mock_respuesta.choices[0].message.content = "# Historia refinada\nContenido refinado"
        mock_cliente.chat.completions.create.return_value = mock_respuesta

        # Parchear entorno y clases
        monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "endpoint")
        monkeypatch.setenv("AZURE_OPENAI_API_KEY", "key")
        monkeypatch.setenv("AZURE_DEPLOYMENT_NAME", "deployment")
        monkeypatch.setenv("AZURE_OPENAI_API_VERSION", "2025-04-01-preview")

        with patch("scripts.refinar.AzureOpenAI", return_value=mock_cliente):
            # Parchear Path para que escriba en tmpdir/refinada
            with patch("scripts.refinar.Path", wraps=Path) as mock_path:
                def custom_path(p):
                    # Redirigir 'refinada' a tmpdir/refinada
                    if p == "refinada":
                        return Path(tmpdir) / "refinada"
                    return Path(p)
                mock_path.side_effect = custom_path

                refinar_hu(str(entrada_path))
                # Verificar que el archivo de salida se creó correctamente
                assert salida_path.exists()
                contenido = salida_path.read_text(encoding="utf-8")
                assert "# Historia refinada" in contenido
                assert "Contenido refinado" in contenido


def test_limpiar_bloques_codigo(monkeypatch):
    refinar_hu = import_refinar_hu()
    with tempfile.TemporaryDirectory() as tmpdir:
        entrada_path = Path(tmpdir) / "HU-002.txt"
        entrada_path.write_text("Historia de usuario de prueba", encoding="utf-8")
        salida_dir = Path(tmpdir) / "refinada"
        salida_path = salida_dir / "HU-002.md"

        mock_cliente = MagicMock()
        mock_respuesta = MagicMock()
        mock_respuesta.choices = [MagicMock()]
        mock_respuesta.choices[0].message.content = """```markdown\n# Historia refinada\nContenido refinado\n```"""
        mock_cliente.chat.completions.create.return_value = mock_respuesta

        monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "endpoint")
        monkeypatch.setenv("AZURE_OPENAI_API_KEY", "key")
        monkeypatch.setenv("AZURE_DEPLOYMENT_NAME", "deployment")
        monkeypatch.setenv("AZURE_OPENAI_API_VERSION", "2025-04-01-preview")

        with patch("scripts.refinar.AzureOpenAI", return_value=mock_cliente):
            with patch("scripts.refinar.Path", wraps=Path) as mock_path:
                def custom_path(p):
                    if p == "refinada":
                        return Path(tmpdir) / "refinada"
                    return Path(p)
                mock_path.side_effect = custom_path

                refinar_hu(str(entrada_path))
                assert salida_path.exists()
                contenido = salida_path.read_text(encoding="utf-8")
                assert "# Historia refinada" in contenido
                assert "Contenido refinado" in contenido
                assert "```" not in contenido
