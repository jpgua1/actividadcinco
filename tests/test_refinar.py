import os
import sys
import tempfile
import shutil
import types
import pytest
from pathlib import Path

# Importar el módulo a testear
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
import refinar

class DummyAzureOpenAI:
    def __init__(self, *args, **kwargs):
        pass
    class chat:
        class completions:
            @staticmethod
            def create(model, messages, temperature, max_tokens):
                # Simula una respuesta de OpenAI
                class DummyResponse:
                    class choices:
                        message = types.SimpleNamespace(content="# Historia refinada\n\n## Historia de Usuario\n> Como **usuario**, quiero **algo** para **beneficio**.\n\n## Criterios de Aceptación\n\n### AC1 – Ejemplo\n- **Dado** que existe un contexto\n- **Cuando** ocurre una acción\n- **Entonces** se espera un resultado\n")
                    choices = [choices]
                return DummyResponse()

@pytest.fixture
def temp_hu_file():
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, "HU-TEST.txt")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("Como usuario, quiero algo para beneficio.")
    yield file_path
    shutil.rmtree(temp_dir)

def test_refinar_hu_crea_md(monkeypatch, temp_hu_file):
    # Parchear AzureOpenAI por el dummy
    monkeypatch.setattr(refinar, "AzureOpenAI", DummyAzureOpenAI)
    # Parchear variables de entorno necesarias
    monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "dummy")
    monkeypatch.setenv("AZURE_OPENAI_API_KEY", "dummy")
    # Crear carpeta temporal para salida
    temp_out = tempfile.mkdtemp()
    monkeypatch.setattr(refinar, "Path", lambda x: Path(temp_out) / Path(x).name if not str(x).endswith('.txt') else Path(x))
    salida_md = Path(temp_out) / "HU-TEST.md"
    try:
        refinar.refinar_hu(temp_hu_file)
        assert salida_md.exists(), "El archivo markdown de salida no fue creado."
        contenido = salida_md.read_text(encoding="utf-8")
        assert "# Historia refinada" in contenido
        assert "## Historia de Usuario" in contenido
        assert "## Criterios de Aceptación" in contenido
    finally:
        shutil.rmtree(temp_out)

def test_refinar_hu_archivo_no_encontrado(monkeypatch):
    # Parchear AzureOpenAI por el dummy
    monkeypatch.setattr(refinar, "AzureOpenAI", DummyAzureOpenAI)
    # Parchear sys.exit para capturar la salida
    exit_called = {}
    def fake_exit(code):
        exit_called['code'] = code
        raise SystemExit(code)
    monkeypatch.setattr(sys, "exit", fake_exit)
    with pytest.raises(SystemExit):
        refinar.refinar_hu("no_existe.txt")
    assert exit_called['code'] == 1
