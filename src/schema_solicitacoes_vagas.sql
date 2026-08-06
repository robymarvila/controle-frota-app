-- ==============================================================================
-- TABELAS PARA GERENCIAMENTO E SOLICITAÇÃO DE VAGAS AO RH (FORÇA DE TRABALHO)
-- ==============================================================================

-- Tabela de Cabeçalho do Protocolo de Solicitação de Vagas
CREATE TABLE IF NOT EXISTS solicitacoes_vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo VARCHAR(50) UNIQUE NOT NULL,
  nome_campanha VARCHAR(255) NOT NULL,
  observacao TEXT,
  tipo VARCHAR(20) DEFAULT 'REGULAR', -- 'REGULAR' ou 'SPOT'
  status VARCHAR(30) DEFAULT 'EM_ANDAMENTO', -- 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'
  total_vagas_solicitadas INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por VARCHAR(100)
);

-- Tabela de Itens da Solicitação de Vagas por Função/Comessa
CREATE TABLE IF NOT EXISTS solicitacoes_vagas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID REFERENCES solicitacoes_vagas(id) ON DELETE CASCADE,
  commessa VARCHAR(50) NOT NULL,
  base_ut VARCHAR(100),
  regional VARCHAR(100),
  funcao VARCHAR(150) NOT NULL,
  subgrupo VARCHAR(100),
  base_contrato VARCHAR(100),
  gap_recomendado INT DEFAULT 0,
  vagas_solicitadas INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Permissões RLS
ALTER TABLE solicitacoes_vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_vagas_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos os usuários autenticados e anon"
  ON solicitacoes_vagas FOR SELECT USING (true);

CREATE POLICY "Permitir insercao/atualizacao para todos em solicitacoes_vagas"
  ON solicitacoes_vagas FOR ALL USING (true);

CREATE POLICY "Permitir leitura para todos em solicitacoes_vagas_itens"
  ON solicitacoes_vagas_itens FOR SELECT USING (true);

CREATE POLICY "Permitir insercao/atualizacao em solicitacoes_vagas_itens"
  ON solicitacoes_vagas_itens FOR ALL USING (true);

GRANT ALL ON TABLE solicitacoes_vagas TO anon, authenticated;
GRANT ALL ON TABLE solicitacoes_vagas_itens TO anon, authenticated;
