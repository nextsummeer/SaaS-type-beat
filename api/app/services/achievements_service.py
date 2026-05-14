"""
Catalogo + avaliacao de conquistas (gamificacao).

Catalogo das 14 conquistas mora aqui no codigo (constante CATALOG).
Tabela user_achievements no banco persiste apenas QUEM desbloqueou
O QUE e QUANDO.

Pattern: cada conquista tem uma 'metric' que mapeia pra um dado
coletado em _collect_metrics(). Se metric >= target, esta desbloqueada.

T9.2 do _tasks-conquistas.md.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.services.supabase_service import get_admin_client
from app.services import youtube_analytics

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────
# Catalogo
# ──────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Achievement:
    key: str
    title: str
    description: str
    category: str  # 'streak' | 'volume' | 'views' | 'hit' | 'secret'
    tier: str      # 'bronze' | 'silver' | 'gold'
    target: int
    metric: str    # chave do _collect_metrics()


CATALOG: tuple[Achievement, ...] = (
    # 🔥 Streaks de postagem (constancia)
    Achievement('streak_warm',   'Aquecendo',         '5 beats publicados em 7 dias',  'streak', 'bronze', 5,  'streak_7d'),
    Achievement('streak_fire',   'Em chamas',         '15 beats em 30 dias',           'streak', 'silver', 15, 'streak_30d'),
    Achievement('streak_legend', 'Lenda viva',        '50 beats em 90 dias',           'streak', 'gold',   50, 'streak_90d'),

    # 🎵 Volume de beats publicados
    Achievement('volume_first',  'Primeiro tijolo',   '1 beat publicado',              'volume', 'bronze', 1,   'beats_total'),
    Achievement('volume_10',     'Empilhando',        '10 beats publicados',           'volume', 'bronze', 10,  'beats_total'),
    Achievement('volume_50',     'Catálogo sólido',   '50 beats publicados',           'volume', 'silver', 50,  'beats_total'),
    Achievement('volume_100',    'Máquina',           '100 beats publicados',          'volume', 'gold',   100, 'beats_total'),

    # 👁 Views totais do canal
    Achievement('views_100',     'Primeira centena',  '100 views totais',              'views',  'bronze', 100,    'views_total'),
    Achievement('views_1k',      'Mil olhos',         '1.000 views totais',            'views',  'bronze', 1000,   'views_total'),
    Achievement('views_10k',     'Dez mil',           '10.000 views totais',           'views',  'silver', 10000,  'views_total'),
    Achievement('views_100k',    'Cem mil',           '100.000 views totais',          'views',  'gold',   100000, 'views_total'),

    # 🚀 Hit individual
    Achievement('hit_1k',        'Bombou',            '1.000 views em 1 beat só',      'hit',    'silver', 1000,  'best_beat_views'),
    Achievement('hit_10k',       'Mega hit',          '10.000 views em 1 beat só',     'hit',    'gold',   10000, 'best_beat_views'),

    # 🤫 Secreta (placeholder — Gustavo decide critério depois)
    Achievement('secret_001',    'Conquista misteriosa', 'Descobrir como desbloquear...', 'secret', 'gold', 999_999, 'secret'),
)


# ──────────────────────────────────────────────────────────────────────
# API publica
# ──────────────────────────────────────────────────────────────────────

def evaluate(user_id: str) -> dict:
    """Avalia TODAS as conquistas pro user.

    1. Coleta metricas atuais (beats publicados, views, hit, streaks)
    2. Compara com targets
    3. Persiste recém-desbloqueadas em user_achievements
    4. Retorna lista completa com status pra UI

    Returns:
        {
          'achievements': [
            { key, title, description, category, tier, target, current,
              unlocked, newly_unlocked, progress_pct, unlocked_at },
            ...
          ],
          'newly_unlocked_keys': ['streak_warm', ...],
          'total': 14,
          'unlocked_count': 3,
        }
    """
    metrics = _collect_metrics(user_id)
    already_unlocked = _get_unlocked(user_id)
    newly: list[str] = []
    results: list[dict] = []

    for ach in CATALOG:
        current = int(metrics.get(ach.metric, 0))
        unlocked = current >= ach.target
        was_unlocked = ach.key in already_unlocked
        is_newly = unlocked and not was_unlocked

        if is_newly:
            _persist_unlock(user_id, ach.key)
            newly.append(ach.key)
            already_unlocked[ach.key] = datetime.now(timezone.utc).isoformat()

        results.append({
            'key': ach.key,
            'title': ach.title,
            'description': ach.description,
            'category': ach.category,
            'tier': ach.tier,
            'target': ach.target,
            'current': current,
            'unlocked': unlocked,
            'newly_unlocked': is_newly,
            'progress_pct': min(100.0, round((current / ach.target) * 100, 1)) if ach.target > 0 else 0,
            'unlocked_at': already_unlocked.get(ach.key),
        })

    return {
        'achievements': results,
        'newly_unlocked_keys': newly,
        'total': len(CATALOG),
        'unlocked_count': sum(1 for r in results if r['unlocked']),
    }


# ──────────────────────────────────────────────────────────────────────
# Coletores de metricas (privados)
# ──────────────────────────────────────────────────────────────────────

def _collect_metrics(user_id: str) -> dict[str, int]:
    """Reune todas as metricas necessarias pra avaliar o catalogo."""
    client = get_admin_client()

    # Beats publicados (posts com youtube_video_id, nao deletados)
    posts_result = (
        client.table('posts')
        .select('youtube_video_id, status, updated_at, youtube_deleted_at')
        .eq('user_id', user_id)
        .execute()
    )
    posts_pub = [
        p for p in (posts_result.data or [])
        if p.get('youtube_video_id') and not p.get('youtube_deleted_at')
    ]

    # Streaks: conta posts publicados nas janelas de 7/30/90 dias
    agora = datetime.now(timezone.utc)
    streak_7d = streak_30d = streak_90d = 0
    for p in posts_pub:
        ts_str = p.get('updated_at')
        if not ts_str:
            continue
        try:
            ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
        except Exception:
            continue
        delta = (agora - ts).days
        if delta <= 7:
            streak_7d += 1
        if delta <= 30:
            streak_30d += 1
        if delta <= 90:
            streak_90d += 1

    # Views totais e hit individual via YT Analytics (90 dias)
    # Se falhar (sem canal/scope/erro YT), defaults pra 0 e segue.
    views_total = 0
    best_beat_views = 0
    try:
        overview_raw = youtube_analytics.get_overview(user_id, '90d')
        parsed = youtube_analytics.parse_overview_row(overview_raw)
        views_total = int(parsed.get('views') or 0)
    except Exception as exc:
        logger.warning("achievements: falha em get_overview user=%s: %s", user_id, exc)

    try:
        top = youtube_analytics.get_top_beats(user_id, '90d', limite=1)
        rows = top.get('rows') or []
        if rows and len(rows[0]) >= 2:
            # row: [video_id, views, retention]
            best_beat_views = int(rows[0][1] or 0)
    except Exception as exc:
        logger.warning("achievements: falha em get_top_beats user=%s: %s", user_id, exc)

    return {
        'beats_total': len(posts_pub),
        'streak_7d': streak_7d,
        'streak_30d': streak_30d,
        'streak_90d': streak_90d,
        'views_total': views_total,
        'best_beat_views': best_beat_views,
        'secret': 0,  # secreta nao desbloqueia automaticamente
    }


def _get_unlocked(user_id: str) -> dict[str, str]:
    """Retorna {achievement_key: unlocked_at_iso} pro user."""
    client = get_admin_client()
    result = (
        client.table('user_achievements')
        .select('achievement_key, unlocked_at')
        .eq('user_id', user_id)
        .execute()
    )
    return {r['achievement_key']: r.get('unlocked_at') for r in (result.data or [])}


def _persist_unlock(user_id: str, key: str) -> None:
    """Insere row em user_achievements. Ignora se ja existir (race condition)."""
    client = get_admin_client()
    try:
        client.table('user_achievements').insert({
            'user_id': user_id,
            'achievement_key': key,
        }).execute()
        logger.info("[achievement] user=%s desbloqueou %s", user_id, key)
    except Exception as exc:
        # PK violation = ja desbloqueou em outra request concorrente. Tudo bem.
        logger.debug("achievements: skip insert (provavel duplicado) user=%s key=%s: %s", user_id, key, exc)
