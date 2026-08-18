# 🌱 EcoGov AI — B2G Compliance Console

> **AI-powered e-waste compliance for enterprise data centers and environmental regulators.**

EcoGov AI is an automated **Business-to-Government (B2G) compliance platform** connecting enterprise data center operations with the **Department of Environment (DOE)** for proactive e-waste tracking, predictive compliance risk mitigation, explainable legal classification, and automated statutory reporting under Malaysian environmental regulations.

**Detect → Predict → Classify → Declare → Audit**

---

## 🎯 Why EcoGov AI?

E-waste compliance across large-scale data center operations can be fragmented, reactive, and documentation-heavy. Teams must continuously monitor waste accumulation, determine the correct regulatory classification, prepare multiple statutory documents, and maintain an auditable trail for regulators.

EcoGov AI transforms this workflow into a **proactive, AI-assisted compliance pipeline**:

| Challenge                                                       | EcoGov AI Approach                |
| --------------------------------------------------------------- | --------------------------------- |
| E-waste accumulation can approach statutory limits unexpectedly | 🔮 Predictive storage forecasting |
| Hardware manifests can have ambiguous classifications           | ⚖️ Explainable Legal AI           |
| Compliance requires multiple documents and systems              | 📄 One-click statutory filing     |
| Auditors need visibility across distributed sites               | 🛡️ Regulator oversight console   |
| Compliance teams need time to act before a breach               | 🚨 Early-warning thresholds       |

---

## ✨ Key Features

### 🔮 Predictive Storage Forecast

Monitors e-waste accumulation against the **180-day statutory storage limit** and provides an internal **90-day early-warning threshold** to give compliance teams sufficient time to arrange certified disposal before a potential breach.

The system visualizes storage trends and proactively identifies sites approaching critical thresholds.

### ⚖️ Explainable Legal AI

Analyzes ambiguous hardware manifests and provides **citation-backed regulatory classifications**.

For example, the system can evaluate materials such as circuit boards containing trace solvents and assist in distinguishing classifications such as **SW110 vs. SW404**.

All AI recommendations remain subject to **human-in-the-loop review**, allowing compliance personnel to validate classifications before action is taken.

### 📄 1-Click Statutory Filing — "Declare Once"

Automatically generates a coordinated compliance packet containing:

* DOE e-SWIS Consignment Notes
* ESG Scope 3 emissions ledgers
* Customs export manifests
* Digitally signed PDF documentation

Instead of preparing each document independently, users can generate the required compliance package from a single workflow.

### 🛡️ Regulator Oversight View

Provides a dedicated auditor console for monitoring compliance across regional sites.

Regulators can identify:

* Undeclared e-waste mass discrepancies
* Site-level reporting inconsistencies
* Potential compliance risks
* Live audit telemetry

This creates a shared operational view between enterprise compliance teams and regulators.

---

## 🔄 Compliance Workflow

```text
┌──────────────────────┐
│   Enterprise Sites   │
│  Data Center Assets  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   E-Waste Tracking   │
│   & Storage Monitor  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Predictive AI Risk   │
│      Detection       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Explainable Legal  │
│  AI Classification   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  "Declare Once"      │
│ Statutory Filing     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Regulator Oversight │
│     & Audit View     │
└──────────────────────┘
```

---

## 🆚 Key Differentiators

| Capability              | Traditional Workflow      | EcoGov AI                 |
| ----------------------- | ------------------------- | ------------------------- |
| Storage monitoring      | Manual / periodic         | Predictive                |
| Breach detection        | Reactive                  | Early-warning             |
| Waste classification    | Manual research           | Explainable AI assistance |
| Statutory documentation | Multiple manual workflows | One-click generation      |
| Audit visibility        | Periodic reporting        | Continuous oversight      |
| Compliance response     | After-the-fact            | Proactive                 |

---

## 🖥️ Product Preview

> **Recommended:** Add screenshots or a short GIF of the application here to give reviewers an immediate visual understanding of the product.

```text
Enterprise Dashboard
        ↓
Legal AI Classification
        ↓
Compliance Packet Generation
        ↓
Regulator Oversight
```

Example:

```markdown
![EcoGov AI Enterprise Dashboard](./assets/dashboard.png)
```

A short demo GIF can also showcase the complete workflow:

**Enterprise View → Legal AI → Compliance Filing → Regulator View**

---

## 🛠️ Tech Stack

* **Framework:** [Next.js 14](https://nextjs.org/) — App Router + TypeScript
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **AI Backend:** Google Gen AI SDK (`@google/genai`)
* **AI Model:** `gemini-2.5-flash`
* **Document Generation:** `jspdf`

---
## ⚙️ Prerequisites

Ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18.17.0 or higher recommended)
* npm (bundled with Node.js) or [pnpm](https://pnpm.io/)
* A [Google Gemini API Key](https://aistudio.google.com/)

---

# 🚀 Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/peizhe33/ecogov.git
npm install
```

## 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note:** Never commit `.env.local` or expose your Gemini API key in the repository.

## 3. Start the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

# 🎬 Demo Workflow

Follow the workflow below to experience the core EcoGov AI capabilities.

### 1. 🔮 Enterprise View

Review the **Storage Capacity Forecast** chart.

Observe the projected approach toward the **90-day internal early-warning threshold**, which provides time to arrange certified disposal before reaching the **180-day statutory storage limit**.

### 2. ⚖️ Decommissioning Logs

Navigate to **Batch #884-D**.

Click **"Inspect Legal AI Reasoning"** to trigger the live Gemini-powered legal classification workflow.

Review the AI's reasoning and regulatory classification before proceeding.

### 3. 📄 Compliance Filing

Return to the main dashboard and click **"Generate Compliance Packet"**.

The system will:

1. Generate the compliance documentation.
2. Run the multi-document generation workflow.
3. Produce the signed PDF manifest.
4. Make the completed compliance packet available for download.

### 4. 🛡️ Regulator View

Switch the top-level interface toggle to **Regulator View**.

Inspect:

* Site-level discrepancies
* Undeclared e-waste mass
* Audit status
* Live compliance telemetry

This demonstrates how the same platform can provide both **enterprise compliance operations** and **regulatory oversight**.

---

## 💡 Core Concept

EcoGov AI moves environmental compliance from:

> **Reactive reporting → Proactive compliance**

By combining predictive analytics, explainable AI, automated document generation, and regulator-facing telemetry, EcoGov AI provides a unified compliance workflow for the growing complexity of enterprise e-waste management.

---

## 📌 Project Status

**Prototype / Demonstration**

This project demonstrates an AI-assisted compliance workflow and is intended as a technology prototype. Regulatory classifications, statutory requirements, and generated documentation should be reviewed and validated by qualified compliance professionals before real-world submission.
