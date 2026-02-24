import os
import sys
import tempfile
import shutil
import types
import pytest
from pathlib import Path
from unittest import mock

# Importar la función a testear
test_dir = os.path.abspath(os.path.dirname(__file__))
scripts_dir = os.path.abspath(os.path.join(test_dir, '..', 'scripts'))
sys.path.insert(0, scripts_dir)
from refinar import refinar_hu

class DummyResponse:
    class Choices:
        class Message:
            content = "# Historia refinada\n\n## Historia de Usuario\n> Como **usuario**, quiero **algo** para **beneficio**."
        message = Message()
    choices = [Choices()]

class DummyClient:
    def __init__(self, *args, **kwargs):
        pass
    class chat:
        class completions:
            @staticmethod
            def create(*args, **kwargs):
                return DummyResponse()

@mock.patch.dict(os.environ, {
    "AZURE_OPENAI_ENDPOINT": "dummy_endpoint",
    "AZURE_OPENAI_API_KEY": "dummy_key",
    "AZURE_OPENAI_API_VERSION": "dummy_version",
    "AZURE_DEPLOYMENT_NAME": "dummy_model"
})
@mock.patch("refinar.AzureOpenAI", DummyClient)
def test_refinar_hu_crea_markdown(tmp_path):
    # Crear archivo de entrada temporal
    entrada = tmp_path / "HU-001.txt"
    entrada.write_text("Como usuario, quiero algo para beneficio.")

    # Crear carpeta de salida
    refinada_dir = tmp_path / "refinada"
    refinada_dir.mkdir()
    salida = refinada_dir / "HU-001.md"

    # Cambiar cwd temporalmente para que la salida se escriba en la carpeta correcta
    old_cwd = os.getcwd()
    os.chdir(tmp_path)
    try:
        refinar_hu(str(entrada))
        # Verificar que el archivo markdown fue creado
        assert salida.exists()
        contenido = salida.read_text(encoding="utf-8")
        assert "# Historia refinada" in contenido
        assert "Historia de Usuario" in contenido
    finally:
        os.chdir(old_cwd)

@mock.patch.dict(os.environ, {
    "AZURE_OPENAI_ENDPOINT": "dummy_endpoint",
    "AZURE_OPENAI_API_KEY": "dummy_key",
    "AZURE_OPENAI_API_VERSION": "dummy_version",
    "AZURE_DEPLOYMENT_NAME": "dummy_model"
})
@mock.patch("refinar.AzureOpenAI", DummyClient)
def test_refinar_hu_archivo_no_encontrado(tmp_path, capsys):
    entrada = tmp_path / "noexiste.txt"
    with pytest.raises(SystemExit) as e:
        refinar_hu(str(entrada))
    captured = capsys.readouterr()
    assert "Archivo no encontrado" in captured.out
    assert e.value.code == 1
