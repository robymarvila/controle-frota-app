-- ==============================================================================
-- TABELA E POLÍTICAS PARA CADASTRO DE OFICINAS DE DESTINO (SISTEMA DE FROTA)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS cadastro_oficinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'Ativo', -- 'Ativo', 'Inativo', 'Bloqueado', 'Pré-Cadastro'
  tipo_documento VARCHAR(10) DEFAULT 'CNPJ', -- 'CNPJ' ou 'CPF'
  documento VARCHAR(20),
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255) NOT NULL,
  cep VARCHAR(10),
  logradouro VARCHAR(255),
  numero VARCHAR(30),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  contato_nome VARCHAR(150),
  contato_telefone VARCHAR(30),
  contato_email VARCHAR(150),
  servicos_prestados TEXT[] DEFAULT '{}',
  outros_servicos TEXT,
  is_pre_cadastro BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE cadastro_oficinas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permissivas para leitura e gravação
CREATE POLICY "Permitir leitura para todos em cadastro_oficinas"
  ON cadastro_oficinas FOR SELECT USING (true);

CREATE POLICY "Permitir inserção e atualização em cadastro_oficinas"
  ON cadastro_oficinas FOR ALL USING (true);

GRANT ALL ON TABLE cadastro_oficinas TO anon, authenticated;
