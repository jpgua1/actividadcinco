import os
import sys
import tempfile
import shutil
import pytest
from pathlib import Path
from unittest import mock

# Importar la función a testear
target_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../scripts'))
sys.path.insert(0, target_path)
from refinar import refinar_hu

@mock.patch('refinar.AzureOpenAI')
def test_refinar_hu_crea_archivo_markdown(mock_azure_openai):
    # Preparar entorno temporal
    with tempfile.TemporaryDirectory() as tmpdir:
        hu_dir = Path(tmpdir) / 'hu'
        refinada_dir = Path(tmpdir) / 'refinada'
        hu_dir.mkdir()
        refinada_dir.mkdir()
        hu_file = hu_dir / 'HU-001.txt'
        hu_file.write_text('Como usuario quiero algo para obtener beneficio.', encoding='utf-8')

        # Mock de respuesta de AzureOpenAI
        mock_cliente = mock.Mock()
        mock_azure_openai.return_value = mock_cliente
        mock_response = mock.Mock()
        mock_choice = mock.Mock()
        mock_choice.message.content = '# Título\n\n## Historia de Usuario\n> Como **usuario**, quiero **algo** para **obtener beneficio**.'
        mock_response.choices = [mock_choice]
        mock_cliente.chat.completions.create.return_value = mock_response

        # Mock de variables de entorno necesarias
        with mock.patch.dict(os.environ, {
            'AZURE_OPENAI_ENDPOINT': 'endpoint',
            'AZURE_OPENAI_API_KEY': 'key',
            'AZURE_OPENAI_API_VERSION': '2025-04-01-preview',
            'AZURE_DEPLOYMENT_NAME': 'gpt-4.1',
        }):
            # Cambiar cwd temporalmente
            old_cwd = os.getcwd()
            os.chdir(tmpdir)
            try:
                refinar_hu(str(hu_file))
                salida = refinada_dir / 'HU-001.md'
                assert salida.exists(), 'El archivo markdown no fue creado.'
                contenido = salida.read_text(encoding='utf-8')
                assert '# Título' in contenido
                assert '## Historia de Usuario' in contenido
            finally:
                os.chdir(old_cwd)

@mock.patch('refinar.AzureOpenAI')
def test_refinar_hu_archivo_no_existe(mock_azure_openai):
    with tempfile.TemporaryDirectory() as tmpdir:
        no_file = Path(tmpdir) / 'noexiste.txt'
        with pytest.raises(SystemExit) as excinfo:
            refinar_hu(str(no_file))
        assert excinfo.value.code == 1

@mock.patch('refinar.AzureOpenAI')
def test_refinar_hu_limpiar_bloques_codigo(mock_azure_openai):
    with tempfile.TemporaryDirectory() as tmpdir:
        hu_dir = Path(tmpdir) / 'hu'
        refinada_dir = Path(tmpdir) / 'refinada'
        hu_dir.mkdir()
        refinada_dir.mkdir()
        hu_file = hu_dir / 'HU-002.txt'
        hu_file.write_text('Como admin quiero refinar historias.', encoding='utf-8')

        mock_cliente = mock.Mock()
        mock_azure_openai.return_value = mock_cliente
        mock_response = mock.Mock()
        mock_choice = mock.Mock()
        mock_choice.message.content = '```markdown\n# Título\n\n## Historia de Usuario\n> Como **admin**, quiero **refinar historias**.'
        mock_response.choices = [mock_choice]
        mock_cliente.chat.completions.create.return_value = mock_response

        with mock.patch.dict(os.environ, {
            'AZURE_OPENAI_ENDPOINT': 'endpoint',
            'AZURE_OPENAI_API_KEY': 'key',
        }):
            old_cwd = os.getcwd()
            os.chdir(tmpdir)
            try:
                refinar_hu(str(hu_file))
                salida = refinada_dir / 'HU-002.md'
                contenido = salida.read_text(encoding='utf-8')
                assert '```' not in contenido
                assert '# Título' in contenido
            finally:
                os.chdir(old_cwd)
