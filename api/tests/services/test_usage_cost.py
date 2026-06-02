"""Testes do calculo de custo do usage_tracker, com foco no prompt caching (T4.45).

`_calculate_cost` soma os tres baldes de input do Claude sem dupla contagem:
input normal + cache write (1.25x) + cache read (0.1x), mais o output. Antes da
T4.45 os baldes de cache eram ignorados e o custo do Claude da capa ficava
subestimado (sumia o custo de gravar o system prompt de ~4k tokens no cache).

Precos Claude Sonnet 4.6: input $3/1M, output $15/1M.
  cache write = 3 * 1.25 = $3.75/1M | cache read = 3 * 0.10 = $0.30/1M
"""

import pytest

from app.services.usage_tracker import _calculate_cost


def test_sem_cache_so_input_e_output():
    """Chamada sem caching (ex.: Claude de texto): so input + output.

    1000 in * $3/1M + 500 out * $15/1M = 0.003000 + 0.007500 = 0.0105
    """
    assert _calculate_cost("claude_sonnet_4_6", 1000, 500) == pytest.approx(0.0105)


def test_cache_write_primeira_capa_fria():
    """1a capa do lote: grava o system prompt no cache (balde write, 1.25x).

    300 in * $3/1M       = 0.000900
    4000 write * $3.75/1M = 0.015000
    300 out * $15/1M      = 0.004500
    total                = 0.020400  (~$0.020 do lado Claude)
    """
    cost = _calculate_cost(
        "claude_sonnet_4_6", tokens_in=300, tokens_out=300, cache_write=4000
    )
    assert cost == pytest.approx(0.0204)


def test_cache_read_capas_quentes():
    """Capas seguintes (<5min): le o system prompt do cache (balde read, 0.1x).

    300 in * $3/1M      = 0.000900
    4000 read * $0.30/1M = 0.001200
    300 out * $15/1M     = 0.004500
    total               = 0.006600  (~$0.007 do lado Claude, 3x mais barato)
    """
    cost = _calculate_cost(
        "claude_sonnet_4_6", tokens_in=300, tokens_out=300, cache_read=4000
    )
    assert cost == pytest.approx(0.0066)


def test_ignorar_cache_subestima_o_custo():
    """Regressao: prova que o cache importa. Mesmos tokens, com e sem o cache write.

    Sem somar o cache (comportamento antigo) o custo da 1a capa cai de
    $0.0204 pra $0.0054 -- some quase 3/4 do custo do lado Claude.
    """
    com_cache = _calculate_cost(
        "claude_sonnet_4_6", tokens_in=300, tokens_out=300, cache_write=4000
    )
    sem_cache = _calculate_cost("claude_sonnet_4_6", tokens_in=300, tokens_out=300)
    assert com_cache > sem_cache
    assert sem_cache == pytest.approx(0.0054)


def test_feature_flat_ignora_cache():
    """Feature com flat_usd (fal) retorna o valor fixo, sem olhar tokens/cache."""
    cost = _calculate_cost(
        "fal_gpt_image_2", tokens_in=999, tokens_out=999, cache_write=999
    )
    assert cost == pytest.approx(0.0111)


def test_feature_desconhecida_retorna_zero():
    """Feature fora do PRICING -> 0.0 (e loga warning), nao explode."""
    assert _calculate_cost("modelo_inexistente", 100, 100, cache_read=100) == 0.0


def test_cache_none_equivale_a_sem_cache():
    """Passar cache=None nao muda nada vs nao passar (back-compat dos callers antigos)."""
    com_none = _calculate_cost(
        "claude_sonnet_4_6", 1000, 500, cache_read=None, cache_write=None
    )
    sem = _calculate_cost("claude_sonnet_4_6", 1000, 500)
    assert com_none == sem == pytest.approx(0.0105)
