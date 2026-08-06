-- ==============================================================================
-- 1. GARANTE COLUNAS DE GPS EM AUTOFISCALIZACAO_SHIFTS (SE NÃO EXISTIREM)
-- ==============================================================================
ALTER TABLE IF EXISTS public.autofiscalizacao_shifts 
ADD COLUMN IF NOT EXISTS gps_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_last_update TIMESTAMPTZ;

-- ==============================================================================
-- 2. CRIAÇÃO DA TABELA DE TELEMETRIA GPS HISTÓRICA DOS AUDITORES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.autofiscalizacao_gps_logs (
    id BIGSERIAL PRIMARY KEY,
    shift_id UUID REFERENCES public.autofiscalizacao_shifts(id) ON DELETE CASCADE,
    auditor TEXT NOT NULL,
    date DATE NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    battery_level NUMERIC,
    is_moving BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. ÍNDICES DE ALTA PERFORMANCE PARA O MAPA WFM
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_gps_logs_auditor_date ON public.autofiscalizacao_gps_logs(auditor, date);
CREATE INDEX IF NOT EXISTS idx_gps_logs_shift_id ON public.autofiscalizacao_gps_logs(shift_id);
CREATE INDEX IF NOT EXISTS idx_gps_logs_created_at ON public.autofiscalizacao_gps_logs(created_at);

-- ==============================================================================
-- 4. POLÍTICAS DE ACESSO (ROW LEVEL SECURITY)
-- ==============================================================================
ALTER TABLE public.autofiscalizacao_gps_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de gps logs para todos" ON public.autofiscalizacao_gps_logs;
CREATE POLICY "Permitir leitura de gps logs para todos" 
ON public.autofiscalizacao_gps_logs 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de gps logs para todos" ON public.autofiscalizacao_gps_logs;
CREATE POLICY "Permitir insercao de gps logs para todos" 
ON public.autofiscalizacao_gps_logs 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao de gps logs para todos" ON public.autofiscalizacao_gps_logs;
CREATE POLICY "Permitir atualizacao de gps logs para todos" 
ON public.autofiscalizacao_gps_logs 
FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de gps logs para todos" ON public.autofiscalizacao_gps_logs;
CREATE POLICY "Permitir exclusao de gps logs para todos" 
ON public.autofiscalizacao_gps_logs 
FOR DELETE 
USING (true);
