/*
  HISTORICO NAO EXECUTAVEL

  Este arquivo deixou de ser fonte de verdade executavel do Genius Support OS.
  Ele existe apenas como registro historico do blueprint inicial de modelagem.

  NAO aplicar este arquivo com psql, supabase db reset, supabase db push ou qualquer
  outro fluxo operacional. A fonte oficial de schema executavel esta em:

  - supabase/migrations/20260429210127_phase1_identity_tenancy.sql
  - supabase/migrations/20260429212721_phase1_1_hardening.sql
  - supabase/migrations/20260429215122_phase1_2_admin_control_plane.sql

  Regras:
  - migrations oficiais em supabase/migrations/ sao a source of truth;
  - testes pgTAP em supabase/tests/ validam o estado real;
  - qualquer nova evolucao deve nascer como migration versionada, nunca daqui.

  Se for necessario consultar a modelagem anterior, use o historico do Git.
*/
