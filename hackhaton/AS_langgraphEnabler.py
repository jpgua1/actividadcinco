"""
AS_langgraphEnabler.py - Project Generator Orchestrator

Motor de orquestación basado en LangGraph que transforma documentación
funcional/técnica en artefactos completos para arranque de proyectos.
"""

import os
import json
from typing import Dict, List, Optional, Any, TypedDict
from dataclasses import dataclass
import logging
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# LangGraph & LangChain
from langgraph.graph import StateGraph, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import AzureChatOpenAI

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURACIÓN & MODELOS
# ============================================================

@dataclass
class ProjectConfig:
    input_text: str
    project_name: Optional[str] = None
    context: Optional[str] = None
    output_dir: str = "./outputs"

class ProjectState(TypedDict):
    """Estado del grafo de generación de proyectos"""
    config: ProjectConfig
    raw_documentation: str
    architecture_diagram: str
    gantt_diagram: str
    team_proposal: Dict[str, Any]
    epics: List[Dict[str, Any]]
    economic_proposal: Dict[str, Any]
    risks_prerequisites: Dict[str, Any]
    status: str
    error: Optional[str]
    progress: float

# ============================================================
# PROVIDER AZURE
# ============================================================

def get_llm():
    """Obtiene instancia de AzureChatOpenAI desde variables de entorno"""
    return AzureChatOpenAI(
        azure_deployment=os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-4.1"),
        openai_api_version=os.getenv("AZURE_API_VERSION", "2024-04-01-preview"),
        azure_endpoint=os.getenv("AZURE_API_BASE"),
        api_key=os.getenv("AZURE_API_KEY"),
        temperature=0.3
    )

# ============================================================
# NODOS DEL GRAFO
# ============================================================

def node_ingest_data(state: ProjectState) -> ProjectState:
    """Nodo 1: Ingesta y limpieza de documentación"""
    logger.info("📝 Ingestando documentación...")
    try:
        raw = state["config"].input_text
        context = state["config"].context or ""
        project_name = state["config"].project_name or "Proyecto Digital"
        
        combined_input = f"PROYECTO: {project_name}\n\nCONTEXTO:\n{context}\n\nDOCUMENTACIÓN:\n{raw}"
        
        state["raw_documentation"] = combined_input
        state["status"] = "ingested"
        state["progress"] = 0.1
    except Exception as e:
        state["error"] = str(e)
        state["status"] = "failed"
        
    return state


def node_generate_architecture(state: ProjectState) -> ProjectState:
    """Nodo 2: Genera diagrama de arquitectura Mermaid"""
    logger.info("🏗️ Generando arquitectura...")
    if state.get("status") == "failed": return state
    
    try:
        llm = get_llm()
        input_text = state["raw_documentation"][:12000]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Eres un Arquitecto de Software Senior. Generas diagramas de arquitectura en formato Mermaid."),
            ("human", """
            Analiza la siguiente documentación de proyecto y genera un diagrama de arquitectura técnica en Mermaid.
            
            Documentación:
            {input_text}
            
            Genera ÚNICAMENTE el código Mermaid (sin explicaciones adicionales) que represente:
            - Componentes principales del sistema
            - Bases de datos y almacenamiento
            - APIs y servicios externos
            - Flujos de comunicación
            
            Usa flowchart TD o C4 diagram según aplique.
            """)
        ])
        
        chain = prompt | llm
        response = chain.invoke({"input_text": input_text})
        
        content = response.content.strip()
        # Limpiar marcadores de código si existen
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("mermaid"):
                content = content[7:]
        content = content.strip()
        
        state["architecture_diagram"] = content
        state["status"] = "architecture_done"
        state["progress"] = 0.25
        
    except Exception as e:
        logger.error(f"Error generando arquitectura: {e}")
        state["architecture_diagram"] = """flowchart TD
    A[Frontend] --> B[API Gateway]
    B --> C[Backend Services]
    C --> D[(Database)]
    C --> E[External APIs]"""
        state["status"] = "architecture_done"
        state["progress"] = 0.25
    
    return state


def node_generate_gantt(state: ProjectState) -> ProjectState:
    """Nodo 3: Genera diagrama de Gantt"""
    logger.info("📅 Generando Gantt...")
    if state.get("status") == "failed": return state
    
    try:
        llm = get_llm()
        input_text = state["raw_documentation"][:10000]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Eres un Project Manager experto en planificación de proyectos tecnológicos."),
            ("human", """
            Analiza la siguiente documentación y genera un diagrama de Gantt en formato Mermaid.
            
            Documentación:
            {input_text}
            
            Genera ÚNICAMENTE el código Mermaid gantt que incluya:
            - Fases principales del proyecto
            - Fechas estimadas realistas
            - Dependencias entre tareas
            - Hitos importantes
            
            Formato esperado:
            gantt
                title Cronograma del Proyecto
                dateFormat YYYY-MM-DD
                section Fase 1
                ...
            """)
        ])
        
        chain = prompt | llm
        response = chain.invoke({"input_text": input_text})
        
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("mermaid"):
                content = content[7:]
        content = content.strip()
        
        state["gantt_diagram"] = content
        state["status"] = "gantt_done"
        state["progress"] = 0.4
        
    except Exception as e:
        logger.error(f"Error generando Gantt: {e}")
        state["gantt_diagram"] = """gantt
    title Cronograma del Proyecto
    dateFormat YYYY-MM-DD
    section Análisis
    Levantamiento de requerimientos :a1, 2025-01-20, 10d
    section Desarrollo
    Sprint 1 :a2, after a1, 15d
    Sprint 2 :a3, after a2, 15d
    section Pruebas
    QA y Testing :a4, after a3, 10d"""
        state["status"] = "gantt_done"
        state["progress"] = 0.4
    
    return state


def node_generate_team(state: ProjectState) -> ProjectState:
    """Nodo 4: Genera propuesta de equipo"""
    logger.info("👥 Generando propuesta de equipo...")
    if state.get("status") == "failed": return state
    
    try:
        llm = get_llm()
        input_text = state["raw_documentation"][:10000]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Eres un Delivery Manager experto en conformación de equipos de desarrollo."),
            ("human", """
            Analiza la documentación del proyecto y propón un equipo de desarrollo óptimo.
            
            Documentación:
            {input_text}
            
            Genera un JSON con la siguiente estructura:
            {{
                "team_size": <número>,
                "duration_months": <número>,
                "roles": [
                    {{
                        "role": "Nombre del rol",
                        "count": <cantidad>,
                        "seniority": "Junior/Mid/Senior",
                        "skills": ["skill1", "skill2"],
                        "dedication": "100% | 50%",
                        "justification": "Por qué se necesita este rol"
                    }}
                ],
                "recommended_methodology": "Scrum | Kanban | SAFe",
                "sprint_duration": "2 semanas | 3 semanas"
            }}
            
            Responde SOLO con el JSON válido.
            """)
        ])
        
        chain = prompt | llm
        response = chain.invoke({"input_text": input_text})
        
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        
        try:
            team_data = json.loads(content)
        except:
            team_data = {
                "team_size": 5,
                "duration_months": 4,
                "roles": [
                    {"role": "Tech Lead", "count": 1, "seniority": "Senior", "skills": ["Arquitectura", "Liderazgo"], "dedication": "100%"},
                    {"role": "Backend Developer", "count": 2, "seniority": "Mid-Senior", "skills": ["Python", "APIs"], "dedication": "100%"},
                    {"role": "Frontend Developer", "count": 1, "seniority": "Mid", "skills": ["React", "CSS"], "dedication": "100%"},
                    {"role": "QA Engineer", "count": 1, "seniority": "Mid", "skills": ["Testing", "Automation"], "dedication": "100%"}
                ],
                "recommended_methodology": "Scrum",
                "sprint_duration": "2 semanas"
            }
        
        state["team_proposal"] = team_data
        state["status"] = "team_done"
        state["progress"] = 0.55
        
    except Exception as e:
        logger.error(f"Error generando equipo: {e}")
        state["team_proposal"] = {"error": str(e)}
        state["status"] = "team_done"
        state["progress"] = 0.55
    
    return state


def node_generate_epics(state: ProjectState) -> ProjectState:
    """Nodo 5: Descompone en épicas ágiles"""
    logger.info("📋 Generando épicas...")
    if state.get("status") == "failed": return state
    
    try:
        llm = get_llm()
        input_text = state["raw_documentation"][:10000]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Eres un Product Owner experto en gestión ágil y descomposición de alcance."),
            ("human", """
            Analiza la documentación y descompón el alcance en épicas con historias de usuario.
            
            Documentación:
            {input_text}
            
            Genera un JSON con la siguiente estructura:
            {{
                "epics": [
                    {{
                        "id": "EPIC-001",
                        "title": "Título de la épica",
                        "description": "Descripción breve",
                        "priority": "Alta | Media | Baja",
                        "estimated_sprints": <número>,
                        "stories": [
                            {{
                                "id": "US-001",
                                "title": "Como usuario quiero...",
                                "acceptance_criteria": ["Criterio 1", "Criterio 2"],
                                "story_points": <número>
                            }}
                        ]
                    }}
                ],
                "total_story_points": <número>,
                "mvp_epics": ["EPIC-001", "EPIC-002"]
            }}
            
            Responde SOLO con el JSON válido.
            """)
        ])
        
        chain = prompt | llm
        response = chain.invoke({"input_text": input_text})
        
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        
        try:
            epics_data = json.loads(content)
        except:
            epics_data = {
                "epics": [
                    {
                        "id": "EPIC-001",
                        "title": "Módulo Core",
                        "description": "Funcionalidades principales del sistema",
                        "priority": "Alta",
                        "estimated_sprints": 3,
                        "stories": []
                    }
                ],
                "total_story_points": 0,
                "mvp_epics": ["EPIC-001"]
            }
        
        state["epics"] = epics_data.get("epics", [])
        state["status"] = "epics_done"
        state["progress"] = 0.7
        
    except Exception as e:
        logger.error(f"Error generando épicas: {e}")
        state["epics"] = []
        state["status"] = "epics_done"
        state["progress"] = 0.7
    
    return state


def node_generate_economics(state: ProjectState) -> ProjectState:
    """Nodo 6: Genera propuesta económica"""
    logger.info("💰 Generando propuesta económica...")
    if state.get("status") == "failed": return state
    
    try:
        llm = get_llm()
        team_data = json.dumps(state.get("team_proposal", {}), indent=2)
        input_text = state["raw_documentation"][:5000]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Eres un experto en estimación de costos de proyectos de software."),
            ("human", """
            Basándote en el equipo propuesto y la documentación, genera una propuesta económica.
            
            Equipo propuesto:
            {team_data}
            
            Documentación:
            {input_text}
            
            Genera un JSON con la siguiente estructura (costos en USD):
            {{
                "summary": {{
                    "total_cost": <número>,
                    "duration_months": <número>,
                    "monthly_cost": <número>
                }},
                "breakdown": [
                    {{
                        "category": "Desarrollo | Infraestructura | Licencias | QA | Gestión",
                        "description": "Descripción",
                        "cost": <número>,
                        "recurrence": "Único | Mensual"
                    }}
                ],
                "assumptions": ["Supuesto 1", "Supuesto 2"],
                "payment_milestones": [
                    {{"milestone": "Kickoff", "percentage": 20}},
                    {{"milestone": "MVP", "percentage": 40}},
                    {{"milestone": "Entrega Final", "percentage": 40}}
                ]
            }}
            
            Responde SOLO con el JSON válido.
            """)
        ])
        
        chain = prompt | llm
        response = chain.invoke({"team_data": team_data, "input_text": input_text})
        
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        
        try:
            economics_data = json.loads(content)
        except:
            economics_data = {
                "summary": {"total_cost": 50000, "duration_months": 4, "monthly_cost": 12500},
                "breakdown": [],
                "assumptions": ["Equipo dedicado", "Infraestructura cloud"],
                "payment_milestones": []
            }
        
        state["economic_proposal"] = economics_data
        state["status"] = "economics_done"
        state["progress"] = 0.85
        
    except Exception as e:
        logger.error(f"Error generando propuesta económica: {e}")
        state["economic_proposal"] = {"error": str(e)}
        state["status"] = "economics_done"
        state["progress"] = 0.85
    
    return state


def node_generate_risks(state: ProjectState) -> ProjectState:
    """Nodo 7: Identifica riesgos y prerrequisitos"""
    logger.info("⚠️ Identificando riesgos y prerrequisitos...")
    if state.get("status") == "failed": return state
    
    try:
        llm = get_llm()
        input_text = state["raw_documentation"][:8000]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Eres un experto en gestión de riesgos de proyectos tecnológicos."),
            ("human", """
            Analiza la documentación e identifica riesgos y prerrequisitos del proyecto.
            
            Documentación:
            {input_text}
            
            Genera un JSON con la siguiente estructura:
            {{
                "risks": [
                    {{
                        "id": "R001",
                        "category": "Técnico | Operativo | Entrega | Recurso",
                        "description": "Descripción del riesgo",
                        "probability": "Alta | Media | Baja",
                        "impact": "Alto | Medio | Bajo",
                        "mitigation": "Estrategia de mitigación"
                    }}
                ],
                "prerequisites": [
                    {{
                        "id": "P001",
                        "category": "Técnico | Acceso | Documentación | Recurso",
                        "description": "Descripción del prerrequisito",
                        "owner": "Cliente | Proveedor",
                        "deadline": "Antes del kickoff | Sprint 1"
                    }}
                ],
                "dependencies": [
                    {{
                        "type": "Interna | Externa",
                        "description": "Descripción de la dependencia"
                    }}
                ]
            }}
            
            Responde SOLO con el JSON válido.
            """)
        ])
        
        chain = prompt | llm
        response = chain.invoke({"input_text": input_text})
        
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        
        try:
            risks_data = json.loads(content)
        except:
            risks_data = {
                "risks": [
                    {"id": "R001", "category": "Técnico", "description": "Complejidad técnica subestimada", "probability": "Media", "impact": "Alto", "mitigation": "Revisión técnica temprana"}
                ],
                "prerequisites": [
                    {"id": "P001", "category": "Acceso", "description": "Acceso a sistemas del cliente", "owner": "Cliente", "deadline": "Antes del kickoff"}
                ],
                "dependencies": []
            }
        
        state["risks_prerequisites"] = risks_data
        state["status"] = "completed"
        state["progress"] = 1.0
        
    except Exception as e:
        logger.error(f"Error identificando riesgos: {e}")
        state["risks_prerequisites"] = {"error": str(e)}
        state["status"] = "completed"
        state["progress"] = 1.0
    
    return state


# ============================================================
# ORQUESTADOR
# ============================================================

class ProjectGeneratorOrchestrator:
    def __init__(self):
        # Definir Grafo
        workflow = StateGraph(ProjectState)
        
        workflow.add_node("ingest", node_ingest_data)
        workflow.add_node("architecture", node_generate_architecture)
        workflow.add_node("gantt", node_generate_gantt)
        workflow.add_node("team", node_generate_team)
        workflow.add_node("epics", node_generate_epics)
        workflow.add_node("economics", node_generate_economics)
        workflow.add_node("risks", node_generate_risks)
        
        workflow.set_entry_point("ingest")
        workflow.add_edge("ingest", "architecture")
        workflow.add_edge("architecture", "gantt")
        workflow.add_edge("gantt", "team")
        workflow.add_edge("team", "epics")
        workflow.add_edge("epics", "economics")
        workflow.add_edge("economics", "risks")
        workflow.add_edge("risks", END)
        
        self.app = workflow.compile()
        
    def run(self, config: ProjectConfig) -> Dict[str, Any]:
        """Ejecuta el flujo completo"""
        initial_state = ProjectState(
            config=config,
            raw_documentation="",
            architecture_diagram="",
            gantt_diagram="",
            team_proposal={},
            epics=[],
            economic_proposal={},
            risks_prerequisites={},
            status="pending",
            error=None,
            progress=0.0
        )
        
        final_state = self.app.invoke(initial_state)
        
        return {
            "status": final_state["status"],
            "progress": final_state.get("progress", 1.0),
            "architecture_diagram": final_state.get("architecture_diagram"),
            "gantt_diagram": final_state.get("gantt_diagram"),
            "team_proposal": final_state.get("team_proposal"),
            "epics": final_state.get("epics"),
            "economic_proposal": final_state.get("economic_proposal"),
            "risks_prerequisites": final_state.get("risks_prerequisites"),
            "error": final_state.get("error")
        }
