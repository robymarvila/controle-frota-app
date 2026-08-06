-- Script opcional para adicionar colunas de segurança e auditoria na tabela 'usuarios' no Supabase
ALTER TABLE IF EXISTS public.usuarios 
ADD COLUMN IF NOT EXISTS precisa_trocar_senha BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
