/**
 * app.js - Project Generator Agent Frontend Logic
 */

// API Base URL
const API_BASE = '';

// Estado global
let currentJobId = null;
let pollingInterval = null;
let currentResult = null;

// Elementos DOM
const formSection = document.getElementById('form-section');
const dashboard = document.getElementById('dashboard');
const analyzeForm = document.getElementById('analyze-form');
const startBtn = document.getElementById('startBtn');
const backBtn = document.getElementById('backBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const formStatus = document.getElementById('form-status');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressMessage = document.getElementById('progress-message');
const projectTitle = document.getElementById('project-title');

// Inicializar Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
        primaryColor: '#0052cc',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#334155',
        lineColor: '#475569',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        background: '#0f172a',
        mainBkg: '#1e293b',
        nodeBorder: '#334155',
        clusterBkg: '#1e293b',
        clusterBorder: '#334155',
        titleColor: '#e2e8f0',
        edgeLabelBackground: '#1e293b'
    },
    flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
    },
    gantt: {
        useMaxWidth: true,
        numberSectionStyles: 4,
        axisFormat: '%Y-%m-%d'
    }
});

// ============================================================
// EVENT LISTENERS
// ============================================================

analyzeForm.addEventListener('submit', handleSubmit);
backBtn.addEventListener('click', showForm);
downloadJsonBtn.addEventListener('click', downloadResults);

// FILE UPLOAD ELEMENTS
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const filesList = document.getElementById('files-list');
const filesItems = document.getElementById('files-items');
const filesCount = document.getElementById('files-count');
const filesWarning = document.getElementById('files-warning');
const clearAllFilesBtn = document.getElementById('clear-all-files');
const addMoreFilesBtn = document.getElementById('add-more-files');
const processFilesBtn = document.getElementById('process-files-btn');

// GANTT DATE MODAL ELEMENTS
const ganttDateModal = document.getElementById('gantt-date-modal');
const ganttStartDateInput = document.getElementById('gantt-start-date');
const cancelGanttModalBtn = document.getElementById('cancel-gantt-modal');
const confirmGanttModalBtn = document.getElementById('confirm-gantt-modal');

// LÍMITES DE ARCHIVOS
const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50 MB total
const MAX_TOTAL_CHARS = 50000; // 50,000 caracteres

// Estado de archivos múltiples
let uploadedFiles = []; // Array de { name, size, content }

// Estado para Gantt modal
let pendingGanttButton = null; // Guarda el botón mientras se muestra el modal
let ganttStartDate = null; // Fecha seleccionada

// CONTEXTO ADICIONAL - Event Listener
const additionalContextTextarea = document.getElementById('additional-context');
const contextStatusBadge = document.getElementById('context-status');
const contextCharCount = document.getElementById('context-char-count');
const contextSection = document.querySelector('.context-section');

if (additionalContextTextarea) {
    additionalContextTextarea.addEventListener('input', function () {
        const charCount = this.value.length;

        // Actualizar contador de caracteres
        if (contextCharCount) {
            contextCharCount.textContent = `${charCount} caracteres`;
        }

        // Mostrar/ocultar badge de activo
        if (charCount > 0) {
            if (contextStatusBadge) contextStatusBadge.classList.remove('hidden');
            if (contextSection) contextSection.classList.add('has-content');
        } else {
            if (contextStatusBadge) contextStatusBadge.classList.add('hidden');
            if (contextSection) contextSection.classList.remove('has-content');
        }
    });
}

// FILE UPLOAD EVENT LISTENERS
if (uploadZone && fileInput) {
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        handleMultipleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleMultipleFiles(files);
        fileInput.value = ''; // Reset para permitir seleccionar el mismo archivo
    });

    // Botón limpiar todo
    if (clearAllFilesBtn) {
        clearAllFilesBtn.addEventListener('click', clearAllFiles);
    }

    // Botón agregar más
    if (addMoreFilesBtn) {
        addMoreFilesBtn.addEventListener('click', () => fileInput.click());
    }

    // Botón procesar (NO automático)
    if (processFilesBtn) {
        processFilesBtn.addEventListener('click', processUploadedFiles);
    }

    // Session controls
    const saveSessionBtn = document.getElementById('saveSessionBtn');
    const loadSessionBtn = document.getElementById('loadSessionBtn');
    const exportAllBtn = document.getElementById('exportAllBtn');

    if (saveSessionBtn) {
        saveSessionBtn.addEventListener('click', saveSession);
    }

    if (loadSessionBtn) {
        loadSessionBtn.addEventListener('click', () => {
            if (loadSession()) {
                updateArtifactsCount();
                checkAndUpdateDependencies();
            }
        });
    }

    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', exportAllAsWord);
    }
}

// ============================================================
// GANTT DATE MODAL HANDLERS
// ============================================================

function showGanttDateModal(button) {
    pendingGanttButton = button;
    // Establecer fecha por defecto (hoy)
    const today = new Date().toISOString().split('T')[0];
    ganttStartDateInput.value = today;
    ganttDateModal.classList.remove('hidden');
}

function hideGanttDateModal() {
    ganttDateModal.classList.add('hidden');
    pendingGanttButton = null;
}

// Event listeners del modal
if (cancelGanttModalBtn) {
    cancelGanttModalBtn.addEventListener('click', hideGanttDateModal);
}

if (confirmGanttModalBtn) {
    confirmGanttModalBtn.addEventListener('click', async () => {
        ganttStartDate = ganttStartDateInput.value;
        if (!ganttStartDate) {
            alert('Por favor selecciona una fecha de inicio');
            return;
        }

        // Mostrar estado de carga en el modal
        confirmGanttModalBtn.textContent = '⏳ Generando...';
        confirmGanttModalBtn.disabled = true;
        cancelGanttModalBtn.disabled = true;

        // Ejecutar generación del Gantt
        if (pendingGanttButton) {
            await executeGanttGeneration(pendingGanttButton);
        }

        // Cerrar modal después de completar
        confirmGanttModalBtn.textContent = 'Confirmar';
        confirmGanttModalBtn.disabled = false;
        cancelGanttModalBtn.disabled = false;
        hideGanttDateModal();
    });
}

// Cerrar modal al hacer clic en overlay
if (ganttDateModal) {
    ganttDateModal.querySelector('.modal-overlay')?.addEventListener('click', hideGanttDateModal);
}

// Función para ejecutar generación de Gantt después de seleccionar fecha
function executeGanttGeneration(button) {
    // Llamar con la fecha ya establecida en ganttStartDate
    generateSingleArtifact('gantt', button);
}

// ============================================================
// MULTI-FILE UPLOAD FUNCTIONS
// ============================================================

async function handleMultipleFiles(files) {
    const allowedExtensions = ['pdf', 'txt', 'doc', 'docx', 'md', 'json'];
    let warnings = [];

    for (const file of files) {
        // Validar número máximo de archivos
        if (uploadedFiles.length >= MAX_FILES) {
            warnings.push(`Máximo ${MAX_FILES} archivos permitidos`);
            break;
        }

        // Validar extensión
        const extension = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            warnings.push(`"${file.name}" - formato no soportado`);
            continue;
        }


        // Verificar si ya existe
        if (uploadedFiles.some(f => f.name === file.name)) {
            warnings.push(`"${file.name}" ya agregado`);
            continue;
        }

        try {
            let content = '';

            if (extension === 'txt' || extension === 'md' || extension === 'json') {
                content = await readTextFile(file);
            } else if (extension === 'pdf') {
                content = await extractPdfText(file);
            } else if (extension === 'doc' || extension === 'docx') {
                content = `\n--- [${file.name}] ---\n[Archivo Word - contenido pendiente de extracción en servidor]\n`;
            }

            // Agregar prefijo de archivo
            const formattedContent = `\n\n=== ARCHIVO: ${file.name} ===\n${content}`;

            uploadedFiles.push({
                name: file.name,
                size: file.size,
                content: formattedContent
            });

        } catch (error) {
            warnings.push(`Error leyendo "${file.name}"`);
            console.error('Error reading file:', error);
        }
    }

    // Verificar límite total de tamaño (50 MB)
    const totalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
        const sizeMB = (totalSize / 1024 / 1024).toFixed(1);
        warnings.push(`Tamaño total (${sizeMB} MB) supera el límite de 50 MB`);
    }

    // Nota: Se removió la verificación de 50K caracteres para mejor UX

    // Actualizar UI
    renderFilesList();

    // Mostrar warnings si hay
    if (warnings.length > 0) {
        filesWarning.textContent = '⚠️ ' + warnings.slice(0, 3).join(' • ');
        filesWarning.classList.remove('hidden');
    } else {
        filesWarning.classList.add('hidden');
    }

    // Actualizar textarea con contenido combinado (sin procesar automáticamente)
    if (uploadedFiles.length > 0) {
        const combinedContent = uploadedFiles.map(f => f.content).join('\n');
        document.getElementById('documentation').value = combinedContent;
    }
}

// Función para procesar archivos (llamada manualmente con el botón)
async function processUploadedFiles() {
    const documentation = document.getElementById('documentation').value.trim();

    if (!documentation || documentation.length < 50) {
        showStatus('error', 'Debe cargar archivos con contenido suficiente para procesar');
        return;
    }

    if (uploadedFiles.length === 0) {
        showStatus('error', 'No hay archivos cargados');
        return;
    }

    // Llamar al preview
    await showPreview(documentation);
}

function renderFilesList() {
    if (uploadedFiles.length === 0) {
        filesList.classList.add('hidden');
        uploadZone.classList.remove('hidden');
        return;
    }

    filesList.classList.remove('hidden');
    uploadZone.classList.add('hidden');
    filesCount.textContent = uploadedFiles.length;

    filesItems.innerHTML = uploadedFiles.map((file, index) => `
        <li>
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
            <button type="button" class="remove-file-btn" onclick="removeFile(${index})">✕</button>
        </li>
    `).join('');
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    renderFilesList();
    filesWarning.classList.add('hidden');

    // Actualizar contenido combinado
    if (uploadedFiles.length > 0) {
        const combinedContent = uploadedFiles.map(f => f.content).join('\n');
        document.getElementById('documentation').value = combinedContent;
    } else {
        document.getElementById('documentation').value = '';
    }
}

function clearAllFiles() {
    uploadedFiles = [];
    renderFilesList();
    filesWarning.classList.add('hidden');
    document.getElementById('documentation').value = '';
}

// ============================================================
// PREVIEW FUNCTIONS (Two-Panel Layout)
// ============================================================

const previewSection = document.getElementById('preview-section');
const previewLoading = document.getElementById('preview-loading');
const previewContent = document.getElementById('preview-content');
const previewClient = document.getElementById('preview-client');
const previewSummary = document.getElementById('preview-summary');
const artifactsList = document.getElementById('artifacts-list');
const artifactContent = document.getElementById('artifact-content');
const artifactsCount = document.getElementById('artifacts-count');
const cancelPreviewBtn = document.getElementById('cancelPreviewBtn');
const generateAllBtn = document.getElementById('generateAllBtn');

// Estado de artefactos generados
let generatedArtifacts = {};

// Event listeners para preview
if (cancelPreviewBtn) {
    cancelPreviewBtn.addEventListener('click', cancelPreview);
}
if (generateAllBtn) {
    generateAllBtn.addEventListener('click', handleGenerateAll);
}

// Mapa de dependencias
const ARTIFACT_DEPENDENCIES = {
    'architecture': [],
    'team': [],
    'epics': [],
    'gantt': ['architecture', 'team', 'epics'],
    'economics': ['gantt'],
    'risks': [],
    'prerequisites': []
};

// Nombres amigables para mensajes
const ARTIFACT_FRIENDLY_NAMES = {
    'architecture': 'Arquitectura',
    'team': 'Propuesta de Equipo',
    'epics': 'Épicas del Proyecto',
    'gantt': 'Cronograma (Gantt)',
    'economics': 'Propuesta Económica',
    'risks': 'Análisis de Riesgos',
    'prerequisites': 'Prerrequisitos'
};

// Verificar y actualizar estado de botones según dependencias
function checkAndUpdateDependencies() {
    document.querySelectorAll('.artifacts-list li[data-requires]').forEach(li => {
        const artifactType = li.dataset.artifact;
        const requires = li.dataset.requires.split(',');
        const btn = li.querySelector('.btn-generate');

        // Verificar si todas las dependencias están generadas
        const allMet = requires.every(dep => generatedArtifacts[dep]);

        if (allMet) {
            btn.disabled = false;
            li.classList.remove('locked');
        } else {
            if (!generatedArtifacts[artifactType]) {
                btn.disabled = true;
                li.classList.add('locked');
            }
        }
    });
}

// Event listeners para botones de generar individual
document.addEventListener('click', (e) => {
    // Click en botón Generar
    if (e.target.classList.contains('btn-generate')) {
        const artifactType = e.target.dataset.artifact;

        // Si ya está generado, solo mostrar
        if (generatedArtifacts[artifactType]) {
            displayArtifactByType(artifactType, generatedArtifacts[artifactType]);
            return;
        }

        // Verificar dependencias
        const dependencies = ARTIFACT_DEPENDENCIES[artifactType] || [];
        const missing = dependencies.filter(dep => !generatedArtifacts[dep]);

        if (missing.length > 0) {
            const missingNames = missing.map(m => ARTIFACT_FRIENDLY_NAMES[m]).join(', ');
            alert(`⚠️ Para generar "${ARTIFACT_FRIENDLY_NAMES[artifactType]}" primero debes generar:\n\n${missingNames}`);
            return;
        }

        generateSingleArtifact(artifactType, e.target);
        return;
    }

    // Click en item de artefacto ya generado (para volver a ver)
    const artifactLi = e.target.closest('.artifacts-list li.generated');
    if (artifactLi && !e.target.classList.contains('btn-generate')) {
        const artifactType = artifactLi.dataset.artifact;
        if (generatedArtifacts[artifactType]) {
            displayArtifactByType(artifactType, generatedArtifacts[artifactType]);
        }
    }
});

async function showPreview(documentation) {
    // Mostrar sección de preview con loading
    formSection.classList.add('hidden');
    previewSection.classList.remove('hidden');
    previewLoading.classList.remove('hidden');
    previewContent.classList.add('hidden');

    // Reset artifacts
    generatedArtifacts = {};
    updateArtifactsCount();
    resetArtifactButtons();

    try {
        const response = await fetch(`${API_BASE}/api/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentation })
        });

        if (!response.ok) {
            throw new Error('Error al analizar documento');
        }

        const data = await response.json();

        // Llenar datos del preview
        previewClient.textContent = data.client_name || 'Cliente no especificado';
        previewSummary.textContent = data.project_summary || 'Sin resumen disponible';

        // Reset contenido del panel derecho
        artifactContent.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">✨</span>
                <p>Selecciona un artefacto para generar</p>
                <small>O genera todos con un solo clic</small>
            </div>
        `;

        // Ocultar loading, mostrar contenido
        previewLoading.classList.add('hidden');
        previewContent.classList.remove('hidden');

    } catch (error) {
        console.error('Error en preview:', error);
        previewLoading.innerHTML = `<span style="color:var(--danger)">❌ Error: ${error.message}</span>`;
    }
}

function resetArtifactButtons() {
    document.querySelectorAll('.btn-generate').forEach(btn => {
        btn.textContent = 'Generar';
        btn.disabled = false;
        btn.classList.remove('done');
        btn.closest('li').classList.remove('generated', 'generating');
    });
}

function updateArtifactsCount() {
    const total = 10; // All artifacts including new ones
    const generated = Object.keys(generatedArtifacts).length;
    if (artifactsCount) {
        artifactsCount.textContent = `${generated}/${total}`;
    }
    // Update export button state
    updateExportAllButton();
}

function cancelPreview() {
    previewSection.classList.add('hidden');
    formSection.classList.remove('hidden');
    clearAllFiles();
}

// Mapping de tipos de artefacto a nombres legibles
const ARTIFACT_NAMES = {
    architecture: 'Diagrama de Arquitectura',
    gantt: 'Cronograma (Gantt)',
    team: 'Propuesta de Equipo',
    epics: 'Épicas del Proyecto',
    economics: 'Propuesta Económica',
    risks: 'Análisis de Riesgos',
    prerequisites: 'Prerrequisitos'
};

async function generateSingleArtifact(artifactType, button) {
    const documentation = document.getElementById('documentation').value.trim();
    const projectName = previewClient.textContent || 'Proyecto Digital';

    // Capturar contexto adicional del usuario
    const additionalContextEl = document.getElementById('additional-context');
    const additionalContext = additionalContextEl ? additionalContextEl.value.trim() : '';

    if (!documentation) {
        showStatus('error', 'No hay documentación cargada');
        return;
    }

    // INTERCEPTAR GANTT: Mostrar modal de fecha primero
    if (artifactType === 'gantt' && !ganttStartDate) {
        showGanttDateModal(button);
        return;
    }

    // Marcar como generando
    const li = button.closest('li');
    li.classList.add('generating');
    li.classList.remove('generated');
    button.textContent = '⏳...';
    button.disabled = true;

    // Mostrar loading en panel derecho
    artifactContent.innerHTML = `
        <div class="artifact-loading">
            <div class="spinner"></div>
            <p>Generando ${ARTIFACT_NAMES[artifactType]}...</p>
        </div>
    `;

    try {
        // Determinar endpoint según el tipo de artefacto
        let endpoint = `${API_BASE}/api/artifact/${artifactType}`;

        // Preparar body - incluir contexto adicional en todas las llamadas
        let requestBody = {
            documentation,
            project_name: projectName,
            additional_context: additionalContext  // Contexto adicional del usuario
        };

        if (artifactType === 'gantt') {
            requestBody.epics_data = generatedArtifacts['epics'] || null;
            requestBody.team_data = generatedArtifacts['team'] || null;
            requestBody.architecture_data = generatedArtifacts['architecture'] || null;
            requestBody.start_date = ganttStartDate; // FECHA DE INICIO
            // NO resetear aquí - se resetea después del éxito
        }

        if (artifactType === 'economics') {
            requestBody.team_data = generatedArtifacts['team'] || null;
            requestBody.gantt_data = generatedArtifacts['gantt'] || null;
        }

        if (artifactType === 'risks') {
            requestBody.architecture_data = generatedArtifacts['architecture'] || null;
            requestBody.epics_data = generatedArtifacts['epics'] || null;
            requestBody.team_data = generatedArtifacts['team'] || null;
            requestBody.gantt_data = generatedArtifacts['gantt'] || null;
        }

        if (artifactType === 'prerequisites') {
            requestBody.architecture_data = generatedArtifacts['architecture'] || null;
            requestBody.epics_data = generatedArtifacts['epics'] || null;
            requestBody.team_data = generatedArtifacts['team'] || null;
        }

        if (artifactType === 'questions') {
            requestBody.architecture_data = generatedArtifacts['architecture'] || null;
            requestBody.epics_data = generatedArtifacts['epics'] || null;
        }

        if (artifactType === 'improvements') {
            requestBody.architecture_data = generatedArtifacts['architecture'] || null;
            requestBody.epics_data = generatedArtifacts['epics'] || null;
            requestBody.team_data = generatedArtifacts['team'] || null;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al generar artefacto');
        }

        const data = await response.json();

        // Guardar artefacto generado
        generatedArtifacts[artifactType] = data;

        // Resetear fecha de Gantt después del éxito
        if (artifactType === 'gantt') {
            ganttStartDate = null;
        }

        // Marcar como completado
        li.classList.remove('generating');
        li.classList.add('generated');
        button.textContent = '✓';
        button.classList.add('done');

        // Mostrar en panel derecho según tipo
        displayArtifactByType(artifactType, data);

        // Actualizar contador y dependencias
        updateArtifactsCount();
        checkAndUpdateDependencies();

    } catch (error) {
        console.error('Error generando artefacto:', error);
        li.classList.remove('generating');
        button.textContent = 'Reintentar';
        button.disabled = false;

        artifactContent.innerHTML = `
            <div class="error-state">
                <span>❌</span>
                <p>Error al generar: ${error.message}</p>
            </div>
        `;
    }
}

async function handleGenerateAll() {
    const buttons = document.querySelectorAll('.btn-generate');

    generateAllBtn.disabled = true;
    generateAllBtn.textContent = '⏳ Generando...';

    for (const btn of buttons) {
        if (!btn.classList.contains('done')) {
            const artifactType = btn.dataset.artifact;
            await generateSingleArtifact(artifactType, btn);
            // Pequeña pausa entre generaciones
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    generateAllBtn.textContent = '✅ Completado';
}

// ============================================================
// ARTIFACT DISPLAY FUNCTIONS
// ============================================================

function displayArtifactByType(type, data) {
    switch (type) {
        case 'architecture':
            displayArchitectureDiagram(data);
            break;
        case 'team':
            displayTeamProposal(data);
            break;
        case 'epics':
            displayEpics(data);
            break;
        case 'gantt':
            displayGantt(data);
            break;
        case 'economics':
            displayEconomics(data);
            break;
        case 'risks':
            displayRisks(data);
            break;
        case 'prerequisites':
            displayPrerequisites(data);
            break;
        case 'questions':
            displayQuestions(data);
            break;
        case 'improvements':
            displayImprovements(data);
            break;
        default:
            displayGenericArtifact(type, data);
    }
}

function displayEconomics(data) {
    const items = data.line_items || [];
    const totalCost = data.total_cost || 0;
    const totalDays = data.total_days || 0;
    const summary = data.summary || '';

    // Formatear moneda COP
    const formatCOP = (num) => '$' + num.toLocaleString('es-CO');

    let tableRows = items.map(item => `
        <tr>
            <td>${item.role}</td>
            <td class="center">${item.seniority}</td>
            <td class="center">${item.quantity}</td>
            <td class="right">${formatCOP(item.daily_rate)}</td>
            <td class="center">${item.days}</td>
            <td class="right">${formatCOP(item.subtotal)}</td>
        </tr>
    `).join('');

    artifactContent.innerHTML = `
        <div class="artifact-result">
            <div class="artifact-header-row">
                <h3>💰 Propuesta Económica</h3>
                <span class="economics-total">${formatCOP(totalCost)} COP</span>
            </div>
            <p class="artifact-description">${summary}</p>
            <div class="economics-table-wrapper">
                <table class="economics-table">
                    <thead>
                        <tr>
                            <th>Rol</th>
                            <th>Nivel</th>
                            <th>Cant.</th>
                            <th>Tarifa/Día</th>
                            <th>Días</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5" class="right"><strong>TOTAL:</strong></td>
                            <td class="right total-cell">${formatCOP(totalCost)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div class="economics-footer">
                <span>📅 Duración: ${totalDays} días laborales</span>
                <span>👥 ${items.length} roles</span>
            </div>
        </div>
    `;
}

function displayGantt(data) {
    const mermaidCode = data.mermaid_code || '';
    const tasks = data.tasks || [];
    const totalWeeks = data.total_weeks || 0;
    const summary = data.summary || '';
    const layersSummary = data.layers_summary || {};
    const architecturalLayers = data.architectural_layers || {};

    // Agrupar tareas por capa
    const tasksByLayer = {};
    for (const task of tasks) {
        const layer = task.layer || 'backend';
        if (!tasksByLayer[layer]) {
            tasksByLayer[layer] = [];
        }
        tasksByLayer[layer].push(task);
    }

    // Orden de las capas
    const layerOrder = ['presentation', 'security', 'backend', 'data', 'integrations', 'reports'];

    // Generar HTML de capas con tareas
    let layersHtml = '';
    for (const layerKey of layerOrder) {
        const layerInfo = architecturalLayers[layerKey] || layersSummary[layerKey] || {};
        const layerTasks = tasksByLayer[layerKey] || [];

        if (layerTasks.length === 0) continue;

        const layerColor = layerInfo.color || '#666666';
        const layerIcon = layerInfo.icon || '📦';
        const layerName = layerInfo.name || layerKey;
        const layerStats = layersSummary[layerKey] || { count: layerTasks.length, total_days: 0 };

        // Calcular total de días si no está en el summary
        const totalDays = layerStats.total_days || layerTasks.reduce((sum, t) => sum + (t.duration_days || 0), 0);

        layersHtml += `
            <div class="gantt-layer" style="--layer-color: ${layerColor}">
                <div class="gantt-layer-header">
                    <span class="layer-icon">${layerIcon}</span>
                    <span class="layer-name">${layerName}</span>
                    <span class="layer-stats">${layerTasks.length} tareas • ${totalDays} días</span>
                </div>
                <div class="gantt-layer-tasks">
                    ${layerTasks.map(task => `
                        <div class="gantt-task-row">
                            <div class="task-info">
                                <span class="task-name">${task.name}</span>
                                <span class="task-profile">${task.profile || ''}</span>
                            </div>
                            <div class="task-dates">
                                <span class="task-date-start">${task.start_date || ''}</span>
                                <span class="task-date-separator">→</span>
                                <span class="task-date-end">${task.end_date || ''}</span>
                                <span class="task-duration">${task.duration_days || 0}d</span>
                            </div>
                            <div class="task-bar" style="background: ${layerColor}"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Generar resumen visual de capas
    let layersSummaryHtml = '';
    for (const [key, info] of Object.entries(layersSummary)) {
        const color = info.color || '#666';
        const icon = info.icon || '📦';
        layersSummaryHtml += `
            <div class="layer-chip" style="--chip-color: ${color}">
                <span>${icon}</span>
                <span>${info.count} tareas</span>
            </div>
        `;
    }

    artifactContent.innerHTML = `
        <div class="artifact-result gantt-result">
            <div class="artifact-header-row">
                <h3>📅 Cronograma por Capas Arquitectónicas</h3>
                <button id="downloadGanttBtn" class="btn-download" title="Descargar como Excel">
                    📥 Descargar Excel
                </button>
            </div>
            <div class="gantt-meta">
                <span class="gantt-weeks">${totalWeeks} semanas</span>
                <span class="gantt-tasks">${tasks.length} tareas</span>
                <div class="layers-chips">${layersSummaryHtml}</div>
            </div>
            <p class="artifact-description">${summary}</p>
            <div class="gantt-layers-container">
                ${layersHtml || '<p class="empty-message">No se encontraron tareas organizadas por capas.</p>'}
            </div>
        </div>
    `;

    // Event listener para descargar Excel
    const downloadBtn = document.getElementById('downloadGanttBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadGanttAsExcel(tasks));
    }
}

async function downloadGanttAsExcel(tasks) {
    const btn = document.getElementById('downloadGanttBtn');
    const projectName = previewClient.textContent || 'Proyecto';

    try {
        btn.textContent = '⏳ Generando...';
        btn.disabled = true;

        const response = await fetch(`${API_BASE}/api/artifact/gantt/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tasks: tasks,
                project_name: projectName
            })
        });

        if (!response.ok) {
            throw new Error('Error al generar Excel');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `cronograma_${projectName.replace(/\s+/g, '_')}.xlsx`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        btn.textContent = '✅ Descargado';
        setTimeout(() => {
            btn.textContent = '📥 Descargar Excel';
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Error descargando Excel:', error);
        btn.textContent = '❌ Error';
        setTimeout(() => {
            btn.textContent = '📥 Descargar Excel';
            btn.disabled = false;
        }, 2000);
    }
}

function displayEpics(data) {
    const markdown = data.markdown_content || '';
    const epicsCount = data.epics_count || 0;
    const summary = data.summary || '';

    // Convertir Markdown a HTML simple
    let htmlContent = markdown
        .replace(/^### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        .replace(/^---$/gm, '<hr>')
        .replace(/^\- \[ \] (.+)$/gm, '<div class="checkbox-item">☐ $1</div>')
        .replace(/^\- \[x\] (.+)$/gm, '<div class="checkbox-item checked">☑ $1</div>')
        .replace(/^\- \*\*(.+?)\*\*: (.+)$/gm, '<div class="list-item"><strong>$1:</strong> $2</div>')
        .replace(/^\- (.+)$/gm, '<div class="list-item">• $1</div>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    artifactContent.innerHTML = `
        <div class="artifact-result">
            <div class="artifact-header-row">
                <h3>📋 Épicas del Proyecto</h3>
                <button id="downloadEpicsBtn" class="btn-download" title="Descargar como Word">
                    📥 Descargar Word
                </button>
            </div>
            <p class="artifact-description">${summary}</p>
            <div class="epics-content markdown-body">
                ${htmlContent}
            </div>
        </div>
    `;

    // Event listener para descargar Word
    const downloadBtn = document.getElementById('downloadEpicsBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadEpicsAsWord(markdown));
    }
}

async function downloadEpicsAsWord(markdownContent) {
    const btn = document.getElementById('downloadEpicsBtn');
    const projectName = previewClient.textContent || 'Proyecto';

    try {
        btn.textContent = '⏳ Generando...';
        btn.disabled = true;

        const response = await fetch(`${API_BASE}/api/artifact/epics/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                markdown_content: markdownContent,
                project_name: projectName
            })
        });

        if (!response.ok) {
            throw new Error('Error al generar documento');
        }

        // Descargar el archivo
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `epicas_${projectName.replace(/\s+/g, '_')}.docx`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        btn.textContent = '✅ Descargado';
        setTimeout(() => {
            btn.textContent = '📥 Descargar Word';
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Error descargando Word:', error);
        btn.textContent = '❌ Error';
        setTimeout(() => {
            btn.textContent = '📥 Descargar Word';
            btn.disabled = false;
        }, 2000);
    }
}

// ============================================================
// RISKS DISPLAY & DOWNLOAD
// ============================================================

function displayRisks(data) {
    const risks = data.risks || [];
    const totalRisks = data.total_risks || risks.length;
    const highPriority = data.high_priority_count || 0;
    const summary = data.summary || '';
    const markdown = data.markdown_content || '';

    // Agrupar por categoría
    const categories = {};
    for (const risk of risks) {
        const cat = risk.category || 'Otro';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(risk);
    }

    // Generar HTML de riesgos
    let risksHtml = '';
    for (const [cat, catRisks] of Object.entries(categories)) {
        risksHtml += `<div class="risk-category">
            <h4>📁 ${cat}</h4>`;
        for (const risk of catRisks) {
            const priorityClass = risk.priority?.toLowerCase().includes('alta') || risk.priority?.toLowerCase().includes('crítica')
                ? 'high' : risk.priority?.toLowerCase() === 'media' ? 'medium' : 'low';
            const priorityEmoji = priorityClass === 'high' ? '🔴' : priorityClass === 'medium' ? '🟡' : '🟢';

            risksHtml += `
                <div class="risk-item ${priorityClass}">
                    <div class="risk-header">
                        <span class="risk-id">${risk.id || 'R'}</span>
                        <span class="risk-name">${priorityEmoji} ${risk.name || 'Riesgo'}</span>
                    </div>
                    <div class="risk-details">
                        <span><strong>Fase:</strong> ${risk.phase || 'N/A'}</span>
                        <span><strong>Prob:</strong> ${risk.probability || 'N/A'}</span>
                        <span><strong>Impacto:</strong> ${risk.impact || 'N/A'}</span>
                    </div>
                    <p class="risk-description">${risk.description || ''}</p>
                    <p class="risk-mitigation"><strong>Mitigación:</strong> ${risk.mitigation || ''}</p>
                </div>`;
        }
        risksHtml += '</div>';
    }

    artifactContent.innerHTML = `
        <div class="artifact-result">
            <div class="artifact-header-row">
                <h3>⚠️ Análisis de Riesgos</h3>
                <button id="downloadRisksBtn" class="btn-download" title="Descargar como Word">
                    📥 Descargar Word
                </button>
            </div>
            <div class="risks-summary">
                <div class="risk-stat">
                    <span class="stat-number">${totalRisks}</span>
                    <span class="stat-label">Riesgos Totales</span>
                </div>
                <div class="risk-stat high">
                    <span class="stat-number">${highPriority}</span>
                    <span class="stat-label">Alta Prioridad</span>
                </div>
            </div>
            <p class="artifact-description">${summary}</p>
            <div class="risks-content">
                ${risksHtml}
            </div>
        </div>
    `;

    // Event listener para descarga
    const downloadBtn = document.getElementById('downloadRisksBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadRisksAsWord(markdown));
    }
}

async function downloadRisksAsWord(markdownContent) {
    const btn = document.getElementById('downloadRisksBtn');
    const projectName = previewClient.textContent || 'Proyecto';

    try {
        btn.textContent = '⏳ Generando...';
        btn.disabled = true;

        const response = await fetch(`${API_BASE}/api/artifact/risks/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                markdown_content: markdownContent,
                project_name: projectName
            })
        });

        if (!response.ok) {
            throw new Error('Error al generar documento');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `riesgos_${projectName.replace(/\s+/g, '_')}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        btn.textContent = '✅ Descargado';
        setTimeout(() => {
            btn.textContent = '📥 Descargar Word';
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Error descargando Word:', error);
        btn.textContent = '❌ Error';
        setTimeout(() => {
            btn.textContent = '📥 Descargar Word';
            btn.disabled = false;
        }, 2000);
    }
}

// ============================================================
// PREREQUISITES DISPLAY & DOWNLOAD
// ============================================================

function displayPrerequisites(data) {
    const prerequisites = data.prerequisites || [];
    const totalCount = data.total_count || prerequisites.length;
    const criticalCount = data.critical_count || 0;
    const summary = data.summary || '';
    const markdown = data.markdown_content || '';

    // Agrupar por categoría
    const categories = {};
    for (const prereq of prerequisites) {
        const cat = prereq.category || 'Otro';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(prereq);
    }

    let prereqHtml = '';

    // Si hay prerrequisitos en el array, mostrarlos estructurados
    if (prerequisites.length > 0) {
        // Agrupar por categoría
        const categories = {};
        for (const prereq of prerequisites) {
            const cat = prereq.category || 'Otro';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(prereq);
        }

        // Generar HTML por categoría
        for (const [cat, catPrereqs] of Object.entries(categories)) {
            prereqHtml += `<div class="prereq-category">
                <h4>📁 ${cat}</h4>`;
            for (const prereq of catPrereqs) {
                const critClass = prereq.criticality?.toLowerCase().includes('crítico') || prereq.criticality?.toLowerCase() === 'critical'
                    ? 'critical' : prereq.criticality?.toLowerCase() === 'importante' ? 'important' : 'desirable';
                const critEmoji = critClass === 'critical' ? '🔴' : critClass === 'important' ? '🟡' : '🟢';

                prereqHtml += `
                    <div class="prereq-item ${critClass}">
                        <div class="prereq-header">
                            <span class="prereq-id">${prereq.id || 'P'}</span>
                            <span class="prereq-name">${critEmoji} ${prereq.name || 'Prerrequisito'}</span>
                        </div>
                        <div class="prereq-details">
                            <span><strong>Criticidad:</strong> ${prereq.criticality || 'N/A'}</span>
                            <span><strong>Responsable:</strong> ${prereq.responsible || 'N/A'}</span>
                            <span><strong>Tiempo:</strong> ${prereq.estimated_time || 'N/A'}</span>
                        </div>
                        <p class="prereq-description">${prereq.description || ''}</p>
                    </div>`;
            }
            prereqHtml += '</div>';
        }
    } else if (markdown) {
        // Fallback: mostrar markdown como HTML estructurado
        prereqHtml = `<div class="markdown-body">` + markdown
            .replace(/^### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^## (.+)$/gm, '<h3>$1</h3>')
            .replace(/^# (.+)$/gm, '<h2>$1</h2>')
            .replace(/^---$/gm, '<hr>')
            .replace(/^- \*\*(.+?)\*\*: (.+)$/gm, '<div class="list-item"><strong>$1:</strong> $2</div>')
            .replace(/^- (.+)$/gm, '<div class="list-item">• $1</div>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>') + `</div>`;
    } else {
        prereqHtml = '<p>No se encontraron prerrequisitos.</p>';
    }

    artifactContent.innerHTML = `
        <div class="artifact-result">
            <div class="artifact-header-row">
                <h3>📋 Prerrequisitos</h3>
                <button id="downloadPrereqBtn" class="btn-download" title="Descargar como Word">
                    📥 Descargar Word
                </button>
            </div>
            <div class="prereq-summary">
                <div class="prereq-stat">
                    <span class="stat-number">${totalCount}</span>
                    <span class="stat-label">Total</span>
                </div>
                <div class="prereq-stat critical">
                    <span class="stat-number">${criticalCount}</span>
                    <span class="stat-label">Críticos</span>
                </div>
            </div>
            <p class="artifact-description">${summary}</p>
            <div class="prereq-content">
                ${prereqHtml}
            </div>
        </div>
    `;

    const downloadBtn = document.getElementById('downloadPrereqBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadPrerequisitesAsWord(markdown));
    }
}

async function downloadPrerequisitesAsWord(markdownContent) {
    const btn = document.getElementById('downloadPrereqBtn');
    const projectName = previewClient.textContent || 'Proyecto';

    try {
        btn.textContent = '⏳ Generando...';
        btn.disabled = true;

        const response = await fetch(`${API_BASE}/api/artifact/prerequisites/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                markdown_content: markdownContent,
                project_name: projectName
            })
        });

        if (!response.ok) throw new Error('Error al generar documento');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prerrequisitos_${projectName.replace(/\s+/g, '_')}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        btn.textContent = '✅ Descargado';
        setTimeout(() => {
            btn.textContent = '📥 Descargar Word';
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Error descargando Word:', error);
        btn.textContent = '❌ Error';
        setTimeout(() => {
            btn.textContent = '📥 Descargar Word';
            btn.disabled = false;
        }, 2000);
    }
}

// ============================================================
// QUESTIONS (CONSULTAS AL CLIENTE) DISPLAY & DOWNLOAD
// ============================================================

function displayQuestions(data) {
    const questions = data.questions || [];
    const totalCount = data.total_count || questions.length;
    const functionalCount = data.functional_count || 0;
    const technicalCount = data.technical_count || 0;
    const summary = data.summary || '';
    const markdown = data.markdown_content || '';

    // Agrupar por categoría
    const categories = {};
    for (const q of questions) {
        const cat = q.category || 'Otro';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(q);
    }

    let questionsHtml = '';
    for (const [cat, catQuestions] of Object.entries(categories)) {
        questionsHtml += `<div class="question-category"><h4>📁 ${cat}</h4>`;
        for (const q of catQuestions) {
            const typeEmoji = q.type === 'Funcional' ? '📋' : '⚙️';
            const typeClass = q.type === 'Funcional' ? 'functional' : 'technical';
            questionsHtml += `
                <div class="question-item ${typeClass}">
                    <div class="question-header">
                        <span class="question-id">${q.id || 'Q'}</span>
                        <span class="question-type">${typeEmoji} ${q.type || 'N/A'}</span>
                    </div>
                    <p class="question-text">${q.question || ''}</p>
                    <p class="question-context"><strong>Contexto:</strong> ${q.context || ''}</p>
                </div>`;
        }
        questionsHtml += '</div>';
    }

    artifactContent.innerHTML = `
        <div class="artifact-result">
            <div class="artifact-header-row">
                <h3>❓ Consultas al Cliente</h3>
                <button id="downloadQuestionsBtn" class="btn-download" title="Descargar como Word">
                    📥 Descargar Word
                </button>
            </div>
            <div class="questions-summary">
                <div class="question-stat"><span class="stat-number">${totalCount}</span><span class="stat-label">Total</span></div>
                <div class="question-stat functional"><span class="stat-number">${functionalCount}</span><span class="stat-label">Funcionales</span></div>
                <div class="question-stat technical"><span class="stat-number">${technicalCount}</span><span class="stat-label">Técnicas</span></div>
            </div>
            <p class="artifact-description">${summary}</p>
            <div class="questions-content">${questionsHtml}</div>
        </div>
    `;

    document.getElementById('downloadQuestionsBtn')?.addEventListener('click', () => downloadQuestionsAsWord(markdown));
}

async function downloadQuestionsAsWord(markdownContent) {
    const btn = document.getElementById('downloadQuestionsBtn');
    const projectName = previewClient.textContent || 'Proyecto';
    try {
        btn.textContent = '⏳ Generando...'; btn.disabled = true;
        const response = await fetch(`${API_BASE}/api/artifact/questions/download`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markdown_content: markdownContent, project_name: projectName })
        });
        if (!response.ok) throw new Error('Error');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url;
        link.download = `consultas_${projectName.replace(/\s+/g, '_')}.docx`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
        btn.textContent = '✅ Descargado';
        setTimeout(() => { btn.textContent = '📥 Descargar Word'; btn.disabled = false; }, 2000);
    } catch (error) {
        console.error('Error:', error);
        btn.textContent = '❌ Error';
        setTimeout(() => { btn.textContent = '📥 Descargar Word'; btn.disabled = false; }, 2000);
    }
}

// ============================================================
// IMPROVEMENTS (MEJORAS TÉCNICAS) DISPLAY & DOWNLOAD
// ============================================================

function displayImprovements(data) {
    const improvements = data.improvements || [];
    const totalCount = data.total_count || improvements.length;
    const highImpactCount = data.high_impact_count || 0;
    const summary = data.summary || '';
    const markdown = data.markdown_content || '';

    // Agrupar por categoría
    const categories = {};
    for (const m of improvements) {
        const cat = m.category || 'Otro';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(m);
    }

    let improvementsHtml = '';
    for (const [cat, catImprovements] of Object.entries(categories)) {
        improvementsHtml += `<div class="improvement-category"><h4>📁 ${cat}</h4>`;
        for (const m of catImprovements) {
            const impactClass = m.impact === 'Alto' ? 'high' : m.impact === 'Medio' ? 'medium' : 'low';
            const impactEmoji = impactClass === 'high' ? '🔴' : impactClass === 'medium' ? '🟡' : '🟢';
            improvementsHtml += `
                <div class="improvement-item ${impactClass}">
                    <div class="improvement-header">
                        <span class="improvement-id">${m.id || 'M'}</span>
                        <span class="improvement-name">${impactEmoji} ${m.name || 'Mejora'}</span>
                    </div>
                    <div class="improvement-meta">
                        <span><strong>Impacto:</strong> ${m.impact || 'N/A'}</span>
                        <span><strong>Esfuerzo:</strong> ${m.effort || 'N/A'}</span>
                    </div>
                    <p class="improvement-description">${m.description || ''}</p>
                    <p class="improvement-benefit"><strong>Beneficio:</strong> ${m.benefit || ''}</p>
                </div>`;
        }
        improvementsHtml += '</div>';
    }

    artifactContent.innerHTML = `
        <div class="artifact-result">
            <div class="artifact-header-row">
                <h3>💡 Mejoras Técnicas</h3>
                <button id="downloadImprovementsBtn" class="btn-download" title="Descargar como Word">
                    📥 Descargar Word
                </button>
            </div>
            <div class="improvements-summary">
                <div class="improvement-stat"><span class="stat-number">${totalCount}</span><span class="stat-label">Total</span></div>
                <div class="improvement-stat high"><span class="stat-number">${highImpactCount}</span><span class="stat-label">Alto Impacto</span></div>
            </div>
            <p class="artifact-description">${summary}</p>
            <div class="improvements-content">${improvementsHtml}</div>
        </div>
    `;

    document.getElementById('downloadImprovementsBtn')?.addEventListener('click', () => downloadImprovementsAsWord(markdown));
}

async function downloadImprovementsAsWord(markdownContent) {
    const btn = document.getElementById('downloadImprovementsBtn');
    const projectName = previewClient.textContent || 'Proyecto';
    try {
        btn.textContent = '⏳ Generando...'; btn.disabled = true;
        const response = await fetch(`${API_BASE}/api/artifact/improvements/download`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markdown_content: markdownContent, project_name: projectName })
        });
        if (!response.ok) throw new Error('Error');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url;
        link.download = `mejoras_${projectName.replace(/\s+/g, '_')}.docx`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
        btn.textContent = '✅ Descargado';
        setTimeout(() => { btn.textContent = '📥 Descargar Word'; btn.disabled = false; }, 2000);
    } catch (error) {
        console.error('Error:', error);
        btn.textContent = '❌ Error';
        setTimeout(() => { btn.textContent = '📥 Descargar Word'; btn.disabled = false; }, 2000);
    }
}

function displayTeamProposal(data) {
    const team = data.team_members || [];
    const total = data.total_members || team.length;
    const summary = data.summary || '';

    let membersHtml = team.map(member => `
        <div class="team-member-card">
            <div class="member-header">
                <span class="member-role">${member.role}</span>
                <span class="member-seniority ${member.seniority.toLowerCase()}">${member.seniority}</span>
            </div>
            <div class="member-quantity">
                <span class="quantity-number">${member.quantity}</span>
                <span class="quantity-label">persona${member.quantity > 1 ? 's' : ''}</span>
            </div>
            <p class="member-justification">${member.justification}</p>
        </div>
    `).join('');

    artifactContent.innerHTML = `
        <div class="artifact-result">
            <div class="artifact-header-row">
                <h3>👥 Propuesta de Equipo</h3>
                <span class="team-total">${total} miembros totales</span>
            </div>
            <p class="artifact-description">${summary}</p>
            <div class="team-grid">
                ${membersHtml}
            </div>
        </div>
    `;
}

function displayArchitectureDiagram(data) {
    const mermaidCode = data.mermaid_code || '';
    const description = data.description || '';
    const layers = data.layers || {};

    // Definición de capas con iconos y colores
    const layerStyles = {
        presentation: { icon: '🖥️', name: 'Presentación', color: '#4A90D9' },
        security: { icon: '🔐', name: 'Seguridad', color: '#E74C3C' },
        backend: { icon: '⚙️', name: 'Backend', color: '#50C878' },
        data: { icon: '🗄️', name: 'Datos', color: '#9B59B6' },
        integrations: { icon: '🔗', name: 'Integraciones', color: '#F5A623' },
        reports: { icon: '📊', name: 'Reportes', color: '#1ABC9C' }
    };

    // Generar resumen de capas si existen
    let layersSummaryHtml = '';
    if (Object.keys(layers).length > 0) {
        layersSummaryHtml = '<div class="architecture-layers-summary">';
        for (const [key, components] of Object.entries(layers)) {
            const style = layerStyles[key] || { icon: '📦', name: key, color: '#666' };
            if (Array.isArray(components) && components.length > 0) {
                layersSummaryHtml += `
                    <div class="arch-layer-card" style="--layer-color: ${style.color}">
                        <div class="arch-layer-header">
                            <span class="layer-icon">${style.icon}</span>
                            <span class="layer-title">${style.name}</span>
                            <span class="layer-count">${components.length}</span>
                        </div>
                        <div class="arch-layer-components">
                            ${components.map(c => `<span class="component-tag">${c}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
        }
        layersSummaryHtml += '</div>';
    }

    artifactContent.innerHTML = `
        <div class="artifact-result">
            <div class="artifact-header-row">
                <h3>🏗️ Arquitectura C4 por Capas</h3>
                <button id="downloadDiagramBtn" class="btn-download" title="Descargar como PNG">
                    📥 Descargar PNG
                </button>
            </div>
            <p class="artifact-description">${description}</p>
            ${layersSummaryHtml}
            <div class="c4-diagram-note">
                <small>💡 El diagrama C4 se genera con las capas arquitectónicas identificadas en el proyecto</small>
            </div>
        </div>
    `;

    // Event listener para descargar (genera PNG internamente con mermaidCode)
    const downloadBtn = document.getElementById('downloadDiagramBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadMermaidAsPng(mermaidCode));
    }
}

async function downloadMermaidAsPng(mermaidCode) {
    const btn = document.getElementById('downloadDiagramBtn');

    try {
        btn.textContent = '⏳ Generando...';
        btn.disabled = true;

        // Generar SVG directamente desde el código mermaid
        const { svg } = await mermaid.render('download-diagram-' + Date.now(), mermaidCode);

        // Crear contenedor temporal VISIBLE para obtener dimensiones reales
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svg;
        tempDiv.style.position = 'fixed';
        tempDiv.style.top = '0';
        tempDiv.style.left = '0';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.pointerEvents = 'none';
        document.body.appendChild(tempDiv);

        const svgElement = tempDiv.querySelector('svg');

        // Obtener dimensiones del viewBox o atributos width/height
        let width = 1200;  // Ancho mínimo legible
        let height = 800;  // Alto mínimo

        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox.split(/\s+/);
            if (parts.length >= 4) {
                width = parseFloat(parts[2]) || 1200;
                height = parseFloat(parts[3]) || 800;
            }
        } else {
            // Intentar desde atributos directos
            const attrWidth = svgElement.getAttribute('width');
            const attrHeight = svgElement.getAttribute('height');
            if (attrWidth) width = parseFloat(attrWidth) || 1200;
            if (attrHeight) height = parseFloat(attrHeight) || 800;
        }

        // Escalar para mejor legibilidad (mínimo 1200px de ancho)
        if (width < 1200) {
            const scaleFactor = 1200 / width;
            width = 1200;
            height = height * scaleFactor;
        }

        // Preparar SVG para exportación con dimensiones corregidas
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgElement.setAttribute('width', width);
        svgElement.setAttribute('height', height);

        // Agregar fondo blanco
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', '#ffffff');
        svgElement.insertBefore(bg, svgElement.firstChild);

        // Serializar SVG
        const svgData = new XMLSerializer().serializeToString(svgElement);
        document.body.removeChild(tempDiv);

        const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
        const imgSrc = 'data:image/svg+xml;base64,' + svgBase64;

        // Crear imagen y canvas con alta resolución
        const img = new Image();

        img.onload = function () {
            const canvas = document.createElement('canvas');
            const scale = 4; // Resolución 4x para balance calidad/peso
            canvas.width = width * scale;
            canvas.height = height * scale;

            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(function (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `arquitectura_C4_${new Date().toISOString().slice(0, 10)}.png`;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                btn.textContent = '✅ Descargado';
                setTimeout(() => {
                    btn.textContent = '📥 Descargar PNG';
                    btn.disabled = false;
                }, 2000);
            }, 'image/png');
        };

        img.onerror = function () {
            // Fallback: descargar como SVG
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `arquitectura_${new Date().toISOString().slice(0, 10)}.svg`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);

            btn.textContent = '✅ SVG descargado';
            setTimeout(() => {
                btn.textContent = '📥 Descargar PNG';
                btn.disabled = false;
            }, 2000);
        };

        img.src = imgSrc;

    } catch (error) {
        console.error('Error descargando:', error);
        btn.textContent = '❌ Error';
        setTimeout(() => {
            btn.textContent = '📥 Descargar PNG';
            btn.disabled = false;
        }, 2000);
    }
}

function displayGenericArtifact(type, data) {
    const result = data.result || data;

    artifactContent.innerHTML = `
        <div class="artifact-result">
            <h3>${ARTIFACT_NAMES[type]}</h3>
            <div class="artifact-body">
                <pre>${JSON.stringify(result, null, 2)}</pre>
            </div>
        </div>
    `;
}

function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error leyendo archivo'));
        reader.readAsText(file);
    });
}

async function extractPdfText(file) {
    // Usamos pdf.js para extraer texto de PDFs
    // Si no está cargado, cargamos dinámicamente
    if (typeof pdfjsLib === 'undefined') {
        await loadPdfJs();
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            text += pageText + '\n\n';
        }

        return text.trim();
    } catch (error) {
        console.error('Error extracting PDF:', error);
        return `[Archivo PDF: ${file.name} - No se pudo extraer el texto automáticamente]`;
    }
}

function loadPdfJs() {
    return new Promise((resolve, reject) => {
        if (typeof pdfjsLib !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
        };
        script.onerror = () => reject(new Error('No se pudo cargar pdf.js'));
        document.head.appendChild(script);
    });
}

function clearUploadedFile() {
    uploadedFileContent = null;
    fileInput.value = '';
    uploadZone.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    formStatus.textContent = '';
    formStatus.className = 'status';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================================
// MAIN FUNCTIONS
// ============================================================

async function handleSubmit(e) {
    e.preventDefault();

    const documentation = document.getElementById('documentation').value.trim();
    const projectName = document.getElementById('project_name').value.trim() || 'Proyecto Digital';
    const context = document.getElementById('context').value.trim();

    if (documentation.length < 50) {
        showStatus('error', 'La documentación debe tener al menos 50 caracteres');
        return;
    }

    startBtn.disabled = true;
    startBtn.innerHTML = '⏳ Procesando...';
    showStatus('info', 'Iniciando análisis...');

    try {
        const response = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documentation,
                project_name: projectName,
                context
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al iniciar análisis');
        }

        const data = await response.json();
        currentJobId = data.job_id;

        // Mostrar dashboard con progreso
        formSection.classList.add('hidden');
        dashboard.classList.remove('hidden');
        projectTitle.textContent = projectName;

        progressContainer.style.display = 'block';
        hideAllCards();

        // Iniciar polling
        startPolling();

    } catch (error) {
        showStatus('error', error.message);
        startBtn.disabled = false;
        startBtn.innerHTML = '🚀 Generar Artefactos del Proyecto';
    }
}

function startPolling() {
    pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/job/${currentJobId}`);
            const data = await response.json();

            // Actualizar progreso
            const progress = Math.round((data.progress || 0) * 100);
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            progressMessage.textContent = data.message || '';

            if (data.status === 'completed') {
                stopPolling();
                currentResult = data.result;
                renderResults(data.result);
            } else if (data.status === 'failed') {
                stopPolling();
                progressMessage.innerHTML = `<span style="color:#ef4444">❌ ${data.message}</span>`;
            }

        } catch (error) {
            console.error('Error polling:', error);
        }
    }, 1500);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

function showForm() {
    stopPolling();
    dashboard.classList.add('hidden');
    formSection.classList.remove('hidden');
    startBtn.disabled = false;
    startBtn.innerHTML = '🚀 Generar Artefactos del Proyecto';
    formStatus.textContent = '';
    formStatus.className = 'status';
    // Limpiar archivo subido
    if (typeof clearUploadedFile === 'function') {
        clearUploadedFile();
    }
}

function showStatus(type, message) {
    formStatus.textContent = message;
    formStatus.className = `status ${type}`;
}

function hideAllCards() {
    document.getElementById('summary-card').style.display = 'none';
    document.getElementById('architecture-card').style.display = 'none';
    document.getElementById('gantt-card').style.display = 'none';
    document.getElementById('team-card').style.display = 'none';
    document.getElementById('epics-card').style.display = 'none';
    document.getElementById('economics-card').style.display = 'none';
    document.getElementById('risks-card').style.display = 'none';
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderResults(result) {
    progressContainer.style.display = 'none';

    // Resumen ejecutivo
    renderSummary(result);

    // Arquitectura
    if (result.architecture_diagram) {
        renderArchitecture(result.architecture_diagram);
    }

    // Gantt
    if (result.gantt_diagram) {
        renderGantt(result.gantt_diagram);
    }

    // Equipo
    if (result.team_proposal) {
        renderTeam(result.team_proposal);
    }

    // Épicas
    if (result.epics && result.epics.length > 0) {
        renderEpics(result.epics);
    }

    // Propuesta económica
    if (result.economic_proposal) {
        renderEconomics(result.economic_proposal);
    }

    // Riesgos y prerrequisitos
    if (result.risks_prerequisites) {
        renderRisks(result.risks_prerequisites);
    }
}

function renderSummary(result) {
    const card = document.getElementById('summary-card');
    const grid = document.getElementById('summary-grid');

    const team = result.team_proposal || {};
    const economics = result.economic_proposal?.summary || {};
    const epicsCount = result.epics?.length || 0;
    const risksCount = result.risks_prerequisites?.risks?.length || 0;

    grid.innerHTML = `
        <div class="metric">
            <h3>Duración</h3>
            <p>${team.duration_months || economics.duration_months || '-'} meses</p>
        </div>
        <div class="metric">
            <h3>Equipo</h3>
            <p>${team.team_size || '-'} personas</p>
        </div>
        <div class="metric accent">
            <h3>Épicas</h3>
            <p>${epicsCount}</p>
        </div>
        <div class="metric success">
            <h3>Costo Total</h3>
            <p>$${formatNumber(economics.total_cost || 0)}</p>
        </div>
        <div class="metric warning">
            <h3>Riesgos</h3>
            <p>${risksCount}</p>
        </div>
        <div class="metric">
            <h3>Metodología</h3>
            <p style="font-size:0.9rem">${team.recommended_methodology || 'Scrum'}</p>
        </div>
    `;

    card.style.display = 'block';
}

async function renderArchitecture(diagram) {
    const card = document.getElementById('architecture-card');
    const container = document.getElementById('architecture-diagram');
    const codeBlock = document.getElementById('architecture-code');

    codeBlock.textContent = diagram;

    try {
        container.innerHTML = '';
        const id = 'arch-' + Date.now();
        const { svg } = await mermaid.render(id, diagram);
        container.innerHTML = svg;
    } catch (e) {
        console.error('Error rendering architecture:', e);
        container.innerHTML = `<p style="color:#94a3b8">No se pudo renderizar el diagrama. Ver código abajo.</p>`;
    }

    card.style.display = 'block';
}

async function renderGantt(diagram) {
    const card = document.getElementById('gantt-card');
    const container = document.getElementById('gantt-diagram');
    const codeBlock = document.getElementById('gantt-code');

    codeBlock.textContent = diagram;

    try {
        container.innerHTML = '';
        const id = 'gantt-' + Date.now();
        const { svg } = await mermaid.render(id, diagram);
        container.innerHTML = svg;
    } catch (e) {
        console.error('Error rendering gantt:', e);
        container.innerHTML = `<p style="color:#94a3b8">No se pudo renderizar el diagrama. Ver código abajo.</p>`;
    }

    card.style.display = 'block';
}

function renderTeam(team) {
    const card = document.getElementById('team-card');
    const summaryGrid = document.getElementById('team-summary');
    const rolesContainer = document.getElementById('team-roles');

    summaryGrid.innerHTML = `
        <div class="metric">
            <h3>Tamaño del Equipo</h3>
            <p>${team.team_size || '-'}</p>
        </div>
        <div class="metric">
            <h3>Duración</h3>
            <p>${team.duration_months || '-'} meses</p>
        </div>
        <div class="metric accent">
            <h3>Metodología</h3>
            <p style="font-size:0.85rem">${team.recommended_methodology || '-'}</p>
        </div>
        <div class="metric">
            <h3>Sprint</h3>
            <p style="font-size:0.85rem">${team.sprint_duration || '-'}</p>
        </div>
    `;

    const roles = team.roles || [];
    rolesContainer.innerHTML = roles.map(role => `
        <div class="role-card">
            <h4>${role.role} <span style="color:#94a3b8;font-weight:normal">(${role.count}x)</span></h4>
            <div class="role-meta">
                <span>📊 ${role.seniority || 'Mid'}</span>
                <span>⏰ ${role.dedication || '100%'}</span>
            </div>
            <div class="skills">
                ${(role.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}
            </div>
            ${role.justification ? `<p style="margin-top:0.5rem;font-size:0.8rem;color:#94a3b8">${role.justification}</p>` : ''}
        </div>
    `).join('');

    card.style.display = 'block';
}

function renderEpics(epics) {
    const card = document.getElementById('epics-card');
    const list = document.getElementById('epics-list');

    list.innerHTML = epics.map(epic => {
        const priorityClass = (epic.priority || '').toLowerCase().includes('alta') ? 'high' :
            (epic.priority || '').toLowerCase().includes('media') ? 'medium' : 'low';
        return `
            <div class="epic-card ${priorityClass}">
                <h4>${epic.id}: ${epic.title}</h4>
                <p style="margin:0.5rem 0;color:#cbd5e1;font-size:0.85rem">${epic.description || ''}</p>
                <div class="epic-meta">
                    <span class="badge ${priorityClass}">${epic.priority || 'Media'}</span>
                    <span>⏱️ ${epic.estimated_sprints || '?'} sprints</span>
                    <span>📝 ${(epic.stories || []).length} historias</span>
                </div>
            </div>
        `;
    }).join('');

    card.style.display = 'block';
}

function renderEconomics(economics) {
    const card = document.getElementById('economics-card');
    const summaryGrid = document.getElementById('economics-summary');
    const breakdown = document.getElementById('economics-breakdown');
    const milestones = document.getElementById('economics-milestones');

    const summary = economics.summary || {};

    summaryGrid.innerHTML = `
        <div class="metric success">
            <h3>Costo Total</h3>
            <p>$${formatNumber(summary.total_cost || 0)}</p>
        </div>
        <div class="metric">
            <h3>Duración</h3>
            <p>${summary.duration_months || '-'} meses</p>
        </div>
        <div class="metric accent">
            <h3>Costo Mensual</h3>
            <p>$${formatNumber(summary.monthly_cost || 0)}</p>
        </div>
    `;

    // Breakdown table
    const items = economics.breakdown || [];
    if (items.length > 0) {
        breakdown.innerHTML = `
            <h3 style="margin-bottom:0.75rem;font-size:0.9rem">Desglose de Costos</h3>
            <table class="cost-table">
                <thead>
                    <tr>
                        <th>Categoría</th>
                        <th>Descripción</th>
                        <th>Costo</th>
                        <th>Recurrencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td><strong>${item.category}</strong></td>
                            <td>${item.description}</td>
                            <td>$${formatNumber(item.cost)}</td>
                            <td>${item.recurrence}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Milestones
    const ms = economics.payment_milestones || [];
    if (ms.length > 0) {
        milestones.innerHTML = `
            <h3 style="margin-bottom:0.75rem;font-size:0.9rem">Hitos de Pago</h3>
            <div style="display:flex;gap:1rem;flex-wrap:wrap">
                ${ms.map(m => `
                    <div style="flex:1;min-width:120px;padding:0.75rem;background:#0f172a;border-radius:8px;text-align:center">
                        <div style="font-size:1.25rem;font-weight:bold;color:#0052cc">${m.percentage}%</div>
                        <div style="font-size:0.8rem;color:#94a3b8;margin-top:0.25rem">${m.milestone}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Assumptions
    if (economics.assumptions && economics.assumptions.length > 0) {
        milestones.innerHTML += `
            <div style="margin-top:1rem;padding:1rem;background:#0f172a;border-radius:8px">
                <h4 style="margin:0 0 0.5rem;font-size:0.85rem;color:#94a3b8">Supuestos</h4>
                <ul style="margin:0;padding-left:1.25rem;color:#cbd5e1;font-size:0.85rem">
                    ${economics.assumptions.map(a => `<li>${a}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    card.style.display = 'block';
}

function renderRisks(data) {
    const card = document.getElementById('risks-card');
    const risksList = document.getElementById('risks-list');
    const prereqsList = document.getElementById('prerequisites-list');

    // Risks
    const risks = data.risks || [];
    risksList.innerHTML = risks.map(risk => {
        const impactClass = (risk.impact || '').toLowerCase().includes('alto') ? 'high' :
            (risk.impact || '').toLowerCase().includes('medio') ? 'medium' : 'low';
        return `
            <div class="risk-item ${impactClass}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem">
                    <strong>${risk.id}: ${risk.description}</strong>
                    <div style="display:flex;gap:0.5rem">
                        <span class="badge ${impactClass}">Impacto: ${risk.impact}</span>
                        <span class="badge" style="background:#334155">Prob: ${risk.probability}</span>
                    </div>
                </div>
                <p style="margin:0.5rem 0 0;font-size:0.85rem;color:#94a3b8">
                    <strong>Mitigación:</strong> ${risk.mitigation || 'No definida'}
                </p>
            </div>
        `;
    }).join('');

    // Prerequisites
    const prereqs = data.prerequisites || [];
    prereqsList.innerHTML = prereqs.map(prereq => `
        <div class="prereq-item">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem">
                <strong>${prereq.id}: ${prereq.description}</strong>
                <span class="badge" style="background:#334155">${prereq.category}</span>
            </div>
            <div style="margin-top:0.5rem;font-size:0.85rem;color:#94a3b8">
                <span>👤 Responsable: ${prereq.owner || '-'}</span>
                <span style="margin-left:1rem">📅 ${prereq.deadline || '-'}</span>
            </div>
        </div>
    `).join('');

    card.style.display = 'block';
}

// ============================================================
// HELPERS
// ============================================================

function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

function downloadResults() {
    if (!currentResult) {
        alert('No hay resultados para descargar');
        return;
    }

    const projectName = document.getElementById('project_name').value.trim() || 'proyecto';
    const cleanName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanName}_artefactos.json`;

    const blob = new Blob([JSON.stringify(currentResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// COPY TO CLIPBOARD UTILITY
// ============================================================

async function copyToClipboard(text, buttonId = null) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('✅ Copiado al portapapeles');
        if (buttonId) {
            const btn = document.getElementById(buttonId);
            if (btn) {
                const original = btn.textContent;
                btn.textContent = '✓ Copiado';
                setTimeout(() => btn.textContent = original, 1500);
            }
        }
        return true;
    } catch (err) {
        showToast('❌ Error al copiar', 'error');
        return false;
    }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter = Process files
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const processBtn = document.getElementById('process-files-btn');
        if (processBtn && !processBtn.disabled && uploadedFiles.length > 0) {
            processBtn.click();
            showToast('🚀 Procesando documentos...');
        }
    }

    // Escape = Cancel/Back
    if (e.key === 'Escape') {
        const cancelBtn = document.getElementById('cancelPreviewBtn');
        const ganttModal = document.getElementById('gantt-date-modal');

        if (ganttModal && !ganttModal.classList.contains('hidden')) {
            hideGanttDateModal();
        } else if (cancelBtn && !cancelBtn.closest('.hidden')) {
            cancelBtn.click();
        }
    }
});

// ============================================================
// LOCAL STORAGE PERSISTENCE
// ============================================================

const STORAGE_KEY = 'projectGeneratorSession';

function saveSession() {
    const session = {
        generatedArtifacts,
        projectName: previewClient?.textContent || 'Proyecto',
        savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    showToast('💾 Sesión guardada');
}

function loadSession() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const session = JSON.parse(saved);
            Object.assign(generatedArtifacts, session.generatedArtifacts);
            showToast(`📂 Sesión restaurada (${new Date(session.savedAt).toLocaleTimeString()})`);
            return true;
        }
    } catch (e) {
        console.error('Error loading session:', e);
    }
    return false;
}

function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    showToast('🗑️ Sesión limpiada');
}

// ============================================================
// TIMESTAMP UTILITY
// ============================================================

function getTimestamp() {
    return new Date().toLocaleString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short'
    });
}

// ============================================================
// EXPORT ALL FUNCTIONALITY
// ============================================================

function updateExportAllButton() {
    const btn = document.getElementById('exportAllBtn');
    if (!btn) return;

    const count = Object.keys(generatedArtifacts).length;
    btn.disabled = count < 1;
    btn.textContent = count > 0 ? `📥 Exportar Todo (${count} artefactos)` : '📥 Exportar Todo (Word)';
}

async function exportAllAsWord() {
    const btn = document.getElementById('exportAllBtn');
    const projectName = previewClient?.textContent || 'Proyecto';

    if (Object.keys(generatedArtifacts).length === 0) {
        showToast('❌ No hay artefactos para exportar', 'error');
        return;
    }

    try {
        btn.textContent = '⏳ Generando documento...';
        btn.disabled = true;

        const response = await fetch(`${API_BASE}/api/artifact/export-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_name: projectName,
                artifacts: generatedArtifacts
            })
        });

        if (!response.ok) throw new Error('Error al generar documento');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `propuesta_completa_${projectName.replace(/\s+/g, '_')}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast('✅ Propuesta completa descargada');
        updateExportAllButton();

    } catch (error) {
        console.error('Error exporting:', error);
        showToast('❌ Error al exportar', 'error');
        updateExportAllButton();
    }
}

// Inicialización
console.log('🚀 Project Generator Agent initialized');
console.log('⌨️ Shortcuts: Ctrl+Enter (procesar), Escape (cerrar modal)');

