import os
import sys
import tempfile
import shutil
import types
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Importar la función a testear
test_dir = os.path.dirname(os.path.abspath(__file__))
scripts_dir = os.path.abspath(os.path.join(test_dir, '..', 'scripts'))
sys.path.insert(0, scripts_dir)
from refinar import refinar_hu


def test_refinar_hu_archivo_no_encontrado(monkeypatch, capsys):
    # Prueba: archivo de entrada no existe
    with pytest.raises(SystemExit) as excinfo:
        refinar_hu('no_existe.txt')
    captured = capsys.readouterr()
    assert '❌ Archivo no encontrado' in captured.out
    assert excinfo.value.code == 1


def test_refinar_hu_flujo_exitoso(monkeypatch, tmp_path):
    # Crear archivo de entrada temporal
    entrada = tmp_path / 'HU-001.txt'
    entrada.write_text('Historia de usuario de prueba')
    salida_dir = tmp_path / 'refinada'
    salida_dir.mkdir()
    salida = salida_dir / 'HU-001.md'

    # Mock de entorno y AzureOpenAI
    env = {
        'AZURE_OPENAI_ENDPOINT': 'endpoint',
        'AZURE_OPENAI_API_KEY': 'key',
        'AZURE_OPENAI_API_VERSION': '2025-04-01-preview',
        'AZURE_DEPLOYMENT_NAME': 'gpt-4.1',
    }
    monkeypatch.setattr(os, 'environ', env)

    # Mock de AzureOpenAI y respuesta
    mock_cliente = MagicMock()
    mock_respuesta = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '# Historia refinada\nContenido'
    mock_respuesta.choices = [mock_choice]
    mock_cliente.chat.completions.create.return_value = mock_respuesta
    monkeypatch.setattr('refinar.AzureOpenAI', lambda **kwargs: mock_cliente)

    # Mock Path para salida en tmp_path
    orig_path = Path
    def fake_path(p):
        if str(p).startswith('refinada'):
            return orig_path(str(salida))
        return orig_path(p)
    monkeypatch.setattr('refinar.Path', fake_path)

    # Ejecutar función
    refinar_hu(str(entrada))
    # Verificar archivo de salida
    assert salida.exists()
    contenido = salida.read_text()
    assert '# Historia refinada' in contenido


def test_refinar_hu_limpiar_markdown(monkeypatch, tmp_path):
    entrada = tmp_path / 'HU-002.txt'
    entrada.write_text('Historia de usuario de prueba')
    salida = tmp_path / 'HU-002.md'

    env = {
        'AZURE_OPENAI_ENDPOINT': 'endpoint',
        'AZURE_OPENAI_API_KEY': 'key',
        'AZURE_OPENAI_API_VERSION': '2025-04-01-preview',
        'AZURE_DEPLOYMENT_NAME': 'gpt-4.1',
    }
    monkeypatch.setattr(os, 'environ', env)

    mock_cliente = MagicMock()
    mock_respuesta = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '```markdown\n# Historia\nContenido\n```'
    mock_respuesta.choices = [mock_choice]
    mock_cliente.chat.completions.create.return_value = mock_respuesta
    monkeypatch.setattr('refinar.AzureOpenAI', lambda **kwargs: mock_cliente)

    # Mock Path para salida en tmp_path
    orig_path = Path
    def fake_path(p):
        if str(p).startswith('refinada'):
            return orig_path(str(salida))
        return orig_path(p)
    monkeypatch.setattr('refinar.Path', fake_path)

    refinar_hu(str(entrada))
    assert salida.exists()
    contenido = salida.read_text()
    assert contenido.startswith('# Historia')
    assert '```' not in contenido
