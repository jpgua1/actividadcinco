import os
import sys
import tempfile
import shutil
import types
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Importar la función a testear
def import_refinar_hu():
    sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))
    from refinar import refinar_hu
    return refinar_hu


def test_refinar_hu_archivo_no_encontrado(monkeypatch):
    refinar_hu = import_refinar_hu()
    with pytest.raises(SystemExit) as excinfo:
        refinar_hu('no_existe.txt')
    assert excinfo.value.code == 1


def test_refinar_hu_flujo_exitoso(monkeypatch):
    refinar_hu = import_refinar_hu()
    # Crear archivo temporal de entrada
    with tempfile.TemporaryDirectory() as tmpdir:
        entrada_path = Path(tmpdir) / 'HU-001.txt'
        entrada_path.write_text('Historia de usuario de prueba', encoding='utf-8')
        salida_dir = Path(tmpdir) / 'refinada'
        salida_path = salida_dir / 'HU-001.md'

        # Mock de AzureOpenAI y respuesta
        mock_cliente = MagicMock()
        mock_respuesta = MagicMock()
        mock_respuesta.choices = [types.SimpleNamespace(message=types.SimpleNamespace(content='# Historia refinada'))]
        mock_cliente.chat.completions.create.return_value = mock_respuesta

        monkeypatch.setenv('AZURE_OPENAI_ENDPOINT', 'endpoint')
        monkeypatch.setenv('AZURE_OPENAI_API_KEY', 'key')
        monkeypatch.setenv('AZURE_OPENAI_API_VERSION', '2025-04-01-preview')
        monkeypatch.setenv('AZURE_DEPLOYMENT_NAME', 'gpt-4.1')

        with patch('refinar.AzureOpenAI', return_value=mock_cliente):
            # Cambiar cwd temporalmente para que escriba en el tmpdir
            old_cwd = os.getcwd()
            os.chdir(tmpdir)
            try:
                refinar_hu(str(entrada_path))
                assert salida_path.exists()
                contenido = salida_path.read_text(encoding='utf-8')
                assert contenido.startswith('# Historia refinada')
            finally:
                os.chdir(old_cwd)


def test_refinar_hu_limpia_bloques_codigo(monkeypatch):
    refinar_hu = import_refinar_hu()
    with tempfile.TemporaryDirectory() as tmpdir:
        entrada_path = Path(tmpdir) / 'HU-002.txt'
        entrada_path.write_text('Historia de usuario de prueba', encoding='utf-8')
        salida_path = Path(tmpdir) / 'refinada' / 'HU-002.md'

        mock_cliente = MagicMock()
        # Simula respuesta con bloque de código markdown
        mock_respuesta = MagicMock()
        mock_respuesta.choices = [types.SimpleNamespace(message=types.SimpleNamespace(content='```markdown\n# Historia refinada\n```'))]
        mock_cliente.chat.completions.create.return_value = mock_respuesta

        monkeypatch.setenv('AZURE_OPENAI_ENDPOINT', 'endpoint')
        monkeypatch.setenv('AZURE_OPENAI_API_KEY', 'key')

        with patch('refinar.AzureOpenAI', return_value=mock_cliente):
            old_cwd = os.getcwd()
            os.chdir(tmpdir)
            try:
                refinar_hu(str(entrada_path))
                assert salida_path.exists()
                contenido = salida_path.read_text(encoding='utf-8')
                assert contenido == '# Historia refinada'
            finally:
                os.chdir(old_cwd)
