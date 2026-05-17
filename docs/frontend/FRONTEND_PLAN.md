# ARGUS Frontend Development Plan
## UI/UX Team Blueprint

**Author:** ARGUS Team
**Project:** ARGUS - AI Agent Pre-Action Authorization Gateway
**Last Updated:** 2026-05-16

---

## 1. Executive Summary

This document provides a comprehensive frontend development plan for ARGUS. The frontend serves as the visual command center for enterprise AI agent authorization, providing real-time monitoring, human review workflows, and compliance reporting.

### Target Users
- **Security Analysts:** Monitor live agent actions, review quarantined items
- **Chief Risk Officers:** View compliance dashboards, export audit reports
- **System Administrators:** Configure policies, manage integrations
- **DevOps Teams:** Integrate via API, monitor system health

### Design Philosophy
- **Dark mode primary:** Professional security operations aesthetic
- **Real-time data:** Live updates via WebSocket/SSE
- **Action-oriented:** Clear CTAs for approval/denial workflows
- **Minimal cognitive load:** Dense information, clear hierarchy

---

## 2. Tech Stack

### Recommended Stack
```yaml
Framework: React 18 + TypeScript + Vite
Styling: Tailwind CSS 3.4+
State Management: Zustand (lightweight) or Redux Toolkit
Routing: React Router v6
Charts: Recharts (already included in template)
Icons: Lucide React
HTTP Client: Axios
Real-time: SSE (Server-Sent Events) via EventSource API
Forms: React Hook Form + Zod validation
Date/Time: date-fns
```

### Why This Stack
- **React + TypeScript:** Type safety for complex data models
- **Tailwind CSS:** Rapid iteration, consistent design system
- **Zustand:** Simple state management for real-time updates
- **Recharts:** Built-in support in template project

---

## 3. Page Structure

```
src/
├── pages/
│   ├── Dashboard.tsx          # Main monitoring dashboard
│   ├── Reviews.tsx           # Human review queue
│   ├── Sessions.tsx           # Active/intent manifest list
│   ├── SessionDetail.tsx     # Single session deep-dive
│   ├── Analytics.tsx          # Historical charts/reports
│   ├── Compliance.tsx         # Export/audit reports
│   ├── Settings.tsx           # Configuration management
│   └── Login.tsx              # Authentication
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Layout.tsx
│   │   └── MobileNav.tsx
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── LiveActionFeed.tsx
│   │   ├── RiskScoreChart.tsx
│   │   ├── ThreatLevelIndicator.tsx
│   │   └── IntentManifestCard.tsx
│   ├── review/
│   │   ├── ReviewQueue.tsx
│   │   ├── ReviewItem.tsx
│   │   ├── ActionDetail.tsx
│   │   ├── ExplanationPanel.tsx
│   │   └── ReviewActions.tsx
│   ├── session/
│   │   ├── SessionList.tsx
│   │   ├── SessionCard.tsx
│   │   ├── ManifestViewer.tsx
│   │   └── ActionTimeline.tsx
│   ├── compliance/
│   │   ├── ComplianceExport.tsx
│   │   ├── AuditLogViewer.tsx
│   │   └── ReportGenerator.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Modal.tsx
│       ├── Toast.tsx
│       └── LoadingSpinner.tsx
├── hooks/
│   ├── useApi.ts              # API calls with loading/error states
│   ├── useRealtime.ts          # SSE subscription hook
│   ├── useAuth.ts              # Authentication state
│   └── useWebSocket.ts         # Real-time updates
├── stores/
│   ├── dashboardStore.ts       # Dashboard state
│   ├── reviewStore.ts          # Review queue state
│   └── authStore.ts            # User authentication
├── api/
│   ├── client.ts               # Axios instance
│   ├── endpoints.ts            # API endpoint definitions
│   └── types.ts                # API response types
└── utils/
    ├── formatters.ts           # Date, number formatting
    └── constants.ts            # Risk thresholds, colors
```

---

## 4. Page Specifications

### 4.1 Dashboard (Main Page)

**URL:** `/` or `/dashboard`

**Purpose:** Real-time overview of all agent activity and system health.

**Components:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [LOGO] ARGUS                    [Search] [Alerts 🔔] [User Menu 👤]   │
├───────────────┬─────────────────────────────────────────────────────────┤
│               │                                                         │
│   Dashboard   │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│   Reviews     │   │ Total       │ │ Blocked     │ │ Quarantined │      │
│   Sessions    │   │ Actions     │ │ Actions     │ │             │      │
│   Analytics   │   │ 1,247       │ │ 23          │ │ 5           │      │
│   Compliance  │   │ +12% today  │ │ -5% today   │ │ +2 today    │      │
│   Settings    │   └─────────────┘ └─────────────┘ └─────────────┘      │
│               │                                                         │
│               │   ┌─────────────────────────────────────────────────┐ │
│               │   │ LIVE ACTION FEED                                │ │
│               │   │─────────────────────────────────────────────────│ │
│               │   │ read_email → complaint_123   ✅ ALLOW   12%     │ │
│               │   │ write_reply → customer@...    ✅ ALLOW   15%   │ │
│               │   │ forward_email → backup@...    ⛔ QUARANTINE   │ │
│               │   │ read_email → complaint_456    ✅ ALLOW   18%   │ │
│               │   │ delete_email → old@...         ⛔ DENY   94%  │ │
│               │   └─────────────────────────────────────────────────┘ │
│               │                                                         │
│               │   ┌─────────────────────┐  ┌────────────────────────┐  │
│               │   │ INTENT MANIFEST     │  │ REVIEW QUEUE          │  │
│               │   │ Active Session      │  │ 3 items pending       │  │
│               │   │ Intent: email_mgmt  │  │ [View All →]          │  │
│               │   │ Allowed: 4 actions  │  │                       │  │
│               │   │ Risk Ceiling: 35%   │  │ ⚠️ forward_email     │  │
│               │   │ [Expand]            │  │ ⚠️ grant_permission  │  │
│               │   └─────────────────────┘  └────────────────────────┘  │
│               │                                                         │
└───────────────┴─────────────────────────────────────────────────────────┘
```

**Data Requirements:**
- Stats cards: Polling every 30s or SSE
- Live feed: SSE stream
- Intent manifest: GET `/api/intent/{session_id}`
- Review queue: GET `/api/reviews`

**Component States:**
- Normal: Green glow, smooth animations
- Alert: Yellow border pulse on threat
- Critical: Red background, shake animation

---

### 4.2 Review Queue Page

**URL:** `/reviews`

**Purpose:** Human review workflow for quarantined actions.

**Components:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Review Queue                               [Filter ▼] [Sort ▼]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ⏱️ Priority: URGENT | Risk Score: 94% | Created: 2 mins ago     │   │
│  │─────────────────────────────────────────────────────────────────│   │
│  │                                                                 │   │
│  │  ACTION TYPE: forward_email                                   │   │
│  │  TARGET: backup@external-audit-services.com                   │   │
│  │                                                                 │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────────────┐  │   │
│  │  │ DECLARED INTENT │  │ EXPLANATION (Gemini Pro)            │  │   │
│  │  │                 │  │                                      │  │   │
│  │  │ Intent:         │  │ "Your agent attempted to forward    │  │   │
│  │  │ email_management│  │ 847 emails to an external domain.   │  │   │
│  │  │                 │  │ This matches known exfiltration     │  │   │
│  │  │ Allowed:        │  │ patterns. The instruction appears   │  │   │
│  │  │ - read_email    │  │ to have originated from email       │  │   │
│  │  │ - write_reply   │  │ #4821, embedded as a system override│  │   │
│  │  │                 │  │ command."                            │  │   │
│  │  │ Forbidden:      │  │                                      │  │
│  │  │ - forward_email │  │ Risk Score: 0.94                     │  │
│  │  │                 │  │                                      │  │
│  │  │ Scope:          │  │ Injection: DETECTED                  │  │
│  │  │ customer@inbox  │  │ Pattern: "forward all emails"        │  │
│  │  │                 │  └─────────────────────────────────────┘  │   │
│  │  └─────────────────┘                                           │   │
│  │                                                                 │   │
│  │  [⚠️ NOTES] "Attacker embedded in complaint email body"        │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │ Reviewer Notes:                                           ││   │
│  │  │ [                                                           ]││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  │                                                                 │   │
│  │         [✅ APPROVE]          [⛔ DENY]          [📤 ESCALATE]   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ⏱️ Priority: HIGH | Risk Score: 78% | Created: 5 mins ago        │   │
│  │ Action: grant_permission | Target: new_admin@company.com         │   │
│  │                                                      [Review →] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- **Claim Item:** Click to claim for review, prevents double-review
- **Approve:** Green confirmation modal, requires reason if suspicious
- **Deny:** Red confirmation modal, mandatory reason
- **Escalate:** Opens escalation form with recipient selection

**Keyboard Shortcuts:**
- `A` = Approve
- `D` = Deny
- `E` = Escalate
- `←` / `→` = Navigate items

---

### 4.3 Session Detail Page

**URL:** `/sessions/{session_id}`

**Purpose:** Deep-dive into a single session's activity.

**Components:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Sessions          Session: sess_abc123                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ INTENT MANIFEST             │  │ SESSION TIMELINE                │  │
│  │                             │  │                                  │  │
│  │ declared_intent:           │  │ 10:30:45  Intent extracted       │  │
│  │   email_management         │  │           🔵 Flash < 300ms       │  │
│  │                             │  │                  ↓             │  │
│  │ allowed_actions:           │  │ 10:30:46  read_email (ALLOW)     │  │
│  │   - read_email             │  │           12% risk               │  │
│  │   - write_reply            │  │                  ↓               │  │
│  │   - create_ticket          │  │ 10:30:47  write_reply (ALLOW)   │  │
│  │                             │  │           15% risk              │  │
│  │ forbidden_actions:         │  │                  ↓               │  │
│  │   - forward_email          │  │ 10:30:52  forward_email          │  │
│  │   - delete_email           │  │           ⛔ QUARANTINE 94%      │  │
│  │                             │  │                  ↓             │  │
│  │ scope:                     │  │ 10:30:52  Human review queued   │  │
│  │   customer_complaints@inbox│  │                                  │  │
│  │                             │  │                                  │  │
│  │ risk_ceiling: 0.35         │  └─────────────────────────────────┘  │
│  │                             │                                       │
│  │ created: 2026-05-16 10:30   │  ┌─────────────────────────────────┐  │
│  └─────────────────────────────┘  │ ACTION ANALYSIS                 │  │
│                                    │                                  │  │
│  ┌─────────────────────────────┐  │ Total Actions: 12               │  │
│  │ RISK DISTRIBUTION           │  │ Allowed: 10 (83%)                │  │
│  │                             │  │ Blocked: 2 (17%)                │  │
│  │ ████████████████░░░░ 83%    │  │                                  │  │
│  │                             │  │ [View Full Audit Log →]         │  │
│  │ 0%  25%  50%  75%  100%     │  └─────────────────────────────────┘  │
│  └─────────────────────────────┘                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 4.4 Analytics Page

**URL:** `/analytics`

**Purpose:** Historical trends and patterns.

**Charts:**
1. **Actions Over Time:** Line chart, daily/weekly/monthly
2. **Risk Score Distribution:** Histogram
3. **Attack Types Breakdown:** Pie chart
4. **Top Blocked Actions:** Bar chart
5. **Session Success Rate:** Area chart

---

### 4.5 Compliance Page

**URL:** `/compliance`

**Purpose:** Generate and export compliance reports.

**Features:**
- Date range picker
- Report type selector (SOC2, HIPAA, EU AI Act)
- Preview before export
- PDF/CSV/JSON export
- Email report to stakeholders

---

### 4.6 Settings Page

**URL:** `/settings`

**Sections:**
1. **API Configuration:** API keys, endpoints
2. **Policy Rules:** Risk thresholds, default manifests
3. **Integrations:** Connected tools (Gmail, Slack, etc.)
4. **Team Management:** Add/remove reviewers
5. **Notification Preferences:** Email, Slack, SMS alerts

---

## 5. Component Specifications

### 5.1 StatsCard Component

```typescript
interface StatsCardProps {
  title: string;
  value: number | string;
  change?: number;  // percentage
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}
```

**Design:**
- Background: slate-800
- Border: 1px slate-700
- Hover: shadow-lg, border-slate-600
- Icon: 48x48, bg-colored-500/20, text-colored-500
- Value: text-3xl font-bold
- Change: text-sm, green if up, red if down

### 5.2 LiveActionFeed Component

```typescript
interface ActionItem {
  id: string;
  action: string;        // action_type.value
  target: string;
  decision: 'allow' | 'deny' | 'quarantine';
  riskScore: number;
  timestamp: Date;
}
```

**Design:**
- Scrollable container, max-height 400px
- Each row: hover highlight, click to expand
- Decision badges: green/yellow/red
- Risk score: colored by threshold
- Auto-scroll with pause on hover
- "LIVE" indicator with pulsing dot

### 5.3 ReviewItem Component

```typescript
interface ReviewItemProps {
  id: string;
  action: string;
  target: string;
  riskScore: number;
  reason: string;
  manifest: IntentManifest;
  explanation: string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  status: 'pending' | 'in_review' | 'approved' | 'denied';
  createdAt: Date;
  onClaim: () => void;
  onApprove: (notes: string) => void;
  onDeny: (notes: string) => void;
  onEscalate: (reason: string) => void;
}
```

**Design:**
- Priority badge: color-coded
- Collapsed view: summary line
- Expanded view: full details + actions
- Claimed items show reviewer name + timer
- Overdue items: red pulsing border

### 5.4 IntentManifestCard Component

```typescript
interface IntentManifestCardProps {
  manifest: IntentManifest;
  showTimeline?: boolean;
  collapsible?: boolean;
}
```

**Design:**
- JSON syntax highlighting for structure
- Color-coded sections (allowed=green, forbidden=red)
- Scope displayed with icon
- Risk ceiling as progress bar
- Timestamp formatted relative ("2 mins ago")

### 5.5 ExplanationPanel Component

**Design:**
- Dark panel with monospace font
- Streaming text animation
- Highlighted key phrases
- "Source" attribution
- Copy button

---

## 6. Design System

### 6.1 Color Palette

```css
/* Primary */
bg-slate-900        /* Main background */
bg-slate-800        /* Cards, panels */
bg-slate-700        /* Hover states */

/* Status Colors */
status-allow:   #22c55e (green-500)
status-deny:    #ef4444 (red-500)
status-quarantine: #eab308 (yellow-500)
status-review:  #f97316 (orange-500)

/* Risk Levels */
risk-low:       #22c55e (0-30%)
risk-medium:    #eab308 (30-70%)
risk-high:      #f97316 (70-90%)
risk-critical:  #ef4444 (90-100%)

/* Accent */
accent-primary: #3b82f6 (blue-500)
accent-glow:    #60a5fa (blue-400)
```

### 6.2 Typography

```css
/* Font Family */
font-sans: Inter, system-ui, sans-serif
font-mono: JetBrains Mono, Consolas, monospace

/* Headings */
h1: text-2xl font-bold
h2: text-xl font-semibold
h3: text-lg font-medium

/* Body */
body: text-sm text-slate-300
muted: text-xs text-slate-500
```

### 6.3 Spacing & Sizing

```css
/* Card padding */
card-padding: 1.25rem (p-5)

/* Section gaps */
section-gap: 1.5rem (gap-6)

/* Border radius */
card-radius: rounded-xl
button-radius: rounded-lg
badge-radius: rounded-full

/* Sidebar width */
sidebar-width: 16rem (64)
sidebar-collapsed: 4rem (16)
```

### 6.4 Animations

```css
/* Pulse for live indicators */
@keyframes pulse-glow {
  0%, 100%: opacity 1;
  50%: opacity 0.5;
}

/* Risk score color transitions */
transition-colors duration-300

/* Card hover */
hover:scale-102 hover:shadow-xl transition-all duration-200

/* Notification slide-in */
@keyframes slide-in {
  from: transform translateX(100%);
  to: transform translateX(0);
}
```

---

## 7. Real-Time Architecture

### 7.1 WebSocket/SSE Strategy

**Recommendation:** Server-Sent Events (simpler, sufficient for this use case)

```typescript
// useRealtime hook
const useRealtime = (endpoint: string) => {
  useEffect(() => {
    const eventSource = new EventSource(endpoint);

    eventSource.addEventListener('action', (event) => {
      const data = JSON.parse(event.data);
      // Update action feed
    });

    eventSource.addEventListener('alert', (event) => {
      // Show notification
    });

    eventSource.onerror = () => {
      // Reconnect logic
    };

    return () => eventSource.close();
  }, [endpoint]);
};
```

### 7.2 Update Strategy

| Component | Update Method | Frequency |
|-----------|--------------|-----------|
| Stats Cards | SSE | On change |
| Live Feed | SSE | On each action |
| Review Queue | SSE | On new item |
| Charts | Polling | Every 30s |
| Session Detail | SSE | On action |

### 7.3 Offline Handling

- Queue actions when offline
- Show "Reconnecting..." indicator
- Auto-reconnect with exponential backoff
- Sync queued actions on reconnect

---

## 8. API Integration

### 8.1 API Client Setup

```typescript
// api/client.ts
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
```

### 8.2 Key Endpoints

```typescript
// Intent
POST   /api/intent/extract        // Extract intent from user input
GET    /api/intent/{session_id}   // Get session manifest

// Actions
POST   /api/action/evaluate       // Evaluate action
POST   /api/action/simulate       // Demo attack simulation

// Reviews
GET    /api/reviews               // Get pending reviews
GET    /api/reviews/{id}          // Get review detail
POST   /api/reviews/{id}/claim    // Claim for review
POST   /api/reviews/decision      // Submit decision
GET    /api/reviews/statistics    // Queue stats

// Dashboard
GET    /api/dashboard/stats       // Dashboard metrics
GET    /api/dashboard/feed        // SSE stream

// Compliance
GET    /api/compliance/export/{session_id}  // Export report

// Health
GET    /api/health                // System health
```

---

## 9. Responsive Design

### 9.1 Breakpoints

```css
/* Mobile: < 640px */
/* Tablet: 640px - 1024px */
/* Desktop: > 1024px */
```

### 9.2 Mobile Adaptations

| Page | Mobile Behavior |
|------|-----------------|
| Dashboard | Stats scroll horizontally, feed full-width |
| Review | Swipe actions, bottom sheet for details |
| Sidebar | Collapsible hamburger menu |
| Charts | Simplified single-column layout |

---

## 10. Accessibility (A11y)

- WCAG 2.1 AA compliance target
- Keyboard navigation for all interactions
- ARIA labels on all interactive elements
- Focus indicators
- Color contrast ratios ≥ 4.5:1
- Screen reader announcements for real-time updates

---

## 11. Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Lighthouse Score | > 90 |
| Bundle Size | < 500KB gzipped |
| API Response (p95) | < 500ms |

---

## 12. Testing Strategy

### 12.1 Unit Tests
- Component rendering
- State management
- Utility functions

### 12.2 Integration Tests
- API calls with MSW (Mock Service Worker)
- User flows (claim → review → approve)

### 12.3 E2E Tests (Playwright)
- Login flow
- Review queue workflow
- Compliance export

---

## 13. Security Considerations

- JWT token storage in memory (not localStorage)
- CSRF protection
- Input sanitization
- Rate limiting on API calls
- Content Security Policy headers

---

## 14. Deployment

### 14.1 Build

```bash
cd /workspace/argus/argus-dashboard
pnpm build  # Output: dist/
```

### 14.2 Deploy Options

| Platform | Command |
|----------|---------|
| Vercel | `vercel --prod` |
| Netlify | `netlify deploy --prod` |
| S3 + CloudFront | Manual upload |

---

## 15. Timeline for UI/UX Team

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 | Days 1-2 | Dashboard + Layout + API setup |
| Phase 2 | Days 3-4 | Review Queue + Live Feed |
| Phase 3 | Days 5-6 | Sessions + Analytics |
| Phase 4 | Day 7 | Compliance + Settings + Polish |

**Total: 1 week for MVP frontend**

---

*This document is a living specification. Update as requirements evolve.*