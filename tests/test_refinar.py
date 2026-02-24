import sys
import os
import tempfile
import shutil
import pytest
from pathlib import Path
from unittest import mock

# Importar la función a testear
import importlib.util
spec = importlib.util.spec_from_file_location("refinar", "scripts/refinar.py")
refinar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refinar)


def test_archivo_no_encontrado(monkeypatch):
    with pytest.raises(SystemExit) as e:
        refinar.refinar_hu("no_existe.txt")
    assert e.value.code == 1


def test_refinar_hu_flujo_exitoso(monkeypatch):
    # Crear archivo temporal de entrada
    with tempfile.TemporaryDirectory() as tmpdir:
        entrada_path = Path(tmpdir) / "HU-001.txt"
        entrada_path.write_text("Como usuario quiero algo para un beneficio.")
        salida_dir = Path(tmpdir) / "refinada"
        salida_path = salida_dir / "HU-001.md"

        # Mock AzureOpenAI y respuesta
        class MockChoices:
            class MockMessage:
                content = "# Historia refinada\nContenido markdown."
            message = MockMessage()
        class MockResponse:
            choices = [MockChoices()]
        class MockChat:
            def completions(self):
                pass
            completions = mock.Mock()
            completions.create = mock.Mock(return_value=MockResponse())
        class MockAzureOpenAI:
            def __init__(self, **kwargs):
                self.chat = MockChat()
        monkeypatch.setattr(refinar, "AzureOpenAI", MockAzureOpenAI)
        monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "fake-endpoint")
        monkeypatch.setenv("AZURE_OPENAI_API_KEY", "fake-key")
        monkeypatch.setenv("AZURE_OPENAI_API_VERSION", "2025-04-01-preview")
        monkeypatch.setenv("AZURE_DEPLOYMENT_NAME", "gpt-4.1")

        # Cambiar el directorio de salida temporalmente
        orig_cwd = os.getcwd()
        os.chdir(tmpdir)
        try:
            refinar.refinar_hu(str(entrada_path))
            assert salida_path.exists()
            contenido = salida_path.read_text()
            assert "# Historia refinada" in contenido
        finally:
            os.chdir(orig_cwd)


def test_limpiar_bloques_codigo(monkeypatch):
    # Similar al anterior pero la respuesta contiene bloques de código
    with tempfile.TemporaryDirectory() as tmpdir:
        entrada_path = Path(tmpdir) / "HU-002.txt"
        entrada_path.write_text("Como usuario quiero otra cosa.")
        salida_dir = Path(tmpdir) / "refinada"
        salida_path = salida_dir / "HU-002.md"

        class MockChoices:
            class MockMessage:
                content = """```markdown\n# Historia refinada\nContenido markdown.\n```"""
            message = MockMessage()
        class MockResponse:
            choices = [MockChoices()]
        class MockChat:
            completions = mock.Mock()
            completions.create = mock.Mock(return_value=MockResponse())
        class MockAzureOpenAI:
            def __init__(self, **kwargs):
                self.chat = MockChat()
        monkeypatch.setattr(refinar, "AzureOpenAI", MockAzureOpenAI)
        monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "fake-endpoint")
        monkeypatch.setenv("AZURE_OPENAI_API_KEY", "fake-key")

        orig_cwd = os.getcwd()
        os.chdir(tmpdir)
        try:
            refinar.refinar_hu(str(entrada_path))
            assert salida_path.exists()
            contenido = salida_path.read_text()
            assert not contenido.startswith("```")
            assert "# Historia refinada" in contenido
        finally:
            os.chdir(orig_cwd)
