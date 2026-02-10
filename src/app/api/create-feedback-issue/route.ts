import { NextRequest, NextResponse } from 'next/server';

interface FeedbackData {
  salesPersonName: string;
  feedback: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackData = await request.json();

    const linearApiKey = process.env.LINEAR_API_KEY;
    const linearTeamId = process.env.LINEAR_TEAM_ID;

    if (!linearApiKey || !linearTeamId) {
      return NextResponse.json(
        { success: false, error: 'Credenciais do Linear não configuradas' },
        { status: 500 }
      );
    }

    if (!body.feedback?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Feedback é obrigatório' },
        { status: 400 }
      );
    }

    const issueTitle = `[Feedback] ${body.salesPersonName || 'Vendedor'}`;
    const issueDescription = `## Feedback do Formulário de Registro de Clientes

**Enviado por:** ${body.salesPersonName || 'Não identificado'}

---

### Sugestão/Problema Reportado

${body.feedback}

---
*Feedback enviado via Moveo Agent Platform*`;

    // Due date: 7 dias a partir de hoje
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateString = dueDate.toISOString().split('T')[0];

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
        { success: false, error: `Erro na API do Linear: ${response.status}` },
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
    console.error('Error creating feedback issue:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
