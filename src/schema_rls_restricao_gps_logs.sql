-- ============================================================================
-- SQL DE REFERÊNCIA: Restrição de RLS para autofiscalizacao_gps_logs
-- ============================================================================
-- ATENÇÃO: Execute este SQL no Supabase Dashboard (SQL Editor)
-- Este arquivo NÃO é executado automaticamente, é apenas referência.
-- ============================================================================

-- 1. Remover policies permissivas atuais
DROP POLICY IF EXISTS "Permitir leitura de gps logs para todos" ON public.autofiscalizacao_gps_logs;
DROP POLICY IF EXISTS "Permitir insercao de gps logs para todos" ON public.autofiscalizacao_gps_logs;
DROP POLICY IF EXISTS "Permitir atualizacao de gps logs para todos" ON public.autofiscalizacao_gps_logs;
DROP POLICY IF EXISTS "Permitir exclusao de gps logs para todos" ON public.autofiscalizacao_gps_logs;

-- 2. Criar policies restritivas

-- SELECT: Manter aberto para leitura (o WFM desktop precisa ler os logs GPS dos auditores)
-- Se quiser restringir a apenas administradores, substituir USING (true) por uma verificação de perfil
CREATE POLICY "Permitir leitura de gps logs para todos"
ON public.autofiscalizacao_gps_logs
FOR SELECT
USING (true);

-- INSERT: Manter aberto para inserção (os auditores precisam inserir pontos GPS)
CREATE POLICY "Permitir insercao de gps logs para todos"
ON public.autofiscalizacao_gps_logs
FOR INSERT
WITH CHECK (true);

-- UPDATE: BLOQUEADO — Logs GPS são imutáveis (integridade da trilha de auditoria)
-- Nenhuma policy de UPDATE = UPDATE bloqueado por padrão pelo RLS

-- DELETE: BLOQUEADO — Logs GPS não podem ser deletados (integridade da trilha de auditoria)
-- Nenhuma policy de DELETE = DELETE bloqueado por padrão pelo RLS

-- ============================================================================
-- RESULTADO: 
-- ✅ SELECT: Permitido (para o WFM desktop visualizar no mapa)
-- ✅ INSERT: Permitido (para os auditores enviarem GPS)
-- ❌ UPDATE: Bloqueado pelo RLS (logs são imutáveis)
-- ❌ DELETE: Bloqueado pelo RLS (logs não podem ser removidos)
-- ============================================================================
