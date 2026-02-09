import { NextRequest, NextResponse } from 'next/server';

interface ClientFormData {
  companyName: string;
  businessModel: string;
  creditorType: string;
  estimatedAIUsage: string;
  debtNature: string;
  monthlyVolume: string;
  portfolioMovement: string;
  debtAge: string;
  teamSize: string;
  conversionRate: string;
  currentChannels: string;
  whatsappApi: string;
  metaBusinessStatus: string;
  accountIssues: string;
  currentCollectionModel: string;
  costPerAgreement: string;
  debtCalculation: string;
  discountAutonomy: string;
  segmentation: string;
  crmSystem: string;
  primaryKPI: string;
  additionalNotes: string;
}

const LABELS: Record<string, string> = {
  // Business Model
  carteira_propria: 'Cobra carteira própria',
  bpo: 'Presta serviço para terceiros/BPO',
  taxa_sucesso: 'Atua por taxa de sucesso',
  compra_carteira: 'Compra de carteira',
  misto: 'Modelo misto',
  // Creditor Type
  mono: 'Monocredor (apenas 1 credor)',
  multi: 'Multicredor (mais de 1 credor)',
  // Debt Nature
  varejo: 'Varejo',
  bancario: 'Bancário',
  educacao: 'Educação',
  telecom: 'Telecom',
  saude: 'Saúde',
  outros: 'Outros',
  // Portfolio Movement
  alta: 'Alta movimentação (entrada constante)',
  media: 'Média movimentação',
  baixa: 'Baixa movimentação',
  fechada: 'Carteira fechada (sem novas entradas)',
  // Debt Age
  curta: 'Faixas curtas / Recuperação imediata (até 90 dias)',
  longa: 'Dívidas antigas (+360 dias)',
  // Current Channels
  whatsapp_api: 'WhatsApp com API oficial',
  whatsapp_sem_api: 'WhatsApp sem API oficial',
  sms: 'SMS',
  telefone: 'Apenas telefone',
  email: 'E-mail',
  multicanal: 'Multicanal',
  // WhatsApp API
  sim: 'Sim, já utiliza',
  nao: 'Não utiliza',
  planejando: 'Planejando implementar',
  // Meta Business Status
  ativo: 'Conta ativa e em dia',
  pendente: 'Conta com pendências',
  nao_possui: 'Não possui conta',
  // Account Issues
  nenhum: 'Nenhum problema',
  restrita: 'Conta restrita no passado',
  banido: 'Número banido anteriormente',
  ambos: 'Ambos os problemas',
  // Current Collection Model
  humano: 'Todo processo é humano',
  broadcast: 'Disparador de mensagens (broadcast)',
  chatbot_arvore: 'Chatbot com árvore de decisão',
  // Debt Calculation
  diario: 'Atualização diária',
  mensal: 'Atualização mensal',
  fixo: 'Valor fixo (sem atualização)',
  sob_demanda: 'Atualização sob demanda',
  // Discount Autonomy
  progressivo: 'IA pode oferecer descontos progressivos dentro de margem',
  aprovacao: 'Necessita aprovação humana para descontos',
  sem_desconto: 'Não trabalha com descontos',
  // Segmentation
  padronizado: 'Réguas padronizadas por carteira',
  perfil: 'Variam por perfil de devedor',
  sem_segmentacao: 'Sem segmentação definida',
  // Primary KPI
  cpc: 'Aumentar o CPC (Contato com a Pessoa Certa)',
  custo: 'Reduzir o custo da operação humana',
  cobertura: 'Aumentar a cobertura da base',
  conversao: 'Aumentar taxa de conversão',
  tempo: 'Reduzir tempo de recuperação',
};

function getLabel(value: string): string {
  return LABELS[value] || value || 'Não informado';
}

function formatIssueDescription(data: ClientFormData): string {
  return `# Novo Cliente - ${data.companyName}

## 1. Perfil e Modelo de Negócio

| Campo | Valor |
|-------|-------|
| **Nome da Empresa** | ${data.companyName || 'Não informado'} |
| **Modelo de Atuação** | ${getLabel(data.businessModel)} |
| **Tipo de Credor** | ${getLabel(data.creditorType)} |
| **Estimativa de Uso de IA** | ${data.estimatedAIUsage || 'Não informado'} |
| **Natureza da Dívida** | ${getLabel(data.debtNature)} |

---

## 2. Volume e Demanda

| Campo | Valor |
|-------|-------|
| **Volume Mensal** | ${data.monthlyVolume || 'Não informado'} |
| **Movimentação da Carteira** | ${getLabel(data.portfolioMovement)} |
| **Idade da Dívida (Foco)** | ${getLabel(data.debtAge)} |
| **Tamanho do Time** | ${data.teamSize || 'Não informado'} |
| **Taxa de Efetividade** | ${data.conversionRate || 'Não informado'} |

---

## 3. Maturidade Digital e Canais

| Campo | Valor |
|-------|-------|
| **Canais Atuais** | ${getLabel(data.currentChannels)} |
| **WhatsApp API Oficial** | ${getLabel(data.whatsappApi)} |
| **Status Meta Business** | ${getLabel(data.metaBusinessStatus)} |
| **Problemas com Conta** | ${getLabel(data.accountIssues)} |
| **Modelo de Cobrança Atual** | ${getLabel(data.currentCollectionModel)} |
| **Custo por Acordo** | ${data.costPerAgreement || 'Não informado'} |

---

## 4. Regras de Negócio

| Campo | Valor |
|-------|-------|
| **Cálculo da Dívida** | ${getLabel(data.debtCalculation)} |
| **Autonomia para Descontos** | ${getLabel(data.discountAutonomy)} |
| **Segmentação (Clusters)** | ${getLabel(data.segmentation)} |
| **CRM/Sistema de Gestão** | ${data.crmSystem || 'Não informado'} |

---

## 5. Visão de Sucesso

| Campo | Valor |
|-------|-------|
| **Principal KPI** | ${getLabel(data.primaryKPI)} |

${data.additionalNotes ? `### Observações Adicionais\n${data.additionalNotes}` : ''}

---
*Issue criada automaticamente via Moveo Agent Platform*`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ClientFormData = await request.json();

    const linearApiKey = process.env.LINEAR_API_KEY;
    const linearTeamId = process.env.LINEAR_TEAM_ID;

    if (!linearApiKey || !linearTeamId) {
      return NextResponse.json(
        { success: false, error: 'Credenciais do Linear não configuradas' },
        { status: 500 }
      );
    }

    if (!body.companyName) {
      return NextResponse.json(
        { success: false, error: 'Nome da empresa é obrigatório' },
        { status: 400 }
      );
    }

    const issueTitle = `[Novo Cliente] ${body.companyName}`;
    const issueDescription = formatIssueDescription(body);

    // Due date: 7 dias a partir de hoje
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateString = dueDate.toISOString().split('T')[0]; // formato YYYY-MM-DD

    const mutation = `
      mutation CreateIssue($title: String!, $description: String!, $teamId: String!, $projectId: String!, $dueDate: TimelessDate!) {
        issueCreate(input: {
          title: $title
          description: $description
          teamId: $teamId
          projectId: $projectId
          dueDate: $dueDate
        }) {
          success
          issue {
            id
            identifier
            url
          }
        }
      }
    `;

    const requestPayload = {
      query: mutation,
      variables: {
        title: issueTitle,
        description: issueDescription,
        teamId: linearTeamId,
        projectId: '9195c96d-3691-44fe-aeed-d6bfd568e25e', // Sales BR
        dueDate: dueDateString,
      },
    };

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: linearApiKey,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Linear API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `Erro na API do Linear: ${response.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const result = await response.json();

    if (result.errors) {
      console.error('Linear GraphQL errors:', result.errors);
      return NextResponse.json(
        { success: false, error: result.errors[0]?.message || 'Erro ao criar issue' },
        { status: 500 }
      );
    }

    if (!result.data?.issueCreate?.success) {
      return NextResponse.json(
        { success: false, error: 'Falha ao criar issue no Linear' },
        { status: 500 }
      );
    }

    const issue = result.data.issueCreate.issue;

    return NextResponse.json({
      success: true,
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      issueUrl: issue.url,
    });
  } catch (error) {
    console.error('Error creating Linear issue:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
