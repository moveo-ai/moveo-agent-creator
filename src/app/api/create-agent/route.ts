import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import agenteModelo from '@/agente_modelo.json';

const BASE_URL = 'https://api.moveo.ai/api';

interface CreateAgentRequest {
  clientName: string;
  fileId: string;
  apiKey: string;
  accountSlug: string;
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
  clientName: string
): Promise<{ brainId: string | null; error?: string }> {
  const url = `${BASE_URL}/v1/brains?account_slug=${accountSlug}`;

  const guidelines = { ...template.guidelines };
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

async function createDialogs(
  apiKey: string,
  accountSlug: string,
  brainId: string,
  template: Template,
  webhookIdMapping: WebhookIdMapping
): Promise<{ errors: string[] }> {
  const url = `${BASE_URL}/v1/brains/${brainId}/dialogs?account_slug=${accountSlug}`;
  const errors: string[] = [];

  let dialogs = orderDialogsByDependency(template.dialogs || []);
  const globalNodeIdMapping = buildGlobalNodeIdMapping(dialogs);

  for (let dialog of dialogs) {
    dialog = updateDialogWebhookIds(dialog, webhookIdMapping);
    dialog = applyIdMappingToDialog(dialog, globalNodeIdMapping);

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

export async function POST(request: NextRequest) {
  try {
    const body: CreateAgentRequest = await request.json();
    const { clientName, fileId, apiKey, accountSlug } = body;

    if (!clientName || !fileId || !apiKey || !accountSlug) {
      return NextResponse.json(
        { success: false, error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    const logs: string[] = [];
    const allErrors: string[] = [];

    logs.push('Iniciando criação do agente...');

    // 1. Create brain
    logs.push('Criando brain...');
    const { brainId, error: brainError } = await createBrain(apiKey, accountSlug, agenteModelo, clientName);

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
      apiKey,
      accountSlug,
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
    const { errors: intentErrors } = await createIntents(apiKey, accountSlug, brainId, agenteModelo);
    if (intentErrors.length > 0) {
      allErrors.push(...intentErrors);
    }
    logs.push(`✓ Intents criados`);

    // 4. Create insights
    logs.push('Criando insights...');
    const { errors: insightErrors } = await createInsights(apiKey, accountSlug, brainId, agenteModelo);
    if (insightErrors.length > 0) {
      allErrors.push(...insightErrors);
    }
    logs.push(`✓ Insights criados`);

    // 5. Create dialogs
    logs.push('Criando dialogs...');
    const { errors: dialogErrors } = await createDialogs(
      apiKey,
      accountSlug,
      brainId,
      agenteModelo,
      webhookIdMapping
    );
    if (dialogErrors.length > 0) {
      allErrors.push(...dialogErrors);
    }
    logs.push(`✓ Dialogs criados`);

    logs.push('');
    logs.push('========================================');
    logs.push('          CONCLUÍDO!');
    logs.push('========================================');
    logs.push(`Agente criado com sucesso!`);
    logs.push(`Brain ID: ${brainId}`);

    return NextResponse.json({
      success: true,
      brainId,
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
