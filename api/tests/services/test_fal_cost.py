"""Testes do calculo de custo real da fal.ai pelos tokens (T4.43).

`_cost_from_usage` converte o bloco `usage` da resposta do gpt-image-2 no
custo real em USD, usando a tabela de precos por token da fal.
"""

import pytest

from app.services.fal_service import _cost_from_usage


def test_custo_text_to_image_tipico():
    """Geracao text-to-image: so input de texto + output de imagem.

    540 tokens texto in  * $5/1M  = 0.002700
    272 tokens imagem out * $30/1M = 0.008160
    total = 0.010860 (bate com o ~$0.0111 do dashboard).
    """
    usage = {
        "input_tokens": 540,
        "input_tokens_details": {"text_tokens": 540, "image_tokens": 0},
        "output_tokens": 272,
        "output_tokens_details": {"text_tokens": 0, "image_tokens": 272},
        "total_tokens": 812,
    }
    assert _cost_from_usage(usage) == pytest.approx(0.01086)


def test_custo_inclui_todas_as_quatro_faixas():
    """Soma as 4 faixas (texto in/out + imagem in/out) corretamente."""
    usage = {
        "input_tokens_details": {"text_tokens": 100, "image_tokens": 200},
        "output_tokens_details": {"text_tokens": 50, "image_tokens": 300},
    }
    # 100*5e-6 + 200*8e-6 + 50*1e-5 + 300*3e-5
    # = 0.0005 + 0.0016 + 0.0005 + 0.009 = 0.0116
    assert _cost_from_usage(usage) == pytest.approx(0.0116)


def test_usage_none_retorna_none():
    """Sem usage -> None (caller usa o fallback fixo)."""
    assert _cost_from_usage(None) is None


def test_usage_nao_dict_retorna_none():
    assert _cost_from_usage("nope") is None


def test_usage_sem_details_nao_quebra():
    """usage presente mas sem details -> custo 0.0 (nao explode)."""
    assert _cost_from_usage({"input_tokens": 0, "output_tokens": 0}) == 0.0
