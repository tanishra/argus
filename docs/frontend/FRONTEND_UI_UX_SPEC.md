# ARGUS Premium UI/UX Spec & API Integration Guide

This document is designed for the frontend engineering team to rebuild the ARGUS dashboard into a premium, single-page experience (similar to OpenAI, Stripe, or Vercel). 

## 1. Design System & Aesthetics

To achieve a "premium, minimalistic, and state-of-the-art" feel, follow these design tokens:

*   **Theme:** Dark mode default. It conveys cybersecurity, trust, and advanced tech.
*   **Color Palette:**
    *   **Background:** True Black (`#000000`) or Very Dark Slate (`#09090B`).
    *   **Surfaces/Cards:** Slightly lighter translucent gray (`rgba(255, 255, 255, 0.05)`) with a blurred background (Glassmorphism).
    *   **Primary Accent:** Cyber Cyan (`#06B6D4`) or Electric Blue (`#3B82F6`) — used for borders, active states, and glowing elements.
    *   **Danger/Alert:** Neon Coral (`#F43F5E`) — used when ARGUS blocks an attack.
    *   **Success:** Emerald (`#10B981`) — used for authorized actions.
*   **Typography:**
    *   **Headings & Body:** `Inter` or `Geist` (clean, highly legible sans-serif).
    *   **Code/Logs:** `JetBrains Mono` or `Fira Code` (for the terminal/demo outputs).
*   **Styling Engine:** Use **Tailwind CSS** combined with **shadcn/ui** or **Framer Motion** for smooth, buttery scroll animations and component mounting.
*   **Effects:** Use subtle glowing drop-shadows on buttons, gradient text for main headings, and 1px borders (`border-white/10`) to define sections cleanly without making them bulky.

---

## 2. Single Page Structure (Section by Section)

The website should flow as a continuous narrative, guiding the user from the problem down to the live interactive demo.

### Section 1: The Hero (The Hook)
*   **Layout:** Full viewport height (`min-h-screen`), perfectly centered content.
*   **Visual:** A subtle, slow-moving abstract background (e.g., a glowing particle network where one red particle is suddenly isolated and blocked by blue particles).
*   **Content:**
    *   **Badge:** "Built for the Veea Hackathon" (subtle pill shape).
    *   **H1:** "Secure Your AI Agents at the Action Layer." (Make "Action Layer" a gradient text).
    *   **Subtext:** "Prompt injection is inevitable. Exfiltration is not. ARGUS intercepts malicious AI actions *before* they execute using intent-driven policy enforcement."
    *   **CTAs:** Primary: "Watch Live Demo" (scrolls to playground). Secondary: "View GitHub".

### Section 2: The Problem (Why ARGUS?)
*   **Layout:** 2-column grid.
*   **Content:**
    *   **Left Column (Text):** Explain that current security tools only filter *prompts* (text in/out). But AI Agents have *tools* (APIs, DB access). If an injection sneaks through, the agent will execute malicious actions.
    *   **Right Column (Visual):** A sleek diagram showing an attacker bypassing a standard LLM firewall, but getting caught right before the "Database" icon.

### Section 3: How ARGUS Works (The Architecture)
*   **Layout:** 3 step cards horizontally.
*   **Content:**
    1.  **Extract (Gemini Flash):** "Clinician declares intent. Gemini Flash generates a strict machine-readable manifest in <300ms."
    2.  **Enforce (Lobster Trap):** "The Veea Lobster Trap binary does Deep Packet Inspection on the agent's tool calls, comparing them to the manifest."
    3.  **Explain (Gemini Pro):** "Violations are quarantined. Gemini Pro performs deep semantic analysis to explain exactly *why* the action was malicious."

### Section 4: The Live Playground (The Demo)
*   **Layout:** The core of the app. A large split-screen console.
*   **Top Bar:** A selector for the scenario (e.g., "Healthcare Exfiltration").
*   **Left Panel (Unprotected Agent):**
    *   A simulated terminal. Text turns red when the attack succeeds.
    *   Status: "HIPAA Breach Detected. $1.5M Fine."
*   **Right Panel (ARGUS Protected):**
    *   Shows the Intent Manifest loading.
    *   Shows normal actions passing.
    *   When the attack hits, the screen flashes red momentarily, then settles on a sleek "🛡️ ACTION QUARANTINED" card.
*   *(See API Integration below for how to wire this up).*

### Section 5: The Human Gate (Admin View)
*   **Layout:** A mock "Security Analyst Dashboard" dashboard.
*   **Content:** Shows a beautiful table of quarantined events. Clicking one opens a sliding side-panel (Sheet component in shadcn) showing the **Gemini Pro Explanation** (Risk Score, Reasoning, Recommended Action).

### Section 6: Footer
*   Minimalistic. Team names, copyright, and tech stack logos (FastAPI, Redis, Gemini, React).

---

## 3. API Integration Guide

The frontend team will need to consume the FastAPI backend to make the Playground functional. All endpoints are hosted at `http://localhost:8000`.

### 1. The Real-Time Event Feed (SSE)
To make the dashboard feel "alive", connect to the Server-Sent Events (SSE) stream. This pushes logs to the UI instantly without polling.

*   **Endpoint:** `GET /api/v1/stream`
*   **Implementation (React):**
    ```javascript
    useEffect(() => {
      const eventSource = new EventSource("http://localhost:8000/api/v1/stream");
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // data.type === 'action_evaluated' | 'intent_extracted' | 'system_status'
        // Add to your state array to render terminal logs
        setLogs(prev => [...prev, data]);
      };
      return () => eventSource.close();
    }, []);
    ```

### 2. Triggering the Demo Scenarios
When the user clicks "Run Demo" in the playground, call this endpoint to start the simulation on the backend.

*   **Endpoint:** `POST /demo/simulate`
*   **Payload:**
    ```json
    {
      "scenario": "healthcare",
      "attack_type": "phi_exfiltration",
      "delay_seconds": 0
    }
    ```
*   **Behavior:** The backend will start generating SSE events. The frontend just sits back and renders the incoming events via the EventSource connection.

### 3. Fetching System Statistics
For the top of the dashboard or a metrics bar (e.g., "Total Actions", "Threats Blocked").

*   **Endpoint:** `GET /api/v1/stats`
*   **Response:**
    ```json
    {
      "total_actions": 45,
      "blocked_actions": 2,
      "quarantined_actions": 1,
      "avg_latency_ms": 124.5
    }
    ```
*   **Usage:** Poll this every 2 seconds, or update it directly from the `system_status` SSE events.

### 4. Fetching the Human Review Queue
For the "Admin View" section, fetch the list of quarantined items.

*   **Endpoint:** `GET /api/v1/queue/pending`
*   **Response:** Array of `ReviewItem` objects.
*   **Usage:** Map over this array to render the beautiful table of security threats. Use the `explanation_summary` and `explanation_details` fields to show the Gemini Pro reasoning.

---
**Final Note to Frontend Team:** Keep the UI snappy. The backend latency for authorization is designed to be sub-50ms (ignoring LLM extraction). Emphasize this speed using fast, crisp micro-animations (duration 150-200ms) for UI state changes.
