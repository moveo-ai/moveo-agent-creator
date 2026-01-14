'use client';

import { useState } from 'react';

interface ApiResponse {
  success: boolean;
  brainId?: string;
  fileId?: string;
  sheetUrl?: string;
  agentUrl?: string;
  logs?: string[];
  errors?: string[];
  error?: string;
}

export default function Home() {
  const [formData, setFormData] = useState({
    clientName: '',
    apiKey: '',
    accountSlug: '',
    googleCredentials: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/create-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar agente',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-white mb-3">
              Moveo Agent Creator
            </h1>
            <p className="text-gray-300">
              Crie agentes Moveo de Debt Collection automaticamente
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="clientName"
                  className="block text-sm font-medium text-gray-200 mb-2"
                >
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  id="clientName"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Empresa XYZ"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label
                  htmlFor="accountSlug"
                  className="block text-sm font-medium text-gray-200 mb-2"
                >
                  Account Slug
                </label>
                <input
                  type="text"
                  id="accountSlug"
                  name="accountSlug"
                  value={formData.accountSlug}
                  onChange={handleChange}
                  required
                  placeholder="Ex: minha-conta"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label
                  htmlFor="apiKey"
                  className="block text-sm font-medium text-gray-200 mb-2"
                >
                  API Key (Moveo)
                </label>
                <input
                  type="password"
                  id="apiKey"
                  name="apiKey"
                  value={formData.apiKey}
                  onChange={handleChange}
                  required
                  placeholder="Sua API Key da Moveo"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label
                  htmlFor="googleCredentials"
                  className="block text-sm font-medium text-gray-200 mb-2"
                >
                  Google Service Account (JSON)
                </label>
                <textarea
                  id="googleCredentials"
                  name="googleCredentials"
                  value={formData.googleCredentials}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder='Cole aqui o JSON da Service Account do Google (ex: {"type": "service_account", "project_id": "...", ...})'
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition font-mono text-sm resize-none"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Uma Google Sheet sera criada automaticamente para armazenar os dados do agente.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Criando Agente...
                  </span>
                ) : (
                  'Criar Agente'
                )}
              </button>
            </form>
          </div>

          {result && (
            <div
              className={`mt-8 rounded-2xl p-6 ${
                result.success
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              <h2
                className={`text-xl font-semibold mb-4 ${
                  result.success ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {result.success ? 'Agente Criado com Sucesso!' : 'Erro ao Criar Agente'}
              </h2>

              {result.success && (
                <div className="mb-4 space-y-3">
                  {result.agentUrl && (
                    <a
                      href={result.agentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 transition-colors group"
                    >
                      <div>
                        <p className="font-medium text-white">Abrir Agente no Moveo</p>
                        <p className="text-sm text-gray-400">Brain ID: {result.brainId}</p>
                      </div>
                      <svg
                        className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                  {result.sheetUrl && (
                    <a
                      href={result.sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-colors group"
                    >
                      <div>
                        <p className="font-medium text-white">Abrir Google Sheet</p>
                        <p className="text-sm text-gray-400">File ID: {result.fileId}</p>
                      </div>
                      <svg
                        className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              )}

              {result.error && (
                <p className="text-red-300 mb-4">{result.error}</p>
              )}

              {result.logs && result.logs.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Logs:</h3>
                  <div className="bg-black/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {result.logs.map((log, index) => (
                      <p
                        key={index}
                        className={`text-sm font-mono ${
                          log.startsWith('✓')
                            ? 'text-green-400'
                            : log.includes('===')
                            ? 'text-purple-400 font-bold'
                            : 'text-gray-300'
                        }`}
                      >
                        {log || '\u00A0'}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-yellow-400 mb-2">
                    Avisos ({result.errors.length}):
                  </h3>
                  <div className="bg-yellow-500/10 rounded-lg p-4 max-h-40 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <p key={index} className="text-sm text-yellow-300 font-mono">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-center text-gray-500 text-sm mt-8">
            Acesse o Moveo Dashboard para verificar e publicar o agente
          </p>
        </div>
      </div>
    </div>
  );
}
