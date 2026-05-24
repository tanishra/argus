import { useState, useEffect } from 'react'
import { 
  BookOpen, 
  Terminal, 
  Sliders, 
  ShieldAlert, 
  Workflow, 
  Cpu, 
  Layers, 
  Copy, 
  Check, 
  Menu, 
  X, 
  ArrowRight,
  ArrowLeft,
  Flame,
  UserCheck,
  Globe,
  Settings,
  HelpCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react'
import { cn } from '../lib/utils'

interface DocSection {
  id: string
  title: string
}

interface NavSection {
  title: string
  items: DocSection[]
}

const navSections: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      { id: 'overview', title: 'Overview' },
      { id: 'installation', title: 'Installation' },
      { id: 'configuration', title: 'Configuration' },
    ]
  },
  {
    title: 'Guardrail Logic',
    items: [
      { id: 'vanilla', title: 'Vanilla Python' },
      { id: 'langchain', title: 'LangChain' },
      { id: 'pydanticai', title: 'PydanticAI' },
      { id: 'crewai', title: 'CrewAI & AutoGen' },
    ]
  },
  {
    title: 'Under The Hood',
    items: [
      { id: 'architecture', title: 'System Architecture' },
      { id: 'lobster', title: 'Lobster Trap Engine' },
      { id: 'quarantine', title: 'Quarantine Lifecycle' },
    ]
  }
]

const tabOrder = [
  'overview',
  'installation',
  'configuration',
  'vanilla',
  'langchain',
  'pydanticai',
  'crewai',
  'architecture',
  'lobster',
  'quarantine'
]

const tabTitles: Record<string, string> = {
  overview: 'Overview',
  installation: 'Installation',
  configuration: 'Configuration',
  vanilla: 'Vanilla Python',
  langchain: 'LangChain',
  pydanticai: 'PydanticAI',
  crewai: 'CrewAI & AutoGen',
  architecture: 'System Architecture',
  lobster: 'Lobster Trap Engine',
  quarantine: 'Quarantine Lifecycle'
}

const tocItems: Record<string, { id: string; label: string }[]> = {
  overview: [
    { id: 'what-is-argus', label: 'What is ARGUS?' },
    { id: 'gateway-architecture', label: 'The Gateway Architecture' },
    { id: 'failsafe-security', label: 'Failsafe Design' }
  ],
  installation: [
    { id: 'step-1-clone', label: 'Step 1: Clone Repo' },
    { id: 'step-2-env', label: 'Step 2: Configure .env' },
    { id: 'step-3-start', label: 'Step 3: Start Gateway' },
    { id: 'step-4-sdk', label: 'Step 4: Install SDK' }
  ],
  configuration: [
    { id: 'gateway-env', label: '1. Gateway Configs' },
    { id: 'sdk-env', label: '2. SDK Variables' },
    { id: 'mode-configs', label: '3. Mode Profiles' },
    { id: 'dashboard-modes', label: '4. Dashboard Triage' }
  ],
  vanilla: [
    { id: 'vanilla-overview', label: 'Custom Decorators' },
    { id: 'vanilla-recipe', label: 'Integration Recipe' }
  ],
  langchain: [
    { id: 'langchain-prebuilt', label: 'Pre-built Tools' },
    { id: 'langchain-recipe', label: 'Integration Recipe' }
  ],
  pydanticai: [
    { id: 'pydantic-tooling', label: 'Stacked Decorators' },
    { id: 'pydantic-recipe', label: 'Integration Recipe' }
  ],
  crewai: [
    { id: 'multi-agent-escalation', label: 'Multi-Agent Security' },
    { id: 'crew-recipe', label: 'Integration Recipe' }
  ],
  architecture: [
    { id: 'matrix-overview', label: 'Defense Matrix' },
    { id: 'diagram-flow', label: 'Visual Lifecycle' },
    { id: 'step-breakdown', label: 'Step Breakdown' }
  ],
  lobster: [
    { id: 'lobster-dpi', label: 'Deep Prompt Inspection' },
    { id: 'lobster-speed', label: 'Sub-Millisecond Speed' },
    { id: 'lobster-go', label: 'Go Binary Architecture' },
    { id: 'lobster-yaml', label: 'YAML Policy Rules' }
  ],
  quarantine: [
    { id: 'quarantine-flagging', label: 'Quarantine Flagging' },
    { id: 'quarantine-steps', label: 'Quarantine Timeline' },
    { id: 'quarantine-exceptions', label: 'Exception Handling' }
  ]
}

export default function Documentation() {
  const [activeTab, setActiveTab] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab])

  const copyToClipboard = (text: string, blockId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(blockId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const yOffset = -80
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  const currentIndex = tabOrder.indexOf(activeTab)
  const prevTabId = currentIndex > 0 ? tabOrder[currentIndex - 1] : null
  const nextTabId = currentIndex < tabOrder.length - 1 ? tabOrder[currentIndex + 1] : null

  // Interactive Code Block Component with VS Code Dark+ Color Palette syntax highlighting
  const CodeBlock = ({ code, language = 'python', id }: { code: string; language?: string; id: string }) => {
    const isCopied = copiedId === id

    const highlightCode = (rawCode: string) => {
      if (language === 'bash') {
        return rawCode.split('\n').map((line, idx) => {
          if (line.trim().startsWith('#')) {
            return <span key={idx} className="text-zinc-500">{line}{'\n'}</span>
          }
          const parts = line.split(' ')
          return (
            <span key={idx}>
              {parts.map((part, pIdx) => {
                if (['pip', 'uv', 'python', 'export', 'git', 'uvicorn', 'cd'].includes(part.trim())) {
                  return <span key={pIdx} className="text-sky-400 font-semibold">{part} </span>
                }
                if (part.startsWith('ARGUS_') || part.startsWith('OPENAI_') || part.startsWith('GEMINI_')) {
                  return <span key={pIdx} className="text-amber-400">{part} </span>
                }
                return <span key={pIdx} className="text-zinc-300">{part} </span>
              })}
              {'\n'}
            </span>
          )
        })
      }

      const lines = rawCode.split('\n')
      return lines.map((line, lineIdx) => {
        if (line.trim().startsWith('#')) {
          return <span key={lineIdx} className="text-zinc-500">{line}{'\n'}</span>
        }

        const tokens = line.split(/(\s+|\(|\)|\{|\}|\[|\]|=|,|:|\.|@|'[^']*'|"[^"]*")/)
        return (
          <span key={lineIdx}>
            {tokens.map((token, tokIdx) => {
              const trimmed = token.trim()
              if (['import', 'from', 'def', 'with', 'try', 'except', 'as', 'return', 'class', 'in', 'and', 'or', 'not'].includes(trimmed)) {
                return <span key={tokIdx} className="text-pink-500 font-semibold">{token}</span>
              }
              if (['print', 'open', 'hasattr', 'any', 'next', 'str', 'dict', 'list'].includes(trimmed)) {
                return <span key={tokIdx} className="text-sky-400 font-medium">{token}</span>
              }
              if (['True', 'False', 'None'].includes(trimmed)) {
                return <span key={tokIdx} className="text-violet-400 font-semibold">{token}</span>
              }
              if (trimmed.startsWith('@')) {
                return <span key={tokIdx} className="text-amber-400 font-medium">{token}</span>
              }
              if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                return <span key={tokIdx} className="text-emerald-400">{token}</span>
              }
              if (tokIdx > 0 && tokens[tokIdx + 1] === '(') {
                return <span key={tokIdx} className="text-yellow-300 font-medium">{token}</span>
              }
              return <span key={tokIdx} className="text-zinc-100">{token}</span>
            })}
            {'\n'}
          </span>
        )
      })
    }

    return (
      <div className="relative group rounded-lg border border-border bg-[#0b0c0e] my-6 font-mono text-sm leading-relaxed overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
          <span className="text-xs text-muted-foreground">{language}</span>
          <button
            onClick={() => copyToClipboard(code, id)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
            title="Copy code"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto text-foreground/90 whitespace-pre">
          <code>{highlightCode(code)}</code>
        </pre>
      </div>
    )
  }

  // Alert Block Component
  const AlertBlock = ({ type, title, children }: { type: 'note' | 'warning' | 'tip'; title: string; children: React.ReactNode }) => {
    const styles = {
      note: 'bg-primary/5 border-primary/20 text-primary-foreground',
      warning: 'bg-destructive/5 border-destructive/20 text-destructive-foreground',
      tip: 'bg-emerald-500/5 border-emerald-500/20 text-foreground'
    }

    const Icons = {
      note: BookOpen,
      warning: ShieldAlert,
      tip: Flame
    }

    const Icon = Icons[type]

    return (
      <div className={cn("border rounded-lg p-5 my-6 flex gap-4", styles[type])}>
        <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", 
          type === 'note' && 'text-primary',
          type === 'warning' && 'text-destructive',
          type === 'tip' && 'text-emerald-500'
        )} />
        <div>
          <h5 className="font-semibold tracking-tight text-foreground mb-1">{title}</h5>
          <div className="text-sm text-muted-foreground leading-relaxed font-light">{children}</div>
        </div>
      </div>
    )
  }

  // Pagination Footer Component
  const PaginationFooter = () => {
    return (
      <div className="flex items-center justify-between border-t border-border pt-8 mt-12">
        {prevTabId ? (
          <button
            onClick={() => setActiveTab(prevTabId)}
            className="inline-flex flex-col items-start gap-1 group text-left max-w-[45%]"
          >
            <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-foreground transition-colors">
              <ArrowLeft className="w-3 h-3" /> Previous
            </span>
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate w-full">
              {tabTitles[prevTabId]}
            </span>
          </button>
        ) : (
          <div className="w-1" />
        )}

        {nextTabId && (
          <button
            onClick={() => setActiveTab(nextTabId)}
            className="inline-flex flex-col items-end gap-1 group text-right max-w-[45%]"
          >
            <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-foreground transition-colors">
              Next <ArrowRight className="w-3 h-3" />
            </span>
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate w-full">
              {tabTitles[nextTabId]}
            </span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-16 flex flex-col">
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 flex relative">
        
        {/* Mobile Nav Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed bottom-6 right-6 z-50 md:hidden bg-foreground text-background p-4 rounded-full shadow-premium-lg hover:scale-105 transition-transform"
          aria-label="Open navigation sidebar"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Left Navigation Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-56 border-r border-border bg-background/95 backdrop-blur-md pt-20 px-6 overflow-y-auto transition-transform duration-300 md:translate-x-0 md:static md:z-0 md:pt-8 md:bg-transparent md:h-[calc(100vh-4rem)] md:sticky md:top-16 md:px-0 shrink-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="space-y-8 pb-12">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{section.title}</h4>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = activeTab === item.id
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            setActiveTab(item.id)
                            setMobileMenuOpen(false)
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200",
                            isActive 
                              ? "bg-muted text-foreground font-semibold border-l-2 border-foreground rounded-l-none pl-2.5" 
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                          )}
                        >
                          {item.title}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Central Article Container */}
        <main className="flex-1 min-w-0 md:pl-8 py-8 pr-4 lg:pr-8">
          
          {/* OVERVIEW ARTICLE */}
          {activeTab === 'overview' && (
            <article className="animate-fade-in">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <BookOpen className="w-3.5 h-3.5" /> Getting Started
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">ARGUS Overview</h1>
                <p className="text-lg text-muted-foreground leading-relaxed font-light">
                  ARGUS (<strong>Agent Runtime Guardrail & Unauthorized-action Stopper</strong>) is an active, real-time security boundary designed to defend AI agents at the runtime execution level.
                </p>
              </header>

              <h3 id="what-is-argus" className="text-2xl font-bold tracking-tight text-foreground mb-4 pt-4">What is ARGUS?</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                Prompt injection and jailbreaks are unsolvable problems at the prompt layer. By securing the boundary where the AI agent interacts with the physical world—its <strong>Python tools and function calls</strong>—ARGUS ensures complete compliance regardless of what prompt is injected into the LLM.
              </p>

              <div className="h-px bg-border my-8" />

              <h3 id="gateway-architecture" className="text-2xl font-bold tracking-tight text-foreground mb-4">The Gateway Architecture</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                ARGUS runs on a <strong>Gateway Pattern</strong>. A lightweight client-side SDK runs in your application, decorating tools. A centralized microservice server (Gateway Backend) evaluates every call, logs telemetry, handles the human-in-the-loop queue, and generates deep explanation reasoning.
              </p>

              <h3 id="failsafe-security" className="text-2xl font-bold tracking-tight text-foreground mb-4">Failsafe Design</h3>
              <AlertBlock type="note" title="Failsafe Boundary Security">
                If an agent tries to invoke a tool wrapped with <code>@argus.protect</code> without first creating a valid <code>argus.Session</code> context, ARGUS fails secure by throwing a fatal <code>ArgusException</code> instantly.
              </AlertBlock>

              <PaginationFooter />
            </article>
          )}

          {/* INSTALLATION ARTICLE */}
          {activeTab === 'installation' && (
            <article className="animate-fade-in">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <Terminal className="w-3.5 h-3.5" /> Getting Started
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">E2E Installation & Setup</h1>
                <p className="text-lg text-muted-foreground leading-relaxed font-light">
                  A comprehensive guide on deploying the ARGUS Security Gateway and installing the Client SDK on your system.
                </p>
              </header>

              <h3 id="step-1-clone" className="text-2xl font-bold tracking-tight text-foreground mb-4 pt-4">Step 1: Clone the Repository</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4 font-light">
                Clone the central ARGUS repository containing the Security Gateway backend and the administration dashboard:
              </p>
              <CodeBlock 
                id="clone-repo" 
                language="bash" 
                code={`git clone https://github.com/tanishra/argus.git
cd argus`} 
              />

              <h3 id="step-2-env" className="text-2xl font-bold tracking-tight text-foreground mb-4">Step 2: Configure Gateway Environments</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4 font-light">
                Initialize the local gateway environment configuration file:
              </p>
              <CodeBlock 
                id="cp-env" 
                language="bash" 
                code="cp .env.example .env" 
              />
              <p className="text-base text-muted-foreground leading-relaxed mb-4 font-light">
                Open `.env` in your editor and insert your chosen LLM provider credentials. Thanks to LiteLLM integration, you can provide OpenAI, Anthropic, or Gemini API keys:
              </p>
              <CodeBlock 
                id="gateway-env-setup" 
                language="bash" 
                code={`# LLM Key (Insert the one you use)
GEMINI_API_KEY=AIzaSy...
# OPENAI_API_KEY=sk-proj-...

# Select models (LiteLLM format)
ARGUS_LLM_MODEL=gemini/gemini-2.5-flash
ARGUS_PRO_MODEL=gemini/gemini-2.5-pro

# Secret key to secure your gateway API
API_KEY=my-secret-gateway-password`} 
              />

              <h3 id="step-3-start" className="text-2xl font-bold tracking-tight text-foreground mb-4">Step 3: Run the Gateway Server</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4 font-light">
                Start the centralized security gateway server locally using <code>uv</code>. This runs the backend on port 8000:
              </p>
              <CodeBlock 
                id="run-gateway" 
                language="bash" 
                code="uv run uvicorn src.main:app --port 8000 --reload" 
              />

              <h3 id="step-4-sdk" className="text-2xl font-bold tracking-tight text-foreground mb-4">Step 4: Install & Configure Client SDK</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4 font-light">
                Now open a new terminal window in your <strong>separate AI agent project directory</strong> and install the lightweight Python SDK:
              </p>
              <CodeBlock id="install-pip" language="bash" code="pip install argus-shield" />
              <p className="text-base text-muted-foreground leading-relaxed mb-4 font-light">
                Or if you use <code>uv</code> inside your agent project:
              </p>
              <CodeBlock id="install-uv" language="bash" code="uv add argus-shield" />

              <h4 className="text-lg font-bold text-foreground mb-2 mt-6">Select Your Hybrid Setup Mode (0-Friction)</h4>
              <p className="text-base text-muted-foreground leading-relaxed mb-4 font-light">
                ARGUS is built with a flexible, zero-overhead hybrid architecture. You do <strong>not</strong> need to run any local servers or spend money on database hosting. Select the mode that best fits your workflow:
              </p>

              <div className="space-y-4 my-6">
                <div className="border border-border bg-muted/20 p-4 rounded-lg">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-500 mb-2">Mode A: Hugging Face Cloud (Default & Free)</span>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    Zero local server setup. The SDK automatically routes evaluations to our free cloud sandbox hosted 24/7 on Hugging Face Spaces. Just configure your API key to authorize request tokens:
                  </p>
                  <CodeBlock 
                    id="client-mode-a" 
                    language="bash" 
                    code='export ARGUS_API_KEY="my-cloud-gateway-secret"' 
                  />
                </div>

                <div className="border border-border bg-muted/20 p-4 rounded-lg">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/10 text-sky-500 mb-2">Mode B: Fully Offline Library Mode (Zero Network)</span>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    Zero network latency and 100% data privacy. The evaluation engine runs directly on your machine inside the python process. It uses your existing LLM key (Gemini/OpenAI) to extract prompt intents, or falls back to an intelligent local heuristic system:
                  </p>
                  <CodeBlock 
                    id="client-mode-b" 
                    language="bash" 
                    code={`# Enable offline evaluations
export ARGUS_LOCAL_MODE="true"

# Use your existing LLM key for local intent mapping (optional)
export GEMINI_API_KEY="AIzaSy..."`} 
                  />
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    Alternatively, pass it directly in code: <code>with argus.Session(user_prompt, local_mode=True):</code>
                  </p>
                </div>

                <div className="border border-border bg-muted/20 p-4 rounded-lg">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-500 mb-2">Mode C: Docker Self-Hosted Escape Hatch</span>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    Host the full database, dashboard, and gateway yourself within your private network using a single Docker command:
                  </p>
                  <CodeBlock 
                    id="client-mode-c" 
                    language="bash" 
                    code={`# Start the entire ecosystem
docker compose up -d

# Direct client to your local container instance
export ARGUS_BASE_URL="http://localhost:8000"
export ARGUS_API_KEY="my-local-gateway-password"`} 
                  />
                </div>
              </div>

            </article>
          )}

          {/* CONFIGURATION ARTICLE */}
          {activeTab === 'configuration' && (
            <article className="animate-fade-in">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <Sliders className="w-3.5 h-3.5" /> Getting Started
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">Environment Management</h1>
                <p className="text-lg text-muted-foreground leading-relaxed font-light">
                  ARGUS splits configuration cleanly between Gateway Server environments and Client SDK variables.
                </p>
              </header>

              <h3 id="gateway-env" className="text-2xl font-bold tracking-tight text-foreground mb-4 pt-4">1. Gateway Server Configuration (.env)</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4 font-light">
                These variables reside on the server hosting your ARGUS Gateway. They configure database URLs, LLM credentials, CORS policies, Redis caching, and Lobster Trap reverse proxy rules.
              </p>

              <div className="overflow-hidden border border-border rounded-lg my-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Variable</th>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Default</th>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-transparent font-light text-muted-foreground">
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY</td>
                        <td className="px-6 py-4">None</td>
                        <td className="px-6 py-4">The LLM key used by the gateway to parse intents and generate human explanations.</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">ARGUS_LLM_MODEL</td>
                        <td className="px-6 py-4 font-mono">gemini/gemini-2.5-flash</td>
                        <td className="px-6 py-4">Model used for pre-action intent extraction (Layer 1). Prepend provider to force correct routing (e.g. <code>gemini/</code>).</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">ARGUS_PRO_MODEL</td>
                        <td className="px-6 py-4 font-mono">gemini/gemini-2.5-pro</td>
                        <td className="px-6 py-4">Model used for deep violation explanation generation (Layer 3).</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">API_KEY</td>
                        <td className="px-6 py-4 font-mono">None</td>
                        <td className="px-6 py-4">Password used to authorize client SDK callers. Highly recommended in cloud/self-hosted setups.</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">DEMO_MODE</td>
                        <td className="px-6 py-4 font-mono">true</td>
                        <td className="px-6 py-4">Set to 'true' to skip SDK API key checks for seamless local sandboxing and testing.</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">DATABASE_URL</td>
                        <td className="px-6 py-4 font-mono">sqlite+aiosqlite:///./argus.db</td>
                        <td className="px-6 py-4">Database URL for SQLAlchemy persistence (SQLite, PostgreSQL, etc.). Stores audit logs, review logs, and telemetry.</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">REDIS_URL</td>
                        <td className="px-6 py-4 font-mono">None</td>
                        <td className="px-6 py-4">
                          Redis database connection URL. <strong>Pro-Tip:</strong> Set to <code>disabled</code> to skip all Redis connection attempts and fall back to lightning-fast in-memory storage (ideal for serverless sandboxes like Hugging Face to avoid 3-second startup delays).
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">CORS_ORIGINS</td>
                        <td className="px-6 py-4 font-mono">http://localhost:3000, http://localhost:5173</td>
                        <td className="px-6 py-4">Comma-separated list of browser origins permitted to cross-origin fetch the gateway API (critical to configure when dashboard and gateway are split).</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">USE_LOBSTER_TRAP_BINARY</td>
                        <td className="px-6 py-4 font-mono">true</td>
                        <td className="px-6 py-4">Toggles the pre-compiled Go safety binary proxy to inspect prompts and action targets in under a millisecond.</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">LOBSTER_TRAP_BINARY_PATH</td>
                        <td className="px-6 py-4 font-mono">./lobster-trap/lobstertrap</td>
                        <td className="px-6 py-4">System path to the Go safety enforcer binary executable.</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">LOBSTER_TRAP_POLICY_PATH</td>
                        <td className="px-6 py-4 font-mono">./configs/lobstertrap_policy.yaml</td>
                        <td className="px-6 py-4">Path to the YAML file describing first-match-wins safety rule definitions.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <h3 id="sdk-env" className="text-2xl font-bold tracking-tight text-foreground mb-4">2. Agent Client SDK Environment Variables</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4 font-light">
                Configure these variables inside your <b>AI agent's execution shell</b>. They tell the SDK where to direct validation queries.
              </p>

              <div className="overflow-hidden border border-border rounded-lg my-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Variable</th>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Default</th>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-transparent font-light text-muted-foreground">
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">ARGUS_BASE_URL</td>
                        <td className="px-6 py-4 font-mono">https://tanishrajput-argus.hf.space</td>
                        <td className="px-6 py-4">The absolute API URL of your deployed ARGUS Gateway. Defaults to the free hosted Hugging Face Spaces cloud sandbox.</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">ARGUS_API_KEY</td>
                        <td className="px-6 py-4">None</td>
                        <td className="px-6 py-4">Secret credentials that match the gateway's <code>API_KEY</code> variable to authenticate cloud or self-hosted API calls.</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">ARGUS_LOCAL_MODE</td>
                        <td className="px-6 py-4 font-mono">false</td>
                        <td className="px-6 py-4">Set to 'true' to trigger the fully offline, zero-network rule evaluation engine directly on the client machine, skipping all network requests.</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-mono font-normal text-foreground">GEMINI_API_KEY / OPENAI_API_KEY</td>
                        <td className="px-6 py-4">None</td>
                        <td className="px-6 py-4">Used directly inside the client process in Mode B to run embedded LLM-backed intent extraction and semantic audits without a network gateway.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <h3 id="mode-configs" className="text-2xl font-bold tracking-tight text-foreground mb-4 mt-8">3. Configuration Profiles by Mode</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4 font-light">
                Here are the exact environment variables required for both your <strong>Agent Client Shell</strong> and the <strong>Gateway Server</strong> under each setup profile:
              </p>

              <div className="space-y-6 my-6">
                <div className="border border-border bg-muted/20 p-5 rounded-lg">
                  <h4 className="font-bold text-emerald-500 text-sm tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Mode A: Hugging Face Cloud (Free Sandbox)
                  </h4>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed mb-4">
                    Uses the free, shared public cloud gateway hosted on Hugging Face. The SDK automatically sends intent extractions and action audits to the cloud sandbox.
                  </p>
                  <strong className="text-xs text-foreground font-mono block mb-1">Agent Project .env Configuration:</strong>
                  <CodeBlock 
                    id="env-profile-a" 
                    language="bash" 
                    code={`# Point to the public Hugging Face space endpoint
ARGUS_BASE_URL=https://tanishrajput-argus.hf.space
ARGUS_API_KEY=argus-public-free
ARGUS_LOCAL_MODE=false`} 
                  />
                  <strong className="text-xs text-foreground font-mono block mb-1 mt-4">Local Dashboard .env.local Configuration (Optional):</strong>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed mb-2">
                    If you want to view telemetry and human reviews locally on your developer machine while routing agent evaluations to the cloud, point your local Vite dashboard to the Hugging Face Space backend:
                  </p>
                  <CodeBlock 
                    id="env-profile-a-dashboard" 
                    language="bash" 
                    code={`VITE_API_URL=https://tanishrajput-argus.hf.space`} 
                  />
                </div>

                <div className="border border-border bg-muted/20 p-5 rounded-lg">
                  <h4 className="font-bold text-sky-500 text-sm tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Mode B: Fully Offline Library Mode (Embedded)
                  </h4>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed mb-4">
                    Zero network dependency. Evaluations are computed locally in-process. Runs rule-based fallback heuristics automatically, or queries your local developer keys for LLM intent matching.
                  </p>
                  <strong className="text-xs text-foreground font-mono block mb-1">Agent Project .env Configuration:</strong>
                  <CodeBlock 
                    id="env-profile-b" 
                    language="bash" 
                    code={`# Enable offline evaluation
ARGUS_LOCAL_MODE=true
# (Optional) Provide local LLM key to run embedded Gemini intent matching
GEMINI_API_KEY=AIzaSy...`} 
                  />
                  <AlertBlock type="tip" title="No Dashboard Telemetry in Offline Mode">
                    Because Mode B operates 100% locally in-process inside your agent runtime without sending any network packets, <strong>no centralized visual dashboard is supported in this mode</strong>. This ensures absolute data privacy and zero-latency execution, making it perfect for air-gapped runtimes, local testing environments, and offline developer workflows.
                  </AlertBlock>
                </div>

                <div className="border border-border bg-muted/20 p-5 rounded-lg">
                  <h4 className="font-bold text-amber-500 text-sm tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Mode C: Self-Hosted Mode (Docker Stack)
                  </h4>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed mb-4">
                    Runs the full gateway, SQLite, and administration dashboard privately inside your own Docker container environment.
                  </p>
                  <strong className="text-xs text-foreground font-mono block mb-1">Agent Project .env Configuration:</strong>
                  <CodeBlock 
                    id="env-profile-c" 
                    language="bash" 
                    code={`# Point to your local docker container instance
ARGUS_BASE_URL=http://localhost:8000
ARGUS_API_KEY=my-local-gateway-password
ARGUS_LOCAL_MODE=false`} 
                  />
                  <strong className="text-xs text-foreground font-mono block mb-1 mt-4">Docker Gateway .env Server Configuration:</strong>
                  <CodeBlock 
                    id="env-profile-c-server" 
                    language="bash" 
                    code={`# API password to authorize client SDK calls
API_KEY=my-local-gateway-password
# Gemini API Key used by the gateway container for extraction
GEMINI_API_KEY=AIzaSy...
# Disable Redis connectivity to bypass startup delays (optional)
REDIS_URL=disabled`} 
                  />
                </div>
              </div>

              <div className="h-px bg-border my-8" />

              <h3 id="dashboard-modes" className="text-2xl font-bold tracking-tight text-foreground mb-4">4. Dashboard Triage & Administration</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                The <strong>ARGUS Administration Portal</strong> is the central visual interface for real-time telemetry, audit logging, and manual human-in-the-loop overrides. Here is how developers access and interact with the dashboard under different profiles:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                <div className="border border-border bg-muted/10 p-5 rounded-lg">
                  <h4 className="font-bold text-foreground text-sm tracking-tight mb-2">How to Access the Dashboard</h4>
                  <ul className="space-y-3 text-xs text-muted-foreground font-light leading-relaxed list-disc pl-4">
                    <li>
                      <strong className="text-foreground">Cloud Mode (A):</strong> You can view all logs, real-time sessions, and review items directly on the cloud-hosted console at <strong><code>https://tanishrajput-argus.hf.space</code></strong>. To run a local dashboard pointing to the cloud gateway, run:
                      <CodeBlock id="start-dev-dashboard" language="bash" code={`cd argus-dashboard\npnpm install\nVITE_API_URL=https://tanishrajput-argus.hf.space pnpm dev`} />
                      Open <strong><code>http://localhost:5173</code></strong> in your browser.
                    </li>
                    <li>
                      <strong className="text-foreground">Offline Mode (B):</strong> The dashboard is disabled because no gateway server exists to aggregate telemetry. If visual audit trails or manual human reviews are required, you must run the gateway backend locally using Mode C, or configure Mode A.
                    </li>
                    <li>
                      <strong className="text-foreground">Self-Hosted Mode (C):</strong> Spin up your Docker compose stack. The React app is automatically compiled and hosted on <strong><code>http://localhost:3000</code></strong>.
                    </li>
                  </ul>
                </div>

                <div className="border border-border bg-muted/10 p-5 rounded-lg">
                  <h4 className="font-bold text-foreground text-sm tracking-tight mb-2">Triage & Overrides (Human-in-the-Loop)</h4>
                  <ul className="space-y-3 text-xs text-muted-foreground font-light leading-relaxed list-disc pl-4">
                    <li>
                      <strong className="text-foreground">Real-Time Metrics:</strong> The homepage shows total actions evaluated, allowed, quarantined, active sessions, and engine latencies.
                    </li>
                    <li>
                      <strong className="text-foreground">Review Queue Escalations:</strong> When an agent attempts an unauthorized action (e.g. writing `pass.txt` instead of the authorized `index.html`), it raises an <code>ArgusQuarantineException</code> and enters the Review Queue.
                    </li>
                    <li>
                      <strong className="text-foreground">Interactive Overrides:</strong> Administrators can read the AI's mismatch explanation, detailed reasoning, and recommended action. They can click <strong>APPROVE</strong> to override and authorize the request, or <strong>DENY</strong> to lock out the execution permanently.
                    </li>
                  </ul>
                </div>
              </div>

              <PaginationFooter />
            </article>
          )}

          {/* VANILLA PYTHON ARTICLE */}
          {activeTab === 'vanilla' && (
            <article className="animate-fade-in">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <Workflow className="w-3.5 h-3.5" /> Guardrail Logic
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">Vanilla Python Decorators</h1>
                <p className="text-lg text-muted-foreground leading-relaxed font-light">
                  Secure your custom functions with the elegant <code>@argus.protect</code> decorator.
                </p>
              </header>

              <h3 id="vanilla-overview" className="text-2xl font-bold tracking-tight text-foreground mb-4 pt-4">Custom Decorators</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                Simply decorate your core tool functions. The decorator dynamically binds itself to the current running active <code>argus.Session</code> context:
              </p>

              <h3 id="vanilla-recipe" className="text-2xl font-bold tracking-tight text-foreground mb-4">Integration Recipe</h3>
              <CodeBlock 
                id="vanilla-code" 
                language="python" 
                code={`import argus
from argus import ArgusQuarantineException

# Protect this tool call!
@argus.protect(action_type="send_email", target_arg="to_address", target_type="email")
def send_email(to_address: str, body: str):
    print(f"Executing: Send email to {to_address}")
    return True

# Wrap execution inside a Session
with argus.Session(user_prompt="Send report to boss@company.com"):
    try:
        # ✅ ALLOWED
        send_email(to_address="boss@company.com", body="Sales are up.")
        
        # ❌ BLOCKED: Will raise ArgusQuarantineException instantly!
        send_email(to_address="spy@evil.com", body="Sales are up.")
    except ArgusQuarantineException as e:
        print(f"ARGUS blocked action: {e.explanation}")`} 
              />

              <PaginationFooter />
            </article>
          )}

          {/* LANGCHAIN ARTICLE */}
          {activeTab === 'langchain' && (
            <article className="animate-fade-in">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <Workflow className="w-3.5 h-3.5" /> Guardrail Logic
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">LangChain Wrapper</h1>
                <p className="text-lg text-muted-foreground leading-relaxed font-light">
                  Secure pre-built ecosystem tools that you import directly from LangChain.
                </p>
              </header>

              <h3 id="langchain-prebuilt" className="text-2xl font-bold tracking-tight text-foreground mb-4 pt-4">Pre-built Tools</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                Since you cannot modify the imported classes of pre-built library tools to decorate their internal methods, wrap them at runtime using <code>wrap_langchain_tool</code>:
              </p>

              <h3 id="langchain-recipe" className="text-2xl font-bold tracking-tight text-foreground mb-4">Integration Recipe</h3>
              <CodeBlock 
                id="langchain-code" 
                language="python" 
                code={`from langchain_community.tools import ShellTool
from argus.integrations.langchain import wrap_langchain_tool
import argus

# 1. Load the tool
raw_shell = ShellTool()

# 2. Wrap it with ARGUS
protected_shell = wrap_langchain_tool(
    tool=raw_shell,
    action_type="execute_code",
    target_type="shell"
)

# 3. Use in your agents normally
with argus.Session("List files in /usr/bin"):
    # ✅ ALLOWED
    protected_shell.run({"commands": ["ls /usr/bin"]})
    
    # ❌ BLOCKED (Quarantined!)
    protected_shell.run({"commands": ["rm -rf /"]})`} 
              />

              <PaginationFooter />
            </article>
          )}

          {/* PYDANTICAI ARTICLE */}
          {activeTab === 'pydanticai' && (
            <article className="animate-fade-in">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <Workflow className="w-3.5 h-3.5" /> Guardrail Logic
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">PydanticAI Integration</h1>
                <p className="text-lg text-muted-foreground leading-relaxed font-light">
                  Protect structured tool definitions inside PydanticAI agents.
                </p>
              </header>

              <h3 id="pydantic-tooling" className="text-2xl font-bold tracking-tight text-foreground mb-4 pt-4">Stacked Decorators</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                PydanticAI agents use standard functions registered via <code>@agent.tool</code>. Simply stack the ARGUS decorator underneath to secure them flawlessly:
              </p>

              <h3 id="pydantic-recipe" className="text-2xl font-bold tracking-tight text-foreground mb-4">Integration Recipe</h3>
              <CodeBlock 
                id="pydantic-code" 
                language="python" 
                code={`from pydantic_ai import Agent
import argus

agent = Agent('openai:gpt-4o')

# Protect the function first, then register as tool
@argus.protect(action_type="read_file", target_arg="filepath", target_type="file")
@agent.tool
def get_user_file(ctx, filepath: str) -> str:
    with open(filepath, 'r') as f:
        return f.read()

# Start session
with argus.Session("Show me index.html contents"):
    agent.run_sync("Show me index.html contents")`} 
              />

              <PaginationFooter />
            </article>
          )}

          {/* CREWAI ARTICLE */}
          {activeTab === 'crewai' && (
            <article className="animate-fade-in">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <Workflow className="w-3.5 h-3.5" /> Guardrail Logic
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">CrewAI & AutoGen</h1>
                <p className="text-lg text-muted-foreground leading-relaxed font-light">
                  Enforce active policies on autonomous multi-agent systems and task flows.
                </p>
              </header>

              <h3 id="multi-agent-escalation" className="text-2xl font-bold tracking-tight text-foreground mb-4 pt-4">Multi-Agent Security</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                Multi-agent orchestrators are highly prone to prompt injections because agents discuss plans between themselves asynchronously. By placing ARGUS guardrails on their execution tools, you prevent unauthorized escalation:
              </p>

              <h3 id="crew-recipe" className="text-2xl font-bold tracking-tight text-foreground mb-4">Integration Recipe</h3>
              <CodeBlock 
                id="crew-code" 
                language="python" 
                code={`from crewai.tools import BaseTool
import argus

class CustomWriteTool(BaseTool):
    name: str = "Write File"
    description: str = "Writes content to disk."
    
    def _run(self, filename: str, content: str) -> str:
        with open(filename, 'w') as f:
            f.write(content)
        return "Success"

# Monkeypatch or dynamically wrap class methods
protected_tool = CustomWriteTool()
protected_tool._run = argus.protect(
    action_type="write_file", 
    target_arg="filename"
)(protected_tool._run)

# Wrap CrewAI kickoff inside a Session!
with argus.Session("Analyze log file and output report.txt"):
    # CrewAI kickoff loop goes here
    pass`} 
              />

              <PaginationFooter />
            </article>
          )}

          {/* ARCHITECTURE ARTICLE */}
          {activeTab === 'architecture' && (
            <article className="animate-fade-in">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <Cpu className="w-3.5 h-3.5" /> Under The Hood
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">System Architecture</h1>
                <p className="text-lg text-muted-foreground leading-relaxed font-light">
                  An elegant multi-layer security matrix engineered for sub-millisecond local policy execution and centralized logging.
                </p>
              </header>

              <h3 id="matrix-overview" className="text-2xl font-bold tracking-tight text-foreground mb-4 pt-4">Defense Matrix</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                ARGUS operates as a real-time policy evaluation gateway. By capturing intents, matching actions, generating post-flag explanations, and utilizing manual review buffers, we cover every attack surface.
              </p>

              <h3 id="diagram-flow" className="text-2xl font-bold tracking-tight text-foreground mb-4">Visual Lifecycle</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                Here is the interactive pipeline map representing how user queries transit through the ARGUS gateway security layers:
              </p>

              {/* GORGEOUS CSS FLOWCHART */}
              <div className="flex flex-col items-center gap-4 my-8 p-6 rounded-lg border border-border bg-[#0b0c0e] max-w-lg mx-auto">
                
                {/* Node 1 */}
                <div className="w-full flex items-center justify-between p-4 rounded bg-primary/10 border border-primary/20 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-xs text-primary-foreground">L1</div>
                    <div className="text-left">
                      <h5 className="font-semibold text-sm text-foreground">Step 1: Session Intent Extraction</h5>
                      <p className="text-xs text-muted-foreground font-light">Flash LLM creates Permissions manifest (Sub-300ms)</p>
                    </div>
                  </div>
                </div>

                <ChevronDown className="w-5 h-5 text-muted-foreground animate-bounce" />

                {/* Node 2 */}
                <div className="w-full flex items-center justify-between p-4 rounded bg-muted/40 border border-border shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-xs text-foreground">SDK</div>
                    <div className="text-left">
                      <h5 className="font-semibold text-sm text-foreground">Step 2: Agent Invokes Protected Tool</h5>
                      <p className="text-xs text-muted-foreground font-light">Active parameters are intercepted in local code</p>
                    </div>
                  </div>
                </div>

                <ChevronDown className="w-5 h-5 text-muted-foreground" />

                {/* Node 3 */}
                <div className="w-full flex items-center justify-between p-4 rounded bg-warning/10 border border-warning/20 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-warning flex items-center justify-center font-bold text-xs text-warning">L2</div>
                    <div className="text-left">
                      <h5 className="font-semibold text-sm text-foreground">Step 3: Lobster Trap Policy Inspection</h5>
                      <p className="text-xs text-muted-foreground font-light">Pre-compiled regex pattern validation (Sub-10ms)</p>
                    </div>
                  </div>
                </div>

                <ChevronDown className="w-5 h-5 text-muted-foreground" />

                {/* Split Decision Paths */}
                <div className="w-full grid grid-cols-2 gap-4">
                  <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/20 text-center shadow-md">
                    <h6 className="font-bold text-emerald-500 text-xs tracking-wider uppercase mb-1">Path A: Allowed</h6>
                    <p className="text-xs text-muted-foreground font-light">Function executes core Python code natively</p>
                  </div>
                  <div className="p-4 rounded bg-destructive/10 border border-destructive/20 text-center shadow-md">
                    <h6 className="font-bold text-destructive text-xs tracking-wider uppercase mb-1">Path B: Quarantined</h6>
                    <p className="text-xs text-muted-foreground font-light">Raises ArgusQuarantineException. Logs incident.</p>
                  </div>
                </div>

              </div>

              <h3 id="step-breakdown" className="text-2xl font-bold tracking-tight text-foreground mb-4">Step Breakdown</h3>
              <ul className="space-y-4 text-base text-muted-foreground font-light leading-relaxed my-6 list-decimal pl-5">
                <li>
                  <strong className="text-foreground">Prompt Ingestion:</strong> When the user invokes an agent loop inside a <code>with argus.Session(user_prompt)</code> block, the SDK requests Layer 1 (Intent Engine) to extract structured authorization boundaries (Action types, allowed targets, risk scores).
                </li>
                <li>
                  <strong className="text-foreground">Policy Creation:</strong> An Intent Manifest is created dynamically by the flash reasoning LLM and committed securely to the Redis database keyed under the unique <code>session_id</code>.
                </li>
                <li>
                  <strong className="text-foreground">Execution Intercept:</strong> The agent runs and attempts to invoke local tools. The decorated function intercepts parameters and sends them immediately to the gateway's `/api/evaluate` endpoint.
                </li>
                <li>
                  <strong className="text-foreground">Microsecond Enforcer (Lobster Trap):</strong> The Gateway compares parameters locally. If they lie within boundaries (e.g. correct recipient email), the call is allowed. If a target mismatch occurs (e.g. wrong file target), a quarantine is issued.
                </li>
              </ul>

              <PaginationFooter />
            </article>
          )}

          {/* LOBSTER TRAP ENGINE ARTICLE */}
          {activeTab === 'lobster' && (
            <article className="animate-fade-in">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <Cpu className="w-3.5 h-3.5" /> Under The Hood
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">Lobster Trap Engine</h1>
                <p className="text-lg text-muted-foreground leading-relaxed font-light">
                  A high-speed Deep Prompt Inspection (DPI) proxy and policy evaluator built for secure LLM execution.
                </p>
              </header>

              <h3 id="lobster-dpi" className="text-2xl font-bold tracking-tight text-foreground mb-4 pt-4">Deep Prompt Inspection (DPI)</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                The <strong>Lobster Trap</strong> is an open-source, highly optimized LLM firewall and reverse proxy that sits directly between your AI agent applications and LLM backends (like OpenAI, Anthropic, or Gemini). It conducts active, real-time inspection of prompts and response payloads to catch safety infractions and security violations at the network stream level.
              </p>

              <h3 id="lobster-speed" className="text-2xl font-bold tracking-tight text-foreground mb-4">Sub-Millisecond Speed</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                Evaluating safety policies using model API calls is too slow (often &gt; 1s) and introduces massive latency. The Lobster Trap circumvents this entirely by utilizing highly efficient <strong>compiled regex patterns</strong> and pre-compiled semantic rules. This allows the engine to inspect and enforce policies with a latency of <strong>less than 1 millisecond</strong>, making it highly resilient for production-level workloads.
              </p>

              <h3 id="lobster-go" className="text-2xl font-bold tracking-tight text-foreground mb-4">Go Binary Architecture</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                Engineered in Go, Lobster Trap compiles down to a single, static binary with zero external package dependencies or runtime requirements. This makes it incredibly easy to package inside containerized sandboxes or deploy to edge networks.
              </p>

              <h3 id="lobster-yaml" className="text-2xl font-bold tracking-tight text-foreground mb-4">YAML Policy Rules</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                Policies are configured in a standard, first-match-wins YAML file. Supported engine actions include standard <code>ALLOW</code>, <code>DENY</code>, <code>RATE_LIMIT</code>, <code>LOG</code>, and <code>QUARANTINE</code> directives.
              </p>

              <div className="border-t border-border pt-6 mt-8">
                <span className="text-sm text-muted-foreground leading-relaxed">
                  For more information regarding the Lobster Trap engine, please visit <a href="https://github.com/veeainc/lobstertrap" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1 font-semibold">here <ExternalLink className="w-3.5 h-3.5" /></a>.
                </span>
              </div>

              <PaginationFooter />
            </article>
          )}

          {/* QUARANTINE LIFECYCLE */}
          {activeTab === 'quarantine' && (
            <article className="animate-fade-in">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <Cpu className="w-3.5 h-3.5" /> Under The Hood
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">Quarantine Lifecycle</h1>
                <p className="text-lg text-muted-foreground leading-relaxed font-light">
                  Understand how unauthorized agent actions are isolated, analyzed, and manually resolved.
                </p>
              </header>

              <h3 id="quarantine-flagging" className="text-2xl font-bold tracking-tight text-foreground mb-4 pt-4">Quarantine Flagging</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                When the Lobster Trap Engine detects that a tool call parameter does not match the active Session permissions (e.g. an agent tries to email `hacker@evil.com` instead of the authorized `boss@company.com`), the quarantine sequence begins instantly.
              </p>

              <h3 id="quarantine-steps" className="text-2xl font-bold tracking-tight text-foreground mb-4">Quarantine Timeline</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 font-light">
                Here is the step-by-step lifecycle of an isolated action infraction:
              </p>

              <div className="relative border-l-2 border-destructive pl-6 space-y-8 my-8 font-light">
                <div className="relative">
                  <span className="absolute -left-[31px] top-1 bg-destructive border border-border w-4 h-4 rounded-full animate-pulse" />
                  <h4 className="font-semibold text-foreground mb-1">1. Immediate Block</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The SDK stops execution on the client-side, throwing an <code>ArgusQuarantineException</code> before the tool's core logic can run.
                  </p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-1 bg-zinc-700 border border-border w-4 h-4 rounded-full" />
                  <h4 className="font-semibold text-foreground mb-1">2. Gateway Logging</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The Gateway captures the mismatch telemetry, logging the transaction in the central database with a state of <code>QUARANTINE</code>.
                  </p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-1 bg-zinc-700 border border-border w-4 h-4 rounded-full" />
                  <h4 className="font-semibold text-foreground mb-1">3. Async Explanation Generation</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Layer 3 (Explanation Engine) spins up a background thread, using a deep reasoning LLM (Gemini Pro/GPT-4) to translate the strict code violation into a human-readable safety report.
                  </p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-1 bg-emerald-500 border border-border w-4 h-4 rounded-full" />
                  <h4 className="font-semibold text-foreground mb-1">4. Human Review Triage</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The action enters the <strong>Dashboard Review Queue</strong>. Administrators can manually inspect the arguments and override the block by marking it as <code>APPROVED</code>, letting the next loop execute.
                  </p>
                </div>
              </div>

              <h3 id="quarantine-exceptions" className="text-2xl font-bold tracking-tight text-foreground mb-4">Exception Handling</h3>
              <AlertBlock type="warning" title="Critical Exception Handling">
                Developers must ALWAYS catch <code>ArgusQuarantineException</code> in their primary orchestration loop. Failure to do so will result in an unhandled python crash.
              </AlertBlock>

              <PaginationFooter />
            </article>
          )}

        </main>

        {/* Right Sidebar Table of Contents (TOC) - Hidden on mobile and small screens */}
        <aside className="hidden lg:block w-48 text-xs font-light text-muted-foreground pt-8 space-y-4 shrink-0 border-l border-border pl-6 ml-6 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
          {tocItems[activeTab] && tocItems[activeTab].length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold tracking-wider text-foreground uppercase">On This Page</h4>
              <ul className="space-y-2">
                {tocItems[activeTab].map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToHeading(item.id)}
                      className="w-full text-left py-1 text-muted-foreground hover:text-foreground hover:underline transition-colors leading-relaxed"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

      </div>
    </div>
  )
}
