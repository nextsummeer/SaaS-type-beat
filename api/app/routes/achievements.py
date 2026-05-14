"""
Endpoint REST de conquistas (gamificacao).

Calculado lazy: cada requisicao avalia todas as conquistas, persiste
recém-desbloqueadas e retorna estado completo. Sem cron, sem trigger.

T9.3 do _tasks-conquistas.md.
"""
import logging

from fastapi import APIRouter, Header, HTTPException

from app.services import achievements_service
from app.services.supabase_service import validate_token

router = APIRouter(prefix="/achievements", tags=["achievements"])
logger = logging.getLogger(__name__)


def _autentica(authorization: str) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")
    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    return str(user.id)


@router.get("")
def list_achievements(authorization: str = Header(...)):
    """Lista todas as conquistas com estado pro usuario autenticado.

    Side-effect: persiste em `user_achievements` qualquer conquista que
    o user acabou de desbloquear. Toast/UI sabe disso via flag
    `newly_unlocked: true` em cada item retornado.

    Retorna:
        {
          "achievements": [
            { "key": "volume_first", "title": "Primeiro tijolo", ...,
              "current": 4, "target": 1, "unlocked": true,
              "newly_unlocked": false, "progress_pct": 100.0,
              "unlocked_at": "2026-05-14T..." },
            ...
          ],
          "newly_unlocked_keys": ["streak_warm"],
          "total": 14,
          "unlocked_count": 3
        }
    """
    user_id = _autentica(authorization)
    try:
        return achievements_service.evaluate(user_id)
    except Exception as exc:
        logger.error("achievements: falha ao avaliar user=%s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Erro ao avaliar conquistas")
