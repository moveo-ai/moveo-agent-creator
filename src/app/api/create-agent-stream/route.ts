import { NextRequest } from 'next/server';
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
    const lines = content.split('\n');
    const startIndex = lines.findIndex(line => line.startsWith('---'));
    if (startIndex !== -1) {
      return lines.slice(startIndex + 1).join('\n').trim();
    }
    return content;
  } catch {
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

// Helper to send SSE message
function createSSEMessage(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, ...data as object })}\n\n`;
}

function getHeaders(apiKey: string) {
  return {
    Authorization: `apikey ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function customizeGuidelinesWithOpenAI(
  baseGuidelines: Guidelines,
  observations: string,
  clientName: string
): Promise<{ guidelines: Guidelines; error?: string }> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
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
            content: 'Você é um especialista em criar e adaptar agentes conversacionais de cobrança.',
          },
          { role: 'user', content: prompt },
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

async function createBrain(
  apiKey: string,
  accountSlug: string,
  template: Template,
  clientName: string,
  customGuidelines?: Guidelines
): Promise<{ brainId: string | null; error?: string }> {
  const url = `${BASE_URL}/v1/brains?account_slug=${accountSlug}`;

  const guidelines = customGuidelines ? { ...customGuidelines } : { ...template.guidelines };

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
    if (node.actions) updateActions(node.actions);
    if (node.conditions) {
      for (const condition of node.conditions) {
        if (condition.actions) updateActions(condition.actions);
      }
    }
    if (node.requisites) {
      for (const requisite of node.requisites) {
        if (requisite.actions) updateActions(requisite.actions);
        if (requisite.reprompt) updateActions(requisite.reprompt);
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
        if (action.action_id) action.action_id = uuidv4();
        if (action.trigger_node_id && nodeIdMapping[action.trigger_node_id]) {
          action.trigger_node_id = nodeIdMapping[action.trigger_node_id];
        }
      }
    };

    if (node.actions) updateActionRefs(node.actions);
    if (node.conditions) {
      for (const condition of node.conditions) {
        if (condition.condition_id) condition.condition_id = uuidv4();
        if (condition.actions) updateActionRefs(condition.actions);
        for (const rule of condition.rules || []) {
          if (rule.rule_id) rule.rule_id = uuidv4();
        }
      }
    }
    if (node.requisites) {
      for (const requisite of node.requisites) {
        if (requisite.requisite_id) requisite.requisite_id = uuidv4();
        if (requisite.actions) updateActionRefs(requisite.actions);
        if (requisite.reprompt) updateActionRefs(requisite.reprompt);
      }
    }
  }

  return dialogCopy;
}

function getDialogNodeIds(dialog: Dialog): Set<string> {
  const nodeIds = new Set<string>();
  for (const node of dialog.nodes || []) {
    if (node.node_id) nodeIds.add(node.node_id);
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
    if (node.actions) collectTriggerRefs(node.actions);
    if (node.conditions) {
      for (const condition of node.conditions) {
        if (condition.actions) collectTriggerRefs(condition.actions);
      }
    }
    if (node.requisites) {
      for (const requisite of node.requisites) {
        if (requisite.actions) collectTriggerRefs(requisite.actions);
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
        if (depDialog !== dialogName) deps.add(depDialog);
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
      if (pendingDeps.size === 0) ready.push(name);
    }

    if (ready.length === 0) ready.push(...remaining.keys());

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

    if (node.actions) updateActions(node.actions);
    if (node.conditions) {
      for (const condition of node.conditions) {
        if (condition.actions) updateActions(condition.actions);
      }
    }
    if (node.requisites) {
      for (const requisite of node.requisites) {
        if (requisite.actions) updateActions(requisite.actions);
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
  brainId: string
): Promise<{ ruleId: string | null; error?: string }> {
  const url = `${BASE_URL}/v1/desks/${deskId}/rules?account_slug=${accountSlug}`;

  const ruleData = {
    name: 'Default',
    description: '',
    status: 'active',
    position: 1,
    triggers: [{ type: 'first_message' }, { type: 'any_user_message' }],
    condition: { operator: 'or', conditions: [] },
    actions: [{ type: 'assign_brain', brain_version: 0, brain_parent_id: brainId }],
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
    config: { show_survey: true, show_powered_by: true },
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

// Main streaming handler
export async function POST(request: NextRequest) {
  const body: CreateAgentRequest = await request.json();
  const { clientName, apiKey, accountSlug, fileId, observations, moveoAccountOnly } = body;

  // Validation
  if (!clientName || !fileId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Nome da empresa e File ID são obrigatórios' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!moveoAccountOnly && (!apiKey || !accountSlug)) {
    return new Response(
      JSON.stringify({ success: false, error: 'API Key e Account Slug são obrigatórios' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const moveoApiKey = process.env.MOVEO_DEFAULT_API_KEY;
  const moveoAccountSlug = process.env.MOVEO_DEFAULT_ACCOUNT_SLUG;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: object) => {
        controller.enqueue(encoder.encode(createSSEMessage(type, data)));
      };

      const allErrors: string[] = [];
      let customGuidelines: Guidelines | undefined;

      try {
        // ====================================================================
        // STEP 0: Customize guidelines with AI
        // ====================================================================
        if (observations && observations.trim()) {
          send('progress', { step: 'ai', message: 'Personalizando guidelines com IA...', percent: 5 });

          const { guidelines, error: openaiError } = await customizeGuidelinesWithOpenAI(
            agenteModelo.guidelines,
            observations,
            clientName
          );
          customGuidelines = guidelines;

          if (openaiError) {
            allErrors.push(openaiError);
            send('warning', { message: openaiError });
          } else {
            send('success', { step: 'ai', message: 'Guidelines personalizadas!' });
          }
        }

        // Determine which account to use
        const targetApiKey = moveoAccountOnly ? moveoApiKey! : apiKey!;
        const targetSlug = moveoAccountOnly ? moveoAccountSlug! : accountSlug!;
        const accountLabel = moveoAccountOnly ? 'Moveo-BR' : 'cliente';

        // ====================================================================
        // STEP 1: Create Brain
        // ====================================================================
        send('progress', { step: 'brain', message: `Criando brain na conta ${accountLabel}...`, percent: 10 });

        const { brainId, error: brainError } = await createBrain(
          targetApiKey,
          targetSlug,
          agenteModelo,
          clientName,
          customGuidelines
        );

        if (!brainId) {
          send('error', { message: brainError || 'Falha ao criar brain' });
          send('complete', { success: false, error: brainError });
          controller.close();
          return;
        }
        send('success', { step: 'brain', message: `Brain criado! ID: ${brainId}`, brainId });

        // ====================================================================
        // STEP 2: Create Webhooks
        // ====================================================================
        send('progress', { step: 'webhooks', message: 'Criando webhooks...', percent: 25 });

        const { mapping: webhookIdMapping, errors: webhookErrors } = await createWebhooks(
          targetApiKey,
          targetSlug,
          brainId,
          agenteModelo,
          fileId
        );

        if (webhookErrors.length > 0) {
          allErrors.push(...webhookErrors);
        }
        send('success', { step: 'webhooks', message: `Webhooks criados (${Object.keys(webhookIdMapping).length})` });

        // ====================================================================
        // STEP 3: Create Intents
        // ====================================================================
        send('progress', { step: 'intents', message: 'Criando intents...', percent: 40 });

        const { errors: intentErrors } = await createIntents(targetApiKey, targetSlug, brainId, agenteModelo);

        if (intentErrors.length > 0) {
          allErrors.push(...intentErrors);
        }
        send('success', { step: 'intents', message: 'Intents criados!' });

        // ====================================================================
        // STEP 4: Create Insights
        // ====================================================================
        send('progress', { step: 'insights', message: 'Criando insights...', percent: 50 });

        const { errors: insightErrors } = await createInsights(targetApiKey, targetSlug, brainId, agenteModelo);

        if (insightErrors.length > 0) {
          allErrors.push(...insightErrors);
        }
        send('success', { step: 'insights', message: 'Insights criados!' });

        // ====================================================================
        // STEP 5: Create Dialogs
        // ====================================================================
        send('progress', { step: 'dialogs', message: 'Criando dialogs...', percent: 60 });

        const { errors: dialogErrors } = await createDialogs(
          targetApiKey,
          targetSlug,
          brainId,
          agenteModelo,
          webhookIdMapping,
          clientName
        );

        if (dialogErrors.length > 0) {
          allErrors.push(...dialogErrors);
        }
        send('success', { step: 'dialogs', message: 'Dialogs criados!' });

        // ====================================================================
        // STEP 6: Create Environment
        // ====================================================================
        send('progress', { step: 'environment', message: 'Criando environment...', percent: 70 });

        const { deskId, error: deskError } = await createEnvironment(targetApiKey, targetSlug, clientName);

        let integrationId: string | null = null;
        let webChatUrl: string | null = null;

        if (!deskId) {
          allErrors.push(deskError || 'Falha ao criar environment');
          send('warning', { step: 'environment', message: deskError || 'Erro ao criar environment' });
        } else {
          send('success', { step: 'environment', message: `Environment criado! ID: ${deskId}` });

          // ====================================================================
          // STEP 7: Create Rule
          // ====================================================================
          send('progress', { step: 'rule', message: 'Criando regra...', percent: 80 });

          const { ruleId, error: ruleError } = await createDeskRule(targetApiKey, targetSlug, deskId, brainId);

          if (!ruleId) {
            allErrors.push(ruleError || 'Falha ao criar regra');
            send('warning', { step: 'rule', message: ruleError || 'Erro ao criar regra' });
          } else {
            send('success', { step: 'rule', message: 'Regra criada!' });
          }

          // ====================================================================
          // STEP 8: Create Web Integration
          // ====================================================================
          send('progress', { step: 'integration', message: 'Criando integração web...', percent: 90 });

          const integrationResult = await createWebIntegration(targetApiKey, targetSlug, deskId);
          integrationId = integrationResult.integrationId;

          if (!integrationId) {
            allErrors.push(integrationResult.error || 'Falha ao criar integração');
            send('warning', { step: 'integration', message: integrationResult.error || 'Erro ao criar integração' });
          } else {
            webChatUrl = `https://web.moveo.ai/preview/?integrationId=${integrationId}&version=v2`;
            send('success', { step: 'integration', message: 'Integração web criada!' });
          }
        }

        // ====================================================================
        // Create copy on Moveo account (if not moveoAccountOnly)
        // ====================================================================
        let moveoBrainId: string | null = null;

        if (!moveoAccountOnly && moveoApiKey && moveoAccountSlug) {
          send('progress', { step: 'moveo_copy', message: 'Criando cópia na conta Moveo-BR...', percent: 95 });

          // Create brain copy
          const { brainId: mBrainId } = await createBrain(
            moveoApiKey,
            moveoAccountSlug,
            agenteModelo,
            clientName,
            customGuidelines
          );

          if (mBrainId) {
            moveoBrainId = mBrainId;

            // Create webhooks, intents, insights, dialogs
            const { mapping: mWebhookMapping } = await createWebhooks(
              moveoApiKey,
              moveoAccountSlug,
              mBrainId,
              agenteModelo,
              fileId
            );
            await createIntents(moveoApiKey, moveoAccountSlug, mBrainId, agenteModelo);
            await createInsights(moveoApiKey, moveoAccountSlug, mBrainId, agenteModelo);
            await createDialogs(
              moveoApiKey,
              moveoAccountSlug,
              mBrainId,
              agenteModelo,
              mWebhookMapping,
              clientName
            );

            send('success', { step: 'moveo_copy', message: 'Cópia criada na Moveo-BR!' });
          } else {
            send('warning', { step: 'moveo_copy', message: 'Não foi possível criar cópia na Moveo-BR' });
          }
        }

        // ====================================================================
        // COMPLETE
        // ====================================================================
        send('complete', {
          success: true,
          brainId,
          fileId,
          deskId,
          integrationId,
          webChatUrl,
          moveoBrainId,
          errors: allErrors.length > 0 ? allErrors : undefined,
        });

      } catch (error) {
        send('error', {
          message: error instanceof Error ? error.message : 'Erro interno do servidor',
        });
        send('complete', {
          success: false,
          error: error instanceof Error ? error.message : 'Erro interno do servidor',
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
