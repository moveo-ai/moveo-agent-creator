'use client';

import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ApiResponse {
  success: boolean;
  brainId?: string;
  fileId?: string;
  deskId?: string;
  integrationId?: string;
  webChatUrl?: string;
  logs?: string[];
  errors?: string[];
  error?: string;
}

interface LinearResponse {
  success: boolean;
  issueId?: string;
  issueUrl?: string;
  error?: string;
}

interface ClientFormData {
  // Vendedor responsável
  salesPerson: string;
  salesPersonOther: string;
  // Seção 1 - Perfil e Modelo de Negócio
  companyName: string;
  businessModel: string;
  creditorType: string;
  estimatedAIUsage: string;
  debtNature: string;
  // Seção 2 - Volume e Demanda
  monthlyVolume: string;
  portfolioMovement: string;
  debtAge: string;
  teamSize: string;
  conversionRate: string;
  // Seção 3 - Maturidade Digital e Canais
  currentChannels: string;
  whatsappApi: string;
  metaBusinessStatus: string;
  accountIssues: string;
  currentCollectionModel: string;
  costPerAgreement: string;
  // Seção 4 - Regras de Negócio e Complexidade Técnica
  debtCalculation: string;
  discountAutonomy: string;
  segmentation: string;
  crmSystem: string;
  // Seção 5 - Visão de Sucesso
  primaryKPI: string;
  additionalNotes: string;
}

interface AgentFormData {
  clientName: string;
  apiKey: string;
  accountSlug: string;
  fileId: string;
  observations: string;
}

// ============================================================================
// Icons
// ============================================================================

const BuildingIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const DeviceIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const CogIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const RobotIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const UserPlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

// ============================================================================
// Components
// ============================================================================

function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  hint,
  rows,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  rows?: number;
}) {
  const inputClasses = "input-field";

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-[var(--accent-gold)] ml-1">*</span>}
      </label>
      {rows ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={`${inputClasses} resize-none`}
        />
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={inputClasses}
        />
      )}
      {hint && (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-[var(--accent-gold)] ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="input-field appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.25rem',
          paddingRight: '2.5rem',
        }}
      >
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
}

function FormSection({
  number,
  title,
  subtitle,
  icon,
  isOpen,
  isCompleted,
  onToggle,
  children,
}: {
  number: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  isOpen: boolean;
  isCompleted: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-slide-up" style={{ animationDelay: `${number * 0.05}s` }}>
      <button
        type="button"
        onClick={onToggle}
        className={`section-header w-full ${isOpen ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
      >
        <div className="section-number">
          {isCompleted ? <CheckIcon /> : number}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">{icon}</span>
            <span className="font-medium text-[var(--text-primary)]">{title}</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6 border border-t-0 border-[var(--border-subtle)] rounded-b-xl bg-[var(--bg-card)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Client Registration Tab
// ============================================================================

function ClientRegistrationTab() {
  const [formData, setFormData] = useState<ClientFormData>({
    salesPerson: '',
    salesPersonOther: '',
    companyName: '',
    businessModel: '',
    creditorType: '',
    estimatedAIUsage: '',
    debtNature: '',
    monthlyVolume: '',
    portfolioMovement: '',
    debtAge: '',
    teamSize: '',
    conversionRate: '',
    currentChannels: '',
    whatsappApi: '',
    metaBusinessStatus: '',
    accountIssues: '',
    currentCollectionModel: '',
    costPerAgreement: '',
    debtCalculation: '',
    discountAutonomy: '',
    segmentation: '',
    crmSystem: '',
    primaryKPI: '',
    additionalNotes: '',
  });

  const [openSection, setOpenSection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LinearResponse | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<LinearResponse | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const isSectionCompleted = (section: number): boolean => {
    switch (section) {
      case 1:
        const salesPersonValid = formData.salesPerson && (formData.salesPerson !== 'outros' || formData.salesPersonOther);
        return !!(formData.companyName && salesPersonValid);
      case 2:
        return !!(formData.monthlyVolume || formData.portfolioMovement || formData.debtAge || formData.teamSize || formData.conversionRate);
      case 3:
        return !!(formData.currentChannels || formData.whatsappApi || formData.metaBusinessStatus || formData.accountIssues || formData.currentCollectionModel || formData.costPerAgreement);
      case 4:
        return !!(formData.debtCalculation || formData.discountAutonomy || formData.segmentation || formData.crmSystem);
      case 5:
        return !!(formData.primaryKPI || formData.additionalNotes);
      default:
        return false;
    }
  };

  const getProgress = (): number => {
    let completed = 0;
    for (let i = 1; i <= 5; i++) {
      if (isSectionCompleted(i)) completed++;
    }
    return (completed / 5) * 100;
  };

  const getSalesPersonName = () => {
    if (formData.salesPerson === 'outros') {
      return formData.salesPersonOther || 'Vendedor';
    }
    const names: Record<string, string> = {
      felipe_benedetti: 'Felipe Benedetti',
      arnaldo: 'Arnaldo',
      henrique: 'Henrique',
    };
    return names[formData.salesPerson] || 'Vendedor';
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;

    setFeedbackLoading(true);
    setFeedbackResult(null);

    try {
      const response = await fetch('/api/create-feedback-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesPersonName: getSalesPersonName(),
          feedback: feedbackText,
        }),
      });

      const data: LinearResponse = await response.json();
      setFeedbackResult(data);

      if (data.success) {
        setFeedbackText('');
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackResult(null);
        }, 2000);
      }
    } catch (error) {
      setFeedbackResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar feedback',
      });
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/create-linear-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data: LinearResponse = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar issue no Linear',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[var(--text-secondary)]">Progresso do formulário</span>
          <span className="text-[var(--accent-gold)] font-medium">{Math.round(getProgress())}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${getProgress()}%` }} />
        </div>
      </div>

      {/* Section 1 - Perfil e Modelo de Negócio */}
      <FormSection
        number={1}
        title="Perfil e Modelo de Negócio"
        subtitle="Entenda a complexidade e escala da operação"
        icon={<BuildingIcon />}
        isOpen={openSection === 1}
        isCompleted={isSectionCompleted(1)}
        onToggle={() => setOpenSection(openSection === 1 ? 0 : 1)}
      >
        <div className="grid gap-5">
          <SelectField
            label="Vendedor responsável"
            name="salesPerson"
            value={formData.salesPerson}
            onChange={handleChange}
            required
            options={[
              { value: 'felipe_benedetti', label: 'Felipe Benedetti' },
              { value: 'arnaldo', label: 'Arnaldo' },
              { value: 'henrique', label: 'Henrique' },
              { value: 'outros', label: 'Outros' },
            ]}
          />

          {formData.salesPerson === 'outros' && (
            <FormField
              label="Nome do vendedor"
              name="salesPersonOther"
              value={formData.salesPersonOther}
              onChange={handleChange}
              placeholder="Digite o nome do vendedor"
              required
            />
          )}

          <FormField
            label="Nome da empresa"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="Ex: Empresa XYZ"
            required
          />

          <SelectField
            label="Modelo de atuação"
            name="businessModel"
            value={formData.businessModel}
            onChange={handleChange}
            options={[
              { value: 'carteira_propria', label: 'Cobra carteira própria' },
              { value: 'bpo', label: 'Presta serviço para terceiros/BPO' },
              { value: 'taxa_sucesso', label: 'Atua por taxa de sucesso' },
              { value: 'compra_carteira', label: 'Compra de carteira' },
              { value: 'misto', label: 'Modelo misto' },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-5">
            <SelectField
              label="Mono ou Multicredor?"
              name="creditorType"
              value={formData.creditorType}
              onChange={handleChange}
              options={[
                { value: 'mono', label: 'Monocredor (apenas 1 credor)' },
                { value: 'multi', label: 'Multicredor (mais de 1 credor)' },
              ]}
            />
            <FormField
              label="Estimativa de uso de IA nas carteiras"
              name="estimatedAIUsage"
              value={formData.estimatedAIUsage}
              onChange={handleChange}
              placeholder="Ex: 50% da base, carteira específica..."
            />
          </div>

          <SelectField
            label="Natureza da dívida"
            name="debtNature"
            value={formData.debtNature}
            onChange={handleChange}
            options={[
              { value: 'varejo', label: 'Varejo' },
              { value: 'bancario', label: 'Bancário' },
              { value: 'educacao', label: 'Educação' },
              { value: 'telecom', label: 'Telecom' },
              { value: 'saude', label: 'Saúde' },
              { value: 'outros', label: 'Outros' },
            ]}
          />
        </div>
      </FormSection>

      {/* Section 2 - Volume e Demanda */}
      <FormSection
        number={2}
        title="Volume e Demanda"
        subtitle="Entenda a oportunidade de escala"
        icon={<ChartIcon />}
        isOpen={openSection === 2}
        isCompleted={isSectionCompleted(2)}
        onToggle={() => setOpenSection(openSection === 2 ? 0 : 2)}
      >
        <div className="grid gap-5">
          <div className="grid md:grid-cols-2 gap-5">
            <FormField
              label="Volume mensal"
              name="monthlyVolume"
              value={formData.monthlyVolume}
              onChange={handleChange}
              placeholder="Quantos CPFs/Contratos entram por mês?"
              hint="Quantos CPFs/Contratos entram na esteira de cobrança por mês?"
            />
            <SelectField
              label="Movimentação da carteira"
              name="portfolioMovement"
              value={formData.portfolioMovement}
              onChange={handleChange}
              options={[
                { value: 'alta', label: 'Alta movimentação (entrada constante)' },
                { value: 'media', label: 'Média movimentação' },
                { value: 'baixa', label: 'Baixa movimentação' },
                { value: 'fechada', label: 'Carteira fechada (sem novas entradas)' },
              ]}
            />
          </div>

          <SelectField
            label="Idade da dívida (foco principal)"
            name="debtAge"
            value={formData.debtAge}
            onChange={handleChange}
            options={[
              { value: 'curta', label: 'Faixas curtas / Recuperação imediata (até 90 dias)' },
              { value: 'media', label: 'Faixas médias (90-360 dias)' },
              { value: 'longa', label: 'Dívidas antigas (+360 dias)' },
              { value: 'misto', label: 'Misto (várias faixas)' },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-5">
            <FormField
              label="Tamanho do time de cobrança"
              name="teamSize"
              value={formData.teamSize}
              onChange={handleChange}
              placeholder="Ex: 10 operadores, 50 pessoas..."
              hint="Capacidade humana atual"
            />
            <FormField
              label="Taxa de efetividade"
              name="conversionRate"
              value={formData.conversionRate}
              onChange={handleChange}
              placeholder="Ex: 15%, 30%..."
              hint="Das tentativas de contato, qual % converte em conversa real?"
            />
          </div>
        </div>
      </FormSection>

      {/* Section 3 - Maturidade Digital e Canais */}
      <FormSection
        number={3}
        title="Maturidade Digital e Canais"
        subtitle="O que a Moveo vai substituir ou integrar"
        icon={<DeviceIcon />}
        isOpen={openSection === 3}
        isCompleted={isSectionCompleted(3)}
        onToggle={() => setOpenSection(openSection === 3 ? 0 : 3)}
      >
        <div className="grid gap-5">
          <SelectField
            label="Canais atuais"
            name="currentChannels"
            value={formData.currentChannels}
            onChange={handleChange}
            options={[
              { value: 'whatsapp_api', label: 'WhatsApp com API oficial' },
              { value: 'whatsapp_sem_api', label: 'WhatsApp sem API oficial' },
              { value: 'sms', label: 'SMS' },
              { value: 'telefone', label: 'Apenas telefone' },
              { value: 'email', label: 'E-mail' },
              { value: 'multicanal', label: 'Multicanal' },
            ]}
          />

          {(formData.currentChannels === 'whatsapp_api' || formData.currentChannels === 'multicanal') && (
            <SelectField
              label="Utiliza API oficial com custo de disparo em massa?"
              name="whatsappApi"
              value={formData.whatsappApi}
              onChange={handleChange}
              options={[
                { value: 'sim', label: 'Sim, já utiliza' },
                { value: 'nao', label: 'Não utiliza' },
                { value: 'planejando', label: 'Planejando implementar' },
              ]}
            />
          )}

          {formData.whatsappApi === 'nao' && (
            <SelectField
              label="Status do Meta Business"
              name="metaBusinessStatus"
              value={formData.metaBusinessStatus}
              onChange={handleChange}
              options={[
                { value: 'ativo', label: 'Conta ativa e em dia' },
                { value: 'pendente', label: 'Conta com pendências' },
                { value: 'nao_possui', label: 'Não possui conta' },
              ]}
            />
          )}

          <SelectField
            label="Problemas com conta/número?"
            name="accountIssues"
            value={formData.accountIssues}
            onChange={handleChange}
            options={[
              { value: 'nenhum', label: 'Nenhum problema' },
              { value: 'restrita', label: 'Conta restrita no passado' },
              { value: 'banido', label: 'Número banido anteriormente' },
              { value: 'ambos', label: 'Ambos os problemas' },
            ]}
          />

          <SelectField
            label="Modelo de cobrança atual"
            name="currentCollectionModel"
            value={formData.currentCollectionModel}
            onChange={handleChange}
            options={[
              { value: 'humano', label: 'Todo processo é humano' },
              { value: 'broadcast', label: 'Disparador de mensagens (broadcast)' },
              { value: 'chatbot_arvore', label: 'Chatbot com árvore de decisão' },
              { value: 'misto', label: 'Misto (humano + automação)' },
            ]}
          />

          <FormField
            label="Custo por acordo"
            name="costPerAgreement"
            value={formData.costPerAgreement}
            onChange={handleChange}
            placeholder="Ex: R$ 50,00, não temos clareza..."
            hint="Quanto custa cada acordo fechado (contando telefonia + pessoas)?"
          />
        </div>
      </FormSection>

      {/* Section 4 - Regras de Negócio e Complexidade Técnica */}
      <FormSection
        number={4}
        title="Regras de Negócio"
        subtitle="Validar se o produto atende às necessidades"
        icon={<CogIcon />}
        isOpen={openSection === 4}
        isCompleted={isSectionCompleted(4)}
        onToggle={() => setOpenSection(openSection === 4 ? 0 : 4)}
      >
        <div className="grid gap-5">
          <SelectField
            label="Cálculo da dívida"
            name="debtCalculation"
            value={formData.debtCalculation}
            onChange={handleChange}
            options={[
              { value: 'diario', label: 'Atualização diária' },
              { value: 'mensal', label: 'Atualização mensal' },
              { value: 'fixo', label: 'Valor fixo (sem atualização)' },
              { value: 'sob_demanda', label: 'Atualização sob demanda' },
            ]}
            hint="Os valores possuem atualização diária? Como é feito o cálculo?"
          />

          <SelectField
            label="Autonomia para descontos"
            name="discountAutonomy"
            value={formData.discountAutonomy}
            onChange={handleChange}
            options={[
              { value: 'progressivo', label: 'IA pode oferecer descontos progressivos dentro de margem' },
              { value: 'fixo', label: 'Valor/desconto é fixo' },
              { value: 'aprovacao', label: 'Necessita aprovação humana para descontos' },
              { value: 'sem_desconto', label: 'Não trabalha com descontos' },
            ]}
          />

          <SelectField
            label="Segmentação (Clusters)"
            name="segmentation"
            value={formData.segmentation}
            onChange={handleChange}
            options={[
              { value: 'padronizado', label: 'Réguas padronizadas por carteira' },
              { value: 'perfil', label: 'Variam por perfil de devedor' },
              { value: 'misto', label: 'Misto (carteira + perfil)' },
              { value: 'sem_segmentacao', label: 'Sem segmentação definida' },
            ]}
            hint="As réguas de negociação e descontos são padronizadas?"
          />

          <FormField
            label="CRM/Sistema de Gestão"
            name="crmSystem"
            value={formData.crmSystem}
            onChange={handleChange}
            placeholder="Ex: Salesforce, próprio, planilhas..."
            hint="Qual CRM/Sistema de Gestão de Cobrança utilizam?"
          />
        </div>
      </FormSection>

      {/* Section 5 - Visão de Sucesso */}
      <FormSection
        number={5}
        title="Visão de Sucesso"
        subtitle="Definir KPIs e expectativas do projeto"
        icon={<TargetIcon />}
        isOpen={openSection === 5}
        isCompleted={isSectionCompleted(5)}
        onToggle={() => setOpenSection(openSection === 5 ? 0 : 5)}
      >
        <div className="grid gap-5">
          <SelectField
            label="Principal KPI para este projeto"
            name="primaryKPI"
            value={formData.primaryKPI}
            onChange={handleChange}
            options={[
              { value: 'cpc', label: 'Aumentar o CPC (Contato com a Pessoa Certa)' },
              { value: 'custo', label: 'Reduzir o custo da operação humana' },
              { value: 'cobertura', label: 'Aumentar a cobertura da base' },
              { value: 'conversao', label: 'Aumentar taxa de conversão' },
              { value: 'tempo', label: 'Reduzir tempo de recuperação' },
            ]}
          />

          <FormField
            label="Observações adicionais"
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleChange}
            placeholder="Informações adicionais, expectativas específicas, urgências..."
            rows={4}
          />
        </div>
      </FormSection>

      {/* Submit Buttons */}
      <div className="pt-6 space-y-3">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !formData.companyName || !formData.salesPerson || (formData.salesPerson === 'outros' && !formData.salesPersonOther)}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-base"
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Criando issue no Linear...</span>
              </>
            ) : (
              <>
                <UserPlusIcon />
                <span>Registrar Cliente no Linear</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowFeedbackModal(true)}
            className="px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="hidden sm:inline">Sugerir melhorias</span>
          </button>
        </div>
        {getProgress() < 100 && (
          <p className="text-center text-xs text-[var(--text-muted)]">
            Complete todas as seções obrigatórias para enviar
          </p>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg animate-slide-up">
            <div className="p-6 border-b border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Sugerir melhorias no formulário
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackResult(null);
                  }}
                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition"
                >
                  <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Seu feedback será registrado como uma issue no Linear
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Descreva sua sugestão ou problema
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Ex: Seria útil ter um campo para informar o CNPJ da empresa..."
                  rows={5}
                  className="input-field resize-none w-full"
                />
              </div>

              {feedbackResult && (
                <div
                  className={`rounded-lg p-4 ${
                    feedbackResult.success
                      ? 'bg-[var(--success-bg)] border border-[var(--success)]/30'
                      : 'bg-[var(--error-bg)] border border-[var(--error)]/30'
                  }`}
                >
                  {feedbackResult.success ? (
                    <p className="text-[var(--success)] text-sm">Feedback enviado com sucesso!</p>
                  ) : (
                    <p className="text-[var(--error)] text-sm">{feedbackResult.error}</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleFeedbackSubmit}
                disabled={feedbackLoading || !feedbackText.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {feedbackLoading ? (
                  <>
                    <span className="spinner" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Enviar Feedback</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`mt-6 rounded-xl p-5 animate-slide-up ${
            result.success
              ? 'bg-[var(--success-bg)] border border-[var(--success)]/30'
              : 'bg-[var(--error-bg)] border border-[var(--error)]/30'
          }`}
        >
          {result.success ? (
            <>
              <h3 className="text-lg font-semibold text-[var(--success)] mb-2">
                Issue criada com sucesso!
              </h3>
              {result.issueUrl && (
                <a
                  href={result.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[var(--success)] hover:underline"
                >
                  <span>Abrir no Linear</span>
                  <ExternalLinkIcon />
                </a>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-[var(--error)] mb-2">
                Erro ao criar issue
              </h3>
              <p className="text-[var(--error)]/80">{result.error}</p>
            </>
          )}
        </div>
      )}
    </form>
  );
}

// ============================================================================
// Progress Steps Component
// ============================================================================

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'success' | 'warning' | 'error';
  message?: string;
}

const INITIAL_STEPS: ProgressStep[] = [
  { id: 'ai', label: 'Personalização IA', status: 'pending' },
  { id: 'brain', label: 'Brain', status: 'pending' },
  { id: 'webhooks', label: 'Webhooks', status: 'pending' },
  { id: 'intents', label: 'Intents', status: 'pending' },
  { id: 'insights', label: 'Insights', status: 'pending' },
  { id: 'dialogs', label: 'Dialogs', status: 'pending' },
  { id: 'environment', label: 'Environment', status: 'pending' },
  { id: 'rule', label: 'Regra', status: 'pending' },
  { id: 'integration', label: 'Integração Web', status: 'pending' },
  { id: 'moveo_copy', label: 'Cópia Moveo-BR', status: 'pending' },
];

function ProgressSteps({ steps, currentMessage }: { steps: ProgressStep[]; currentMessage: string }) {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-[var(--text-primary)]">Progresso da Criação</h3>
        <span className="text-xs text-[var(--text-muted)]">
          {steps.filter(s => s.status === 'success' || s.status === 'warning').length}/{steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar h-2 rounded-full">
        <div
          className="progress-fill h-full rounded-full transition-all duration-500"
          style={{
            width: `${(steps.filter(s => s.status === 'success' || s.status === 'warning').length / steps.length) * 100}%`,
          }}
        />
      </div>

      {/* Current action message */}
      {currentMessage && (
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[var(--bg-tertiary)]">
          <span className="spinner" />
          <span className="text-sm text-[var(--text-secondary)]">{currentMessage}</span>
        </div>
      )}

      {/* Steps grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
              step.status === 'loading'
                ? 'bg-[var(--accent-gold-glow)] ring-1 ring-[var(--accent-gold)]'
                : step.status === 'success'
                ? 'bg-[var(--success-bg)]'
                : step.status === 'warning'
                ? 'bg-[var(--warning-bg)]'
                : step.status === 'error'
                ? 'bg-[var(--error-bg)]'
                : 'bg-[var(--bg-tertiary)]'
            }`}
          >
            <div className="mb-1">
              {step.status === 'loading' ? (
                <span className="spinner w-4 h-4" />
              ) : step.status === 'success' ? (
                <svg className="w-4 h-4 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : step.status === 'warning' ? (
                <svg className="w-4 h-4 text-[var(--warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : step.status === 'error' ? (
                <svg className="w-4 h-4 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-[var(--text-muted)]" />
              )}
            </div>
            <span
              className={`text-xs text-center ${
                step.status === 'loading'
                  ? 'text-[var(--accent-gold)] font-medium'
                  : step.status === 'success'
                  ? 'text-[var(--success)]'
                  : step.status === 'warning'
                  ? 'text-[var(--warning)]'
                  : step.status === 'error'
                  ? 'text-[var(--error)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Agent Creation Tab
// ============================================================================

function AgentCreationTab() {
  const [formData, setFormData] = useState<AgentFormData>({
    clientName: '',
    apiKey: '',
    accountSlug: '',
    fileId: '',
    observations: '',
  });
  const [moveoAccountOnly, setMoveoAccountOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [currentMessage, setCurrentMessage] = useState('');

  const updateStepStatus = (stepId: string, status: ProgressStep['status'], message?: string) => {
    setProgressSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, message: message || step.message } : step
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setProgressSteps(INITIAL_STEPS);
    setCurrentMessage('Iniciando...');

    try {
      const response = await fetch('/api/create-agent-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          moveoAccountOnly,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setResult({ success: false, error: errorData.error || 'Erro ao criar agente' });
        setLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setResult({ success: false, error: 'Erro ao ler resposta do servidor' });
        setLoading(false);
        return;
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'progress':
                  if (data.step) {
                    updateStepStatus(data.step, 'loading');
                  }
                  if (data.message) {
                    setCurrentMessage(data.message);
                  }
                  break;
                case 'success':
                  if (data.step) {
                    updateStepStatus(data.step, 'success', data.message);
                  }
                  break;
                case 'warning':
                  if (data.step) {
                    updateStepStatus(data.step, 'warning', data.message);
                  }
                  break;
                case 'error':
                  setCurrentMessage('');
                  setResult({ success: false, error: data.message });
                  break;
                case 'complete':
                  setCurrentMessage('');
                  setResult({
                    success: data.success,
                    brainId: data.brainId,
                    fileId: data.fileId,
                    deskId: data.deskId,
                    integrationId: data.integrationId,
                    webChatUrl: data.webChatUrl,
                    errors: data.errors,
                    error: data.error,
                  });
                  break;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar agente',
      });
    } finally {
      setLoading(false);
      setCurrentMessage('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Filter steps based on mode
  const visibleSteps = moveoAccountOnly
    ? progressSteps.filter((s) => s.id !== 'moveo_copy')
    : progressSteps;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Toggle: Criar apenas na conta Moveo */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-gold-glow)]">
              <svg className="w-5 h-5 text-[var(--accent-gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">Criar apenas na conta Moveo</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Cria o agente completo na conta padrão moveo-br (sem precisar de credenciais do cliente)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMoveoAccountOnly(!moveoAccountOnly)}
            disabled={loading}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              moveoAccountOnly ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)]'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                moveoAccountOnly ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Progress indicator (shown during loading) */}
      {loading && <ProgressSteps steps={visibleSteps} currentMessage={currentMessage} />}

      <div className="glass-card rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-[var(--accent-gold-glow)]">
            <RobotIcon />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Configuração do Agente</h3>
            <p className="text-xs text-[var(--text-muted)]">Preencha os dados para criar o agente de cobrança</p>
          </div>
        </div>

        <FormField
          label="Nome da Empresa"
          name="clientName"
          value={formData.clientName}
          onChange={handleChange}
          placeholder="Ex: Empresa XYZ"
          required
        />

        {!moveoAccountOnly && (
          <>
            <FormField
              label="Account Slug"
              name="accountSlug"
              value={formData.accountSlug}
              onChange={handleChange}
              placeholder="Ex: minha-conta"
              required={!moveoAccountOnly}
            />

            <FormField
              label="API Key (Moveo)"
              name="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={handleChange}
              placeholder="Sua API Key da Moveo"
              required={!moveoAccountOnly}
            />
          </>
        )}

        <FormField
          label="Google Sheet File ID"
          name="fileId"
          value={formData.fileId}
          onChange={handleChange}
          placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
          required
          hint="O ID da planilha pode ser encontrado na URL: docs.google.com/spreadsheets/d/FILE_ID/edit"
        />

        <FormField
          label="Observações (Opcional)"
          name="observations"
          value={formData.observations}
          onChange={handleChange}
          placeholder="Ex: O agente deve ser mais formal, mencionar que a empresa está em campanha de renegociação..."
          rows={4}
          hint="Estas observações serão usadas para personalizar as instruções do agente via IA"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2 text-base"
      >
        {loading ? (
          <>
            <span className="spinner" />
            <span>Criando Agente...</span>
          </>
        ) : (
          <>
            <RobotIcon />
            <span>{moveoAccountOnly ? 'Criar Agente na Moveo' : 'Criar Agente'}</span>
          </>
        )}
      </button>

      {result && (
        <div
          className={`mt-6 rounded-xl p-5 animate-slide-up ${
            result.success
              ? 'bg-[var(--success-bg)] border border-[var(--success)]/30'
              : 'bg-[var(--error-bg)] border border-[var(--error)]/30'
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-3 ${
              result.success ? 'text-[var(--success)]' : 'text-[var(--error)]'
            }`}
          >
            {result.success ? 'Agente Criado com Sucesso!' : 'Erro ao Criar Agente'}
          </h3>

          {result.success && result.webChatUrl && (
            <a
              href={result.webChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-3 px-5 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-semibold hover:opacity-90 transition mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Testar Agente no WebChat
            </a>
          )}

          {result.error && (
            <p className="text-[var(--error)]/80 mb-3">{result.error}</p>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-[var(--warning)] mb-2">
                Avisos ({result.errors.length}):
              </h4>
              <div className="bg-[var(--warning-bg)] rounded-lg p-3 max-h-32 overflow-y-auto">
                {result.errors.map((error, index) => (
                  <p key={index} className="text-xs text-[var(--warning)] font-mono">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function Home() {
  const [activeTab, setActiveTab] = useState<'registration' | 'agent'>('registration');

  return (
    <div className="min-h-screen grid-bg">
      {/* Background decoration */}
      <div className="fixed inset-0 radial-overlay pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-gold-dim)] flex items-center justify-center">
                  <span className="text-[var(--bg-primary)] font-bold text-lg" style={{ fontFamily: 'var(--font-dm-serif)' }}>M</span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                    Moveo
                  </h1>
                  <p className="text-xs text-[var(--text-muted)]">Agent Platform</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                <span>Sistema Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-6 py-8">
          {/* Page Title */}
          <div className="text-center mb-10 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-normal text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-dm-serif)' }}>
              Plataforma de <span className="text-gold-gradient">Agentes IA</span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              Crie agentes de Debt Collection automaticamente ou registre novos clientes para acompanhamento
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex border-b border-[var(--border-subtle)]">
              <button
                onClick={() => setActiveTab('registration')}
                className={`tab-button flex items-center gap-2 ${activeTab === 'registration' ? 'active' : ''}`}
              >
                <UserPlusIcon />
                <span>Registro de Cliente</span>
              </button>
              <button
                onClick={() => setActiveTab('agent')}
                className={`tab-button flex items-center gap-2 ${activeTab === 'agent' ? 'active' : ''}`}
              >
                <RobotIcon />
                <span>Criar Agente</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="animate-fade-in" key={activeTab}>
            {activeTab === 'registration' ? (
              <ClientRegistrationTab />
            ) : (
              <AgentCreationTab />
            )}
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-[var(--border-subtle)] text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Moveo Agent Platform &bull; Debt Collection Intelligence
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
