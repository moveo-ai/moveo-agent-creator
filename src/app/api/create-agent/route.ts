import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { join } from 'path';
import agenteModelo from '@/agente_modelo.json';

const BASE_URL = 'https://api.moveo.ai/api';

// Função para ler as guidelines do arquivo markdown
function loadGuidelinesFromMarkdown(): string {
  try {
    const guidelinesPath = join(process.cwd(), 'src', 'guidelines.md');
    const content = readFileSync(guidelinesPath, 'utf-8');

    // Remove o cabeçalho do arquivo (título e descrição)
    const lines = content.split('\n');
    const startIndex = lines.findIndex(line => line.startsWith('---'));

    if (startIndex !== -1) {
      // Retorna o conteúdo após o separador "---"
      return lines.slice(startIndex + 1).join('\n').trim();
    }

    return content;
  } catch (error) {
    console.warn('Erro ao ler guidelines.md, usando guidelines do JSON:', error);
    return agenteModelo.guidelines.custom_instructions;
  }
}

interface CreateAgentRequest {
  clientName: string;
  apiKey?: string;
  accountSlug?: string;
  fileId: string;
  observations?: string;
  moveoAccountOnly?: boolean;
}

interface WebhookIdMapping {
  [key: string]: string;
}

interface NodeIdMapping {
  [key: string]: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dialog = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Template = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Guidelines = any;

async function customizeGuidelinesWithOpenAI(
  baseGuidelines: Guidelines,
  observations: string,
  clientName: string
): Promise<{ guidelines: Guidelines; error?: string }> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  // Carrega as guidelines do markdown como base
  const markdownGuidelines = loadGuidelinesFromMarkdown();

  if (!openaiApiKey) {
    return {
      guidelines: { ...baseGuidelines, custom_instructions: markdownGuidelines },
      error: 'OPENAI_API_KEY não configurada - usando guidelines padrão',
    };
  }

  try {
    const prompt = `Você é um especialista em criar agentes de cobrança conversacionais.

Abaixo estão as instruções base (custom_instructions) de um agente de cobrança. O cliente "${clientName}" forneceu as seguintes observações para personalizar o agente:

OBSERVAÇÕES DO CLIENTE:
${observations}

INSTRUÇÕES BASE:
${markdownGuidelines}

Sua tarefa é modificar as instruções base incorporando as observações do cliente de forma natural e coerente. Mantenha a estrutura geral das instruções, mas adapte o conteúdo para refletir as necessidades específicas do cliente.

IMPORTANTE:
- Mantenha o formato markdown das instruções
- Preserve as seções principais (Roteiro, Negociação, Tom e Presença, etc.)
- Integre as observações de forma natural no texto
- Não adicione novas seções desnecessárias
- Mantenha o tom profissional e focado em cobrança

Retorne APENAS as instruções modificadas, sem explicações adicionais.`;

    console.log('=== OPENAI REQUEST ===');
    console.log('Prompt enviado para OpenAI:');
    console.log(prompt);
    console.log('======================');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em criar e adaptar agentes conversacionais de cobrança. Sua tarefa é modificar instruções existentes incorporando novas observações.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        guidelines: baseGuidelines,
        error: `Erro OpenAI: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    const customizedInstructions = result.choices?.[0]?.message?.content;

    console.log('=== OPENAI RESPONSE ===');
    console.log('Resposta da OpenAI:');
    console.log(customizedInstructions);
    console.log('=======================');

    if (!customizedInstructions) {
      return {
        guidelines: baseGuidelines,
        error: 'Resposta vazia da OpenAI - usando guidelines padrão',
      };
    }

    return {
      guidelines: {
        ...baseGuidelines,
        custom_instructions: customizedInstructions,
      },
    };
  } catch (error) {
    return {
      guidelines: baseGuidelines,
      error: `Erro ao chamar OpenAI: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    };
  }
}

function getHeaders(apiKey: string) {
  return {
    Authorization: `apikey ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function createBrain(
  apiKey: string,
  accountSlug: string,
  template: Template,
  clientName: string,
  customGuidelines?: Guidelines
): Promise<{ brainId: string | null; error?: string }> {
  const url = `${BASE_URL}/v1/brains?account_slug=${accountSlug}`;

  const guidelines = customGuidelines ? { ...customGuidelines } : { ...template.guidelines };

  // Se não houver guidelines customizadas (via OpenAI), usa o markdown como base
  if (!customGuidelines) {
    const markdownGuidelines = loadGuidelinesFromMarkdown();
    guidelines.custom_instructions = markdownGuidelines;
  }

  guidelines.name = clientName;
  delete guidelines.updated_at;
  delete guidelines.updated_by;

  const brainData = {
    name: `${clientName} Debt Collection`,
    description: `${clientName} Debt Collection`,
    language: template.language || 'pt-br',
    brain_type: template.brain_type || 'debt_collection',
    greeklish: template.greeklish || false,
    disambiguation: template.disambiguation || false,
    disambiguation_prompt: template.disambiguation_prompt || 'Você quis dizer:',
    disambiguation_options: template.disambiguation_options || 5,
    inactivity_timeout: template.inactivity_timeout || 86400,
    confidence_threshold: template.confidence_threshold || 0.45,
    guidelines,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(brainData),
  });

  if (response.ok) {
    const result = await response.json();
    return { brainId: result.brain_id };
  } else {
    const errorText = await response.text();
    return { brainId: null, error: `Erro ao criar brain: ${response.status} - ${errorText}` };
  }
}

async function createWebhooks(
  apiKey: string,
  accountSlug: string,
  brainId: string,
  template: Template,
  fileId: string
): Promise<{ mapping: WebhookIdMapping; errors: string[] }> {
  const url = `${BASE_URL}/v1/brains/${brainId}/webhooks?account_slug=${accountSlug}`;
  const webhookIdMapping: WebhookIdMapping = {};
  const errors: string[] = [];

  for (const webhook of template.webhooks || []) {
    const oldId = webhook.webhook_id;

    const headers = (webhook.headers || []).map((header: { name: string; value: string }) => {
      if (header.name === 'x-file-id') {
        return { name: header.name, value: fileId };
      }
      return { name: header.name, value: header.value };
    });

    const webhookData = {
      name: webhook.name,
      url: webhook.url,
      token: webhook.token || '1234',
      type: webhook.type || 'action',
      enabled: webhook.enabled ?? true,
      fail_on_error: webhook.fail_on_error || false,
      headers,
      test_schema: webhook.test_schema || {},
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(apiKey),
      body: JSON.stringify(webhookData),
    });

    if (response.ok) {
      const result = await response.json();
      webhookIdMapping[oldId] = result.webhook_id;
    } else {
      const errorText = await response.text();
      errors.push(`Webhook '${webhook.name}': ${response.status} - ${errorText}`);
    }
  }

  return { mapping: webhookIdMapping, errors };
}

async function createIntents(
  apiKey: string,
  accountSlug: string,
  brainId: string,
  template: Template
): Promise<{ errors: string[] }> {
  const url = `${BASE_URL}/v1/brains/${brainId}/intents?account_slug=${accountSlug}`;
  const errors: string[] = [];

  for (const intent of template.intents || []) {
    const intentData = {
      intent: intent.intent,
      description: intent.description || '',
      expressions: intent.expressions || [],
      collection: intent.collection || '',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(apiKey),
      body: JSON.stringify(intentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      errors.push(`Intent '${intent.intent}': ${response.status} - ${errorText}`);
    }
  }

  return { errors };
}

async function createInsights(
  apiKey: string,
  accountSlug: string,
  brainId: string,
  template: Template
): Promise<{ errors: string[] }> {
  const url = `${BASE_URL}/v1/brains/${brainId}/insights?account_slug=${accountSlug}`;
  const errors: string[] = [];

  for (const insight of template.insights || []) {
    const insightData = {
      name: insight.name,
      description: insight.description || '',
      type: insight.type || 'string',
      categories: insight.categories || [],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(apiKey),
      body: JSON.stringify(insightData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      errors.push(`Insight '${insight.name}': ${response.status} - ${errorText}`);
    }
  }

  return { errors };
}

function updateDialogWebhookIds(dialog: Dialog, webhookIdMapping: WebhookIdMapping): Dialog {
  const dialogCopy = JSON.parse(JSON.stringify(dialog));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateActions = (actions: any[]) => {
    for (const action of actions) {
      if (action.type === 'webhook' && action.webhook_id) {
        const oldId = action.webhook_id;
        if (webhookIdMapping[oldId]) {
          action.webhook_id = webhookIdMapping[oldId];
        }
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateNode = (node: any) => {
    if (node.actions) {
      updateActions(node.actions);
    }
    if (node.conditions) {
      for (const condition of node.conditions) {
        if (condition.actions) {
          updateActions(condition.actions);
        }
      }
    }
    if (node.requisites) {
      for (const requisite of node.requisites) {
        if (requisite.actions) {
          updateActions(requisite.actions);
        }
        if (requisite.reprompt) {
          updateActions(requisite.reprompt);
        }
      }
    }
  };

  for (const node of dialogCopy.nodes || []) {
    updateNode(node);
  }

  return dialogCopy;
}

function buildGlobalNodeIdMapping(dialogs: Dialog[]): NodeIdMapping {
  const nodeIdMapping: NodeIdMapping = {};

  for (const dialog of dialogs) {
    for (const node of dialog.nodes || []) {
      if (node.node_id && !nodeIdMapping[node.node_id]) {
        nodeIdMapping[node.node_id] = uuidv4();
      }
    }
  }

  return nodeIdMapping;
}

function applyIdMappingToDialog(dialog: Dialog, nodeIdMapping: NodeIdMapping): Dialog {
  const dialogCopy = JSON.parse(JSON.stringify(dialog));

  for (const node of dialogCopy.nodes || []) {
    if (node.node_id && nodeIdMapping[node.node_id]) {
      node.node_id = nodeIdMapping[node.node_id];
    }
  }

  for (const node of dialogCopy.nodes || []) {
    if (node.parent_id && nodeIdMapping[node.parent_id]) {
      node.parent_id = nodeIdMapping[node.parent_id];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateActionRefs = (actions: any[]) => {
      for (const action of actions) {
        if (action.action_id) {
          action.action_id = uuidv4();
        }
        if (action.trigger_node_id && nodeIdMapping[action.trigger_node_id]) {
          action.trigger_node_id = nodeIdMapping[action.trigger_node_id];
        }
      }
    };

    if (node.actions) {
      updateActionRefs(node.actions);
    }

    if (node.conditions) {
      for (const condition of node.conditions) {
        if (condition.condition_id) {
          condition.condition_id = uuidv4();
        }
        if (condition.actions) {
          updateActionRefs(condition.actions);
        }
        for (const rule of condition.rules || []) {
          if (rule.rule_id) {
            rule.rule_id = uuidv4();
          }
        }
      }
    }

    if (node.requisites) {
      for (const requisite of node.requisites) {
        if (requisite.requisite_id) {
          requisite.requisite_id = uuidv4();
        }
        if (requisite.actions) {
          updateActionRefs(requisite.actions);
        }
        if (requisite.reprompt) {
          updateActionRefs(requisite.reprompt);
        }
      }
    }
  }

  return dialogCopy;
}

function getDialogNodeIds(dialog: Dialog): Set<string> {
  const nodeIds = new Set<string>();
  for (const node of dialog.nodes || []) {
    if (node.node_id) {
      nodeIds.add(node.node_id);
    }
  }
  return nodeIds;
}

function getDialogExternalRefs(dialog: Dialog): Set<string> {
  const ownNodeIds = getDialogNodeIds(dialog);
  const externalRefs = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collectTriggerRefs = (actions: any[]) => {
    for (const action of actions) {
      if (action.trigger_node_id && !ownNodeIds.has(action.trigger_node_id)) {
        externalRefs.add(action.trigger_node_id);
      }
    }
  };

  for (const node of dialog.nodes || []) {
    if (node.actions) {
      collectTriggerRefs(node.actions);
    }
    if (node.conditions) {
      for (const condition of node.conditions) {
        if (condition.actions) {
          collectTriggerRefs(condition.actions);
        }
      }
    }
    if (node.requisites) {
      for (const requisite of node.requisites) {
        if (requisite.actions) {
          collectTriggerRefs(requisite.actions);
        }
      }
    }
  }

  return externalRefs;
}

function orderDialogsByDependency(dialogs: Dialog[]): Dialog[] {
  const nodeToDialog: { [key: string]: string } = {};
  for (const dialog of dialogs) {
    const dialogName = dialog.name;
    for (const nodeId of getDialogNodeIds(dialog)) {
      nodeToDialog[nodeId] = dialogName;
    }
  }

  const dialogDeps: { [key: string]: Set<string> } = {};
  for (const dialog of dialogs) {
    const dialogName = dialog.name;
    const deps = new Set<string>();
    for (const refId of getDialogExternalRefs(dialog)) {
      if (nodeToDialog[refId]) {
        const depDialog = nodeToDialog[refId];
        if (depDialog !== dialogName) {
          deps.add(depDialog);
        }
      }
    }
    dialogDeps[dialogName] = deps;
  }

  const ordered: Dialog[] = [];
  const remaining = new Map(dialogs.map((d) => [d.name, d]));

  while (remaining.size > 0) {
    const ready: string[] = [];
    for (const [name] of remaining) {
      const deps = dialogDeps[name] || new Set();
      const orderedNames = new Set(ordered.map((d) => d.name));
      const pendingDeps = new Set([...deps].filter((d) => !orderedNames.has(d)));
      if (pendingDeps.size === 0) {
        ready.push(name);
      }
    }

    if (ready.length === 0) {
      ready.push(...remaining.keys());
    }

    for (const name of ready) {
      const dialog = remaining.get(name);
      if (dialog) {
        ordered.push(dialog);
        remaining.delete(name);
      }
    }
  }

  return ordered;
}

function updateCompanyName(dialog: Dialog, clientName: string): Dialog {
  const dialogCopy = JSON.parse(JSON.stringify(dialog));

  for (const node of dialogCopy.nodes || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateActions = (actions: any[]) => {
      for (const action of actions) {
        if (action.type === 'set_variables' && action.variables) {
          for (const variable of action.variables) {
            if (variable.variable === 'company_name') {
              variable.value = clientName;
            }
          }
        }
      }
    };

    if (node.actions) {
      updateActions(node.actions);
    }
    if (node.conditions) {
      for (const condition of node.conditions) {
        if (condition.actions) {
          updateActions(condition.actions);
        }
      }
    }
    if (node.requisites) {
      for (const requisite of node.requisites) {
        if (requisite.actions) {
          updateActions(requisite.actions);
        }
      }
    }
  }

  return dialogCopy;
}

async function createDialogs(
  apiKey: string,
  accountSlug: string,
  brainId: string,
  template: Template,
  webhookIdMapping: WebhookIdMapping,
  clientName: string
): Promise<{ errors: string[] }> {
  const url = `${BASE_URL}/v1/brains/${brainId}/dialogs?account_slug=${accountSlug}`;
  const errors: string[] = [];

  let dialogs = orderDialogsByDependency(template.dialogs || []);
  const globalNodeIdMapping = buildGlobalNodeIdMapping(dialogs);

  for (let dialog of dialogs) {
    dialog = updateDialogWebhookIds(dialog, webhookIdMapping);
    dialog = applyIdMappingToDialog(dialog, globalNodeIdMapping);
    dialog = updateCompanyName(dialog, clientName);

    const dialogData = {
      name: dialog.name,
      description: dialog.description || '',
      collection: dialog.collection || '',
      nodes: dialog.nodes || [],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(apiKey),
      body: JSON.stringify(dialogData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      errors.push(`Dialog '${dialog.name}': ${response.status} - ${errorText}`);
    }
  }

  return { errors };
}

async function createEnvironment(
  apiKey: string,
  accountSlug: string,
  clientName: string
): Promise<{ deskId: string | null; error?: string }> {
  const url = `${BASE_URL}/v1/desks?account_slug=${accountSlug}`;

  const deskData = {
    name: `${clientName} - Debt Collection`,
    description: `Environment para ${clientName} Debt Collection`,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(deskData),
  });

  if (response.ok) {
    const result = await response.json();
    return { deskId: result.desk_id };
  } else {
    const errorText = await response.text();
    return { deskId: null, error: `Erro ao criar environment: ${response.status} - ${errorText}` };
  }
}

async function createDeskRule(
  apiKey: string,
  accountSlug: string,
  deskId: string,
  brainId: string,
  clientName: string
): Promise<{ ruleId: string | null; error?: string }> {
  const url = `${BASE_URL}/v1/desks/${deskId}/rules?account_slug=${accountSlug}`;

  const ruleData = {
    name: 'Default',
    description: '',
    status: 'active',
    position: 1,
    triggers: [
      { type: 'first_message' },
      { type: 'any_user_message' },
    ],
    condition: {
      operator: 'or',
      conditions: [],
    },
    actions: [
      {
        type: 'assign_brain',
        brain_version: 0,
        brain_parent_id: brainId,
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(ruleData),
  });

  if (response.ok) {
    const result = await response.json();
    return { ruleId: result.rule_id };
  } else {
    const errorText = await response.text();
    return { ruleId: null, error: `Erro ao criar regra: ${response.status} - ${errorText}` };
  }
}

async function createWebIntegration(
  apiKey: string,
  accountSlug: string,
  deskId: string
): Promise<{ integrationId: string | null; error?: string }> {
  const url = `${BASE_URL}/v1/desks/${deskId}/integrations?account_slug=${accountSlug}`;

  const integrationData = {
    type: 'web',
    name: 'web',
    active: true,
    config: {
      show_survey: true,
      show_powered_by: true,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(integrationData),
  });

  if (response.ok) {
    const result = await response.json();
    return { integrationId: result.integration_id };
  } else {
    const errorText = await response.text();
    return { integrationId: null, error: `Erro ao criar integração web: ${response.status} - ${errorText}` };
  }
}

// ============================================================================
// Função para criar agente na conta padrão da Moveo (apenas agente, sem environment)
// ============================================================================

async function createAgentOnMoveoDefaultAccount(
  clientName: string,
  fileId: string,
  customGuidelines?: Guidelines
): Promise<{ brainId: string | null; logs: string[]; errors: string[] }> {
  const moveoApiKey = process.env.MOVEO_DEFAULT_API_KEY;
  const moveoAccountSlug = process.env.MOVEO_DEFAULT_ACCOUNT_SLUG;

  const logs: string[] = [];
  const errors: string[] = [];

  if (!moveoApiKey || !moveoAccountSlug) {
    errors.push('Credenciais da conta Moveo padrão não configuradas');
    return { brainId: null, logs, errors };
  }

  logs.push('');
  logs.push('========================================');
  logs.push('  CRIANDO CÓPIA NA CONTA MOVEO-BR');
  logs.push('========================================');

  // 1. Create brain on Moveo account
  logs.push('Criando brain na conta Moveo...');
  const { brainId, error: brainError } = await createBrain(
    moveoApiKey,
    moveoAccountSlug,
    agenteModelo,
    clientName,
    customGuidelines
  );

  if (!brainId) {
    errors.push(`Moveo: ${brainError || 'Falha ao criar brain'}`);
    logs.push(`⚠ Erro ao criar brain na Moveo: ${brainError}`);
    return { brainId: null, logs, errors };
  }
  logs.push(`✓ Brain criado na Moveo! ID: ${brainId}`);

  // 2. Create webhooks on Moveo account
  logs.push('Criando webhooks na conta Moveo...');
  const { mapping: webhookIdMapping, errors: webhookErrors } = await createWebhooks(
    moveoApiKey,
    moveoAccountSlug,
    brainId,
    agenteModelo,
    fileId
  );
  if (webhookErrors.length > 0) {
    errors.push(...webhookErrors.map(e => `Moveo: ${e}`));
  }
  logs.push(`✓ Webhooks criados na Moveo (${Object.keys(webhookIdMapping).length})`);

  // 3. Create intents on Moveo account
  logs.push('Criando intents na conta Moveo...');
  const { errors: intentErrors } = await createIntents(
    moveoApiKey,
    moveoAccountSlug,
    brainId,
    agenteModelo
  );
  if (intentErrors.length > 0) {
    errors.push(...intentErrors.map(e => `Moveo: ${e}`));
  }
  logs.push(`✓ Intents criados na Moveo`);

  // 4. Create insights on Moveo account
  logs.push('Criando insights na conta Moveo...');
  const { errors: insightErrors } = await createInsights(
    moveoApiKey,
    moveoAccountSlug,
    brainId,
    agenteModelo
  );
  if (insightErrors.length > 0) {
    errors.push(...insightErrors.map(e => `Moveo: ${e}`));
  }
  logs.push(`✓ Insights criados na Moveo`);

  // 5. Create dialogs on Moveo account
  logs.push('Criando dialogs na conta Moveo...');
  const { errors: dialogErrors } = await createDialogs(
    moveoApiKey,
    moveoAccountSlug,
    brainId,
    agenteModelo,
    webhookIdMapping,
    clientName
  );
  if (dialogErrors.length > 0) {
    errors.push(...dialogErrors.map(e => `Moveo: ${e}`));
  }
  logs.push(`✓ Dialogs criados na Moveo`);

  logs.push(`✓ Agente criado com sucesso na conta Moveo-BR!`);

  return { brainId, logs, errors };
}

// ============================================================================
// Função para criar agente COMPLETO na conta padrão da Moveo (com environment)
// ============================================================================

async function createFullAgentOnMoveoAccount(
  clientName: string,
  fileId: string,
  customGuidelines?: Guidelines
): Promise<{
  brainId: string | null;
  deskId: string | null;
  integrationId: string | null;
  webChatUrl: string | null;
  logs: string[];
  errors: string[];
}> {
  const moveoApiKey = process.env.MOVEO_DEFAULT_API_KEY;
  const moveoAccountSlug = process.env.MOVEO_DEFAULT_ACCOUNT_SLUG;

  const logs: string[] = [];
  const errors: string[] = [];

  if (!moveoApiKey || !moveoAccountSlug) {
    errors.push('Credenciais da conta Moveo padrão não configuradas');
    return { brainId: null, deskId: null, integrationId: null, webChatUrl: null, logs, errors };
  }

  logs.push('========================================');
  logs.push('  CRIANDO AGENTE NA CONTA MOVEO-BR');
  logs.push('========================================');
  logs.push('');

  // 1. Create brain
  logs.push('Criando brain...');
  const { brainId, error: brainError } = await createBrain(
    moveoApiKey,
    moveoAccountSlug,
    agenteModelo,
    clientName,
    customGuidelines
  );

  if (!brainId) {
    errors.push(brainError || 'Falha ao criar brain');
    logs.push(`⚠ Erro ao criar brain: ${brainError}`);
    return { brainId: null, deskId: null, integrationId: null, webChatUrl: null, logs, errors };
  }
  logs.push(`✓ Brain criado com sucesso! ID: ${brainId}`);

  // 2. Create webhooks
  logs.push('Criando webhooks...');
  const { mapping: webhookIdMapping, errors: webhookErrors } = await createWebhooks(
    moveoApiKey,
    moveoAccountSlug,
    brainId,
    agenteModelo,
    fileId
  );
  if (webhookErrors.length > 0) {
    errors.push(...webhookErrors);
  }
  logs.push(`✓ Webhooks criados (${Object.keys(webhookIdMapping).length})`);

  // 3. Create intents
  logs.push('Criando intents...');
  const { errors: intentErrors } = await createIntents(
    moveoApiKey,
    moveoAccountSlug,
    brainId,
    agenteModelo
  );
  if (intentErrors.length > 0) {
    errors.push(...intentErrors);
  }
  logs.push(`✓ Intents criados`);

  // 4. Create insights
  logs.push('Criando insights...');
  const { errors: insightErrors } = await createInsights(
    moveoApiKey,
    moveoAccountSlug,
    brainId,
    agenteModelo
  );
  if (insightErrors.length > 0) {
    errors.push(...insightErrors);
  }
  logs.push(`✓ Insights criados`);

  // 5. Create dialogs
  logs.push('Criando dialogs...');
  const { errors: dialogErrors } = await createDialogs(
    moveoApiKey,
    moveoAccountSlug,
    brainId,
    agenteModelo,
    webhookIdMapping,
    clientName
  );
  if (dialogErrors.length > 0) {
    errors.push(...dialogErrors);
  }
  logs.push(`✓ Dialogs criados`);

  // 6. Create environment (desk)
  logs.push('Criando environment (desk)...');
  const { deskId, error: deskError } = await createEnvironment(
    moveoApiKey,
    moveoAccountSlug,
    clientName
  );

  let integrationId: string | null = null;

  if (!deskId) {
    errors.push(deskError || 'Falha ao criar environment');
    logs.push(`⚠ Erro ao criar environment: ${deskError}`);
  } else {
    logs.push(`✓ Environment criado com sucesso! ID: ${deskId}`);

    // 7. Create rule in desk
    logs.push('Criando regra no desk...');
    const { ruleId, error: ruleError } = await createDeskRule(
      moveoApiKey,
      moveoAccountSlug,
      deskId,
      brainId,
      clientName
    );

    if (!ruleId) {
      errors.push(ruleError || 'Falha ao criar regra');
      logs.push(`⚠ Erro ao criar regra: ${ruleError}`);
    } else {
      logs.push(`✓ Regra criada com sucesso! ID: ${ruleId}`);
    }

    // 8. Create web integration
    logs.push('Criando integração web...');
    const integrationResult = await createWebIntegration(
      moveoApiKey,
      moveoAccountSlug,
      deskId
    );
    integrationId = integrationResult.integrationId;

    if (!integrationId) {
      errors.push(integrationResult.error || 'Falha ao criar integração web');
      logs.push(`⚠ Erro ao criar integração web: ${integrationResult.error}`);
    } else {
      logs.push(`✓ Integração web criada com sucesso! ID: ${integrationId}`);
    }
  }

  const webChatUrl = integrationId
    ? `https://web.moveo.ai/preview/?integrationId=${integrationId}&version=v2`
    : null;

  logs.push('');
  logs.push('========================================');
  logs.push('          CONCLUÍDO!');
  logs.push('========================================');
  logs.push(`Agente criado com sucesso na conta Moveo-BR!`);
  if (webChatUrl) {
    logs.push(`WebChat URL: ${webChatUrl}`);
  }

  return { brainId, deskId, integrationId, webChatUrl, logs, errors };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAgentRequest = await request.json();
    const { clientName, apiKey, accountSlug, fileId, observations, moveoAccountOnly } = body;

    // Validação: quando moveoAccountOnly, não precisa de apiKey e accountSlug
    if (!clientName || !fileId) {
      return NextResponse.json(
        { success: false, error: 'Nome da empresa e File ID são obrigatórios' },
        { status: 400 }
      );
    }

    if (!moveoAccountOnly && (!apiKey || !accountSlug)) {
      return NextResponse.json(
        { success: false, error: 'API Key e Account Slug são obrigatórios quando não está criando apenas na conta Moveo' },
        { status: 400 }
      );
    }

    const logs: string[] = [];
    const allErrors: string[] = [];

    logs.push('Iniciando criação do agente...');
    logs.push(`Google Sheet File ID: ${fileId}`);

    // ==========================================================================
    // MODO: Criar apenas na conta Moveo (moveoAccountOnly = true)
    // ==========================================================================
    if (moveoAccountOnly) {
      logs.push('Modo: Criar APENAS na conta Moveo-BR');
      logs.push('');

      // Customize guidelines with OpenAI if observations provided
      let customGuidelines: Guidelines | undefined;
      if (observations && observations.trim()) {
        logs.push('Personalizando guidelines com IA...');
        const { guidelines, error: openaiError } = await customizeGuidelinesWithOpenAI(
          agenteModelo.guidelines,
          observations,
          clientName
        );
        customGuidelines = guidelines;
        if (openaiError) {
          allErrors.push(openaiError);
          logs.push(`⚠ ${openaiError}`);
        } else {
          logs.push('✓ Guidelines personalizadas com sucesso!');
        }
      }

      // Criar agente completo na conta Moveo
      const result = await createFullAgentOnMoveoAccount(clientName, fileId, customGuidelines);

      logs.push(...result.logs);
      if (result.errors.length > 0) {
        allErrors.push(...result.errors);
      }

      return NextResponse.json({
        success: !!result.brainId,
        brainId: result.brainId || undefined,
        fileId,
        deskId: result.deskId || undefined,
        integrationId: result.integrationId || undefined,
        webChatUrl: result.webChatUrl || undefined,
        logs,
        errors: allErrors.length > 0 ? allErrors : undefined,
      });
    }

    // ==========================================================================
    // MODO NORMAL: Criar na conta do cliente + cópia na Moveo
    // ==========================================================================
    logs.push('Modo: Criar na conta do cliente + cópia na Moveo-BR');
    logs.push('');

    // 0. Customize guidelines with OpenAI if observations provided
    let customGuidelines: Guidelines | undefined;
    if (observations && observations.trim()) {
      logs.push('Personalizando guidelines com IA...');
      const { guidelines, error: openaiError } = await customizeGuidelinesWithOpenAI(
        agenteModelo.guidelines,
        observations,
        clientName
      );
      customGuidelines = guidelines;
      if (openaiError) {
        allErrors.push(openaiError);
        logs.push(`⚠ ${openaiError}`);
      } else {
        logs.push('✓ Guidelines personalizadas com sucesso!');
      }
    }

    // 1. Create brain
    logs.push('Criando brain...');
    const { brainId, error: brainError } = await createBrain(apiKey!, accountSlug!, agenteModelo, clientName, customGuidelines);

    if (!brainId) {
      return NextResponse.json(
        { success: false, error: brainError || 'Falha ao criar brain', logs },
        { status: 500 }
      );
    }
    logs.push(`✓ Brain criado com sucesso! ID: ${brainId}`);

    // 2. Create webhooks
    logs.push('Criando webhooks...');
    const { mapping: webhookIdMapping, errors: webhookErrors } = await createWebhooks(
      apiKey!,
      accountSlug!,
      brainId,
      agenteModelo,
      fileId
    );
    if (webhookErrors.length > 0) {
      allErrors.push(...webhookErrors);
    }
    logs.push(`✓ Webhooks criados (${Object.keys(webhookIdMapping).length} de ${agenteModelo.webhooks?.length || 0})`);

    // 3. Create intents
    logs.push('Criando intents...');
    const { errors: intentErrors } = await createIntents(apiKey!, accountSlug!, brainId, agenteModelo);
    if (intentErrors.length > 0) {
      allErrors.push(...intentErrors);
    }
    logs.push(`✓ Intents criados`);

    // 4. Create insights
    logs.push('Criando insights...');
    const { errors: insightErrors } = await createInsights(apiKey!, accountSlug!, brainId, agenteModelo);
    if (insightErrors.length > 0) {
      allErrors.push(...insightErrors);
    }
    logs.push(`✓ Insights criados`);

    // 5. Create dialogs
    logs.push('Criando dialogs...');
    const { errors: dialogErrors } = await createDialogs(
      apiKey!,
      accountSlug!,
      brainId,
      agenteModelo,
      webhookIdMapping,
      clientName
    );
    if (dialogErrors.length > 0) {
      allErrors.push(...dialogErrors);
    }
    logs.push(`✓ Dialogs criados`);

    // 6. Create environment (desk)
    logs.push('Criando environment (desk)...');
    const { deskId, error: deskError } = await createEnvironment(apiKey!, accountSlug!, clientName);

    let integrationId: string | null = null;

    if (!deskId) {
      allErrors.push(deskError || 'Falha ao criar environment');
      logs.push(`⚠ Erro ao criar environment: ${deskError}`);
    } else {
      logs.push(`✓ Environment criado com sucesso! ID: ${deskId}`);

      // 7. Create rule in desk
      logs.push('Criando regra no desk...');
      const { ruleId, error: ruleError } = await createDeskRule(apiKey!, accountSlug!, deskId, brainId, clientName);

      if (!ruleId) {
        allErrors.push(ruleError || 'Falha ao criar regra');
        logs.push(`⚠ Erro ao criar regra: ${ruleError}`);
      } else {
        logs.push(`✓ Regra criada com sucesso! ID: ${ruleId}`);
      }

      // 8. Create web integration
      logs.push('Criando integração web...');
      const integrationResult = await createWebIntegration(apiKey!, accountSlug!, deskId);
      integrationId = integrationResult.integrationId;

      if (!integrationId) {
        allErrors.push(integrationResult.error || 'Falha ao criar integração web');
        logs.push(`⚠ Erro ao criar integração web: ${integrationResult.error}`);
      } else {
        logs.push(`✓ Integração web criada com sucesso! ID: ${integrationId}`);
      }
    }

    // Generate links
    const webChatUrl = integrationId
      ? `https://web.moveo.ai/preview/?integrationId=${integrationId}&version=v2`
      : undefined;

    logs.push('');
    logs.push('========================================');
    logs.push('  AGENTE DO CLIENTE CONCLUÍDO!');
    logs.push('========================================');
    logs.push(`Agente criado com sucesso na conta do cliente!`);
    if (webChatUrl) {
      logs.push(`WebChat URL: ${webChatUrl}`);
    }

    // ========================================================================
    // Criar cópia do agente na conta padrão da Moveo
    // ========================================================================
    const {
      brainId: moveoBrainId,
      logs: moveoLogs,
      errors: moveoErrors,
    } = await createAgentOnMoveoDefaultAccount(clientName, fileId, customGuidelines);

    // Adiciona logs e erros da criação na conta Moveo
    logs.push(...moveoLogs);
    if (moveoErrors.length > 0) {
      allErrors.push(...moveoErrors);
    }

    logs.push('');
    logs.push('========================================');
    logs.push('          PROCESSO FINALIZADO!');
    logs.push('========================================');

    return NextResponse.json({
      success: true,
      brainId,
      fileId,
      deskId: deskId || undefined,
      integrationId: integrationId || undefined,
      webChatUrl,
      moveoBrainId: moveoBrainId || undefined,
      logs,
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
