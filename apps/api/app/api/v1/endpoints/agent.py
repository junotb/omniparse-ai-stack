"""
Agent 엔드포인트.
"""

from fastapi import APIRouter

from app.schemas.agent import AgentQueryRequest, AgentQueryResponse
from app.services.agent_service import get_agent_service

router = APIRouter()


@router.post(
    "/query",
    response_model=AgentQueryResponse,
    summary="Agent 질의",
    operation_id="agent_query",
)
async def agent_query(req: AgentQueryRequest) -> AgentQueryResponse:
    """OCR, Parser, Image 결과를 컨텍스트로 질문에 답변."""
    svc = get_agent_service()
    out = svc.query(req.question, req.context, req.options)
    return AgentQueryResponse(
        answer=out["answer"],
        sources=out.get("sources") or [],
        model=out.get("model"),
    )
