-- T4.13: primeira capa do wizard de onboarding e gratuita (nao consome credito)
-- ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md
-- Worker generate_covers pula consume() se has_generated_first_cover = false,
-- e atualiza pra true apos primeira capa entregue com sucesso.
-- Padrao SaaS (Canva, Loomly) — resolve dilema do tier free com 3 creditos
-- nao poder gastar 1/3 so pra ver resultado do setup.

alter table user_profiles add column has_generated_first_cover boolean not null default false;
