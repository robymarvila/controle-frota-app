# Resumo da Implementação: Resolução de Horários Reais & Dimensionamento do Gantt (WFM)

### Objetivo Concluído:
Corrigido o elemento de **Início Real** (`//*[@id="root"]/div/main/div/div/div/div[3]/div/div[2]/div[2]/div[2]/div[2]`) e **Conclusão** (`//*[@id="root"]/div/main/div/div/div/div[3]/div/div[2]/div[2]/div[2]/div[3]`) no popover de detalhes e na timeline do WFM, integrando os dados de execução e calculando com exatidão o tempo real da atividade e o tamanho de cada card no Gantt.

---

### Diagnóstico & Causa Raiz:
1. **Múltiplas Tabelas de Execução no Supabase**:
   - Os dados de início e término real de uma atividade estão distribuídos entre as tabelas `autofiscalizacao_field_audits` (`start_time`, `end_time`), `autofiscalizacao_ordens` (`fisc_started_at`, `fisc_finished_at`), `autofiscalizacao_workflows` (`historico`), `autofiscalizacao_inspecoes` (`timestamp`) e `wfm_tarefas` (`planned_start`, `planned_end`, `payload_dados`).
   - O componente `WFMDespachoView.jsx` não estava consultando nem ouvindo o canal Realtime da tabela `autofiscalizacao_field_audits`, fazendo com que auditorias iniciadas e concluídas pelo aplicativo móvel ficassem sem os timestamps reais na visão do WFM.

---

### Alterações Realizadas:

1. **Assinatura Realtime e Merge de Dados (`src/components/WFMDespachoView.jsx`)**:
   - Adicionada a escuta em tempo real do canal `rt-af-field-audits` (`table: 'autofiscalizacao_field_audits'`).
   - Na função `fetchFieldAudits()`, os registros de `wfm_tarefas` e `autofiscalizacao_field_audits` agora são combinados, trazendo `start_time`, `end_time`, `fisc_started_at`, `fisc_finished_at`, `executed`, `photos` e logs de `historico`.
   - `transformTask` atualizado para propagar os timestamps reais para o objeto `os_data`.

2. **Algoritmo Centralizado de Resolução de Tempos (`getOSTimesAndStatus`)**:
   - Implementada a função `getOSTimesAndStatus` em `src/components/WFMScreen.jsx`, que cruza as 5 tabelas e busca os horários de início e término via colunas dedicadas e logs de eventos (`WFM_INICIADA`, `AUDITORIA_CAMPO_CONCLUIDA`, `AUDITORIA_CAMPO_SUSPENSA`, etc.).
   - Calcula a duração real executada (`executedDurationMins`) e o status normalizado (`completed`, `in_progress`, `suspended`, `pending`).

3. **Exibição dos Horários Reais no Popover (`ActionPopover`)**:
   - **Início Real**: Exibe o horário exato com precisão de segundos (`HH:mm:ss`) ou data se for em dia diferente.
   - **Conclusão**: Exibe o horário exato de término (`HH:mm:ss`) e o badge da duração real calculada (ex: `2m real`, `45m real`).
   - **Duração do Cabeçalho**: Apresenta a duração real quando a OS está finalizada, ou a duração prevista caso ainda não concluída.

4. **Dimensionamento Dinâmico no Gráfico de Gantt (`Timeline`)**:
   - As tarefas agora são ordenadas e posicionadas (`calcLeftPx`) considerando o horário real de início (`actualStart`).
   - A largura visual da barra (`wPx`) reflete a duração real executada (com largura mínima garantida de 28px para legibilidade) quando a OS foi concluída ou suspensa.
   - Para OS em andamento, o tamanho se expande dinamicamente com base no tempo decorrido desde o `realStart`.
   - O badge dentro do card exibe a duração real (ex: `2m`, `15m`, `60m`).
   - Prevenção inteligente de sobreposição visual (*anti-collision scheduling*).

5. **Sincronização nos Modais de Detalhes e Buckets**:
   - `ModalDetalhesOS.jsx` atualizado para buscar logs em tempo real também na tabela `autofiscalizacao_field_audits`.
   - Cards e linhas da tabela no **Bucket Selecionado** utilizam `getOSTimesAndStatus` para determinar o status fiel de cada OS (*Concluída*, *Em Andamento*, *Suspensa*, *Programada*, *Não Iniciada / Livre*).

---

### Verificação:
- **Build Local**: `npm run build` executado com sucesso (0 erros, 2434 módulos transformados).
- **Capacitor**: `npx cap sync` executado com sucesso (Android e Web atualizados).
- **Git Push**: Em conformidade com as diretrizes do projeto (`.agents/AGENTS.md`), **nenhum push para o GitHub foi realizado**.
