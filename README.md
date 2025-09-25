# n8n-nodes-parallel

This is an n8n community node for [Parallel Web Systems](https://parallel.ai/) - the AI-powered web research platform. Transform your n8n workflows with intelligent data extraction, competitive analysis, lead enrichment, and automated research capabilities.

Try Parallel in the [playground](https://platform.parallel.ai/play) before integrating into your workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Install this community node package in n8n:

```bash
npm install n8n-nodes-parallel
```

Or follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Prerequisites

1. **Get API Access**: Sign up at [platform.parallel.ai](https://platform.parallel.ai/) and generate an API key
2. **Add Credentials**: In n8n, create new credentials of type "Parallel API" and enter your API key
3. **Webhook Secret**: In your Parallel n8n credential, include a webhook secret (created via [Platform Settings](https://platform.parallel.ai/settings)) in order to be notified when an Async Web Enrichment Task is completed

## Available Nodes

This package provides two powerful nodes for your n8n workflows:

### 🔍 **Parallel Node** - Multi-Purpose AI Research

The main Parallel node offers four distinct operations:

#### **1. Sync Web Enrichment** - [Task API](https://docs.parallel.ai/task-api/task-quickstart.md)

Execute tasks synchronously and get immediate results (up to 5 minutes):

- **Lead Enrichment**: Company profiles, contact information, financials
- **Competitive Analysis**: Product features, pricing, market positioning
- **Content Research**: Article summaries, fact-checking, data validation
- **Market Intelligence**: Industry trends, company updates, regulatory changes

**Available Processors**: `lite`, `base`, `core`

#### **2. Async Web Enrichment** - [Task API](https://docs.parallel.ai/task-api/task-quickstart.md)

Start long-running research tasks asynchronously (up to 30 minutes):

- Complex multi-source research
- Deep competitive intelligence
- Comprehensive due diligence
- Large-scale data enrichment

**Available Processors**: `lite`, `base`, `core`, `pro`, `ultra`, `ultra2x`, `ultra4x`, `ultra8x`
Learn about each Parallel Task API Processor [here](https://docs.parallel.ai/task-api/core-concepts/choose-a-processor).

#### **3. Web Search** - [Search API](https://docs.parallel.ai/search-api/search-quickstart.md)

Intelligent web search with AI-powered processing:

- Natural language search objectives
- Traditional keyword queries
- Domain filtering for trusted sources
- Structured results with excerpts and citations

**Available Processors**: `base`, `pro`
Learn about each Parallel Search API Processor [here](https://docs.parallel.ai/search-api/processors).

#### **4. Web Chat**

AI-powered chat completions with web access (< 5 seconds):

- Real-time web-informed responses
- Fact-checking and verification
- Current events and news queries
- Research-backed conversations

Read the Parallel Chat API documentation [here](https://docs.parallel.ai/chat-api/chat-quickstart).

### 🔔 **Parallel Task Run Completion Trigger**

Automatically trigger workflows when Parallel tasks complete, best paired with Async Web Enrichment:

- **Real-time notifications**: Instant updates when async tasks finish
- **Automatic result fetching**: Retrieves full task results automatically
- **Webhook security**: Built-in signature validation for secure webhooks
- **Flexible filtering**: Option to trigger only on successful completions

Perfect for long-running research workflows where you want to process results as soon as they're ready.

## Key Features

### **Flexible Output Schemas**

- **Text**: Single text output field with evidence and citations
- **JSON**: [Custom structured schemas](https://docs.parallel.ai/task-api/core-concepts/specify-a-task.md) for precise data extraction
- **Auto**: AI-optimized JSON output with nested citations (Pro+ processors only)

### **Research Quality & Transparency**

Every result includes [confidence scores and evidence](https://docs.parallel.ai/task-api/core-concepts/access-research-basis.md) with source citations, so you can validate and trust your automated research.

### **Source Control**

Use [source policies](https://docs.parallel.ai/features/source-policy.md) to include trusted domains (like Wikipedia, Reuters) or exclude unreliable ones.

### **Smart Polling & Async Support**

- Automatically handles long-running research tasks with intelligent retry logic
- Webhook triggers for immediate notification when async tasks complete
- No manual polling required

## Quick Start Examples

### Example 1: Company Research Workflow

```text
1. HTTP Request node → Get company domain from CRM
2. Parallel node (Sync Web Enrichment) → Enrich company data
3. Set node → Format results  
4. HTTP Request node → Update CRM with enriched data
```

### Example 2: Async Research with Webhook

```text
1. Parallel node (Async Web Enrichment) → Start deep research task
2. Parallel Task Run Completion Trigger → Wait for completion
3. Code node → Process comprehensive results
4. Email node → Send research report
```

### Example 3: Web Search Pipeline

```text
1. Manual Trigger → Input search query
2. Parallel node (Web Search) → Search with AI processing
3. Code node → Extract top results
4. HTTP Request → Post to knowledge base
```

## Getting Started

1. **Install**: `npm install n8n-nodes-parallel`
2. **Get API Access**: Sign up at [platform.parallel.ai](https://platform.parallel.ai/) and generate an API key
3. **Try the Playground**: Test your research tasks at [platform.parallel.ai/play](https://platform.parallel.ai/play)
4. **Add Credentials**: Configure your API key in n8n's credential manager  
5. **Build Workflows**: Start with simple enrichment tasks and scale to complex research pipelines

## Processor Selection Guide

Choose the right processor based on your use case complexity and timing needs:

| Processor | Latency | Max Fields | Cost | Best For |
|-----------|---------|------------|------|----------|
| **Lite** | 5s-60s | 2 | $5/1000 | Basic metadata, quick lookups |
| **Base** | 15s-100s | 5 | $10/1000 | Standard enrichment, reliable data |
| **Core** | 1-5min | 10 | $25/1000 | Cross-referenced research |
| **Pro** | 3-9min | 20 | $100/1000 | Exploratory research, analysis |
| **Ultra** | 5-25min | 20 | $300/1000 | Advanced multi-source research |
| **Ultra 2x** | 5-25min | 25 | $600/1000 | Difficult research tasks |
| **Ultra 4x** | 8-30min | 25 | $1200/1000 | Very difficult research |
| **Ultra 8x** | 8-30min | 25 | $2400/1000 | Most complex research |

> **Note**: Sync operations support up to Core level. Async operations support all processor levels.

## n8n Workflow Use Cases

### **Sales & CRM Automation**

- **Lead Scoring**: Enrich incoming leads with company data, funding, employee count
- **Account Research**: Deep dive on prospects before sales calls
- **Contact Discovery**: Find decision-makers and their contact information
- **Competitive Intelligence**: Monitor competitor product updates and pricing

### **Content & Marketing**

- **Content Research**: Gather supporting data and citations for articles
- **Fact-Checking**: Validate claims and statistics in real-time
- **Trend Analysis**: Monitor industry trends and news for content ideas
- **SEO Research**: Find trending topics and keyword opportunities

### **Operations & Monitoring**

- **Vendor Research**: Evaluate potential suppliers and partners
- **Risk Assessment**: Monitor companies for regulatory changes or news
- **Market Intelligence**: Track industry developments and competitor moves
- **Due Diligence**: Comprehensive background checks for business decisions

### **Customer Support Enhancement**

- **Real-time Information**: Answer customer questions with current web data
- **Documentation**: Auto-generate help articles from web research
- **Competitive Comparisons**: Provide accurate competitor information

## Advanced Configuration

### Webhook Setup for Async Tasks

When using async enrichment with the trigger node:

1. Add a **Parallel Task Run Completion Trigger** to your workflow
2. Copy the webhook URL from the trigger node
3. In the **Parallel node** (Async Web Enrichment), paste the URL in the "Webhook URL" field
4. Enable "Validate Webhook Signatures" for security (recommended)

### JSON Schema Examples

For structured data extraction, use JSON schemas in the output configuration:

```json
{
  "type": "object",
  "properties": {
    "company_name": {
      "type": "string", 
      "description": "Official company name from recent filings or website."
    },
    "ceo_name": {
      "type": "string",
      "description": "Current CEO full name from company website or recent news."
    },
    "employee_count": {
      "type": "string", 
      "description": "Number of employees as range (e.g., '500-1000') or exact number."
    }
  },
  "required": ["company_name", "ceo_name", "employee_count"],
  "additionalProperties": false
}
```

### Source Policies

Control which websites are used for research:

- **Include domains**: `wikipedia.org, reuters.com, bloomberg.com`
- **Exclude domains**: `reddit.com, quora.com`

## Resources

- [Parallel Documentation](https://docs.parallel.ai/)
- [Task API Quickstart](https://docs.parallel.ai/task-api/task-quickstart.md)
- [Search API Quickstart](https://docs.parallel.ai/search-api/search-quickstart.md)
- [Processor Selection Guide](https://docs.parallel.ai/task-api/core-concepts/choose-a-processor.md)
- [Understanding Task Specifications](https://docs.parallel.ai/task-api/core-concepts/specify-a-task.md)
- [Webhook Configuration](https://docs.parallel.ai/task-api/features/webhooks)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/parallel-web/parallel-n8n-nodes/issues)
- **Documentation**: [docs.parallel.ai](https://docs.parallel.ai/)
- **Platform**: [platform.parallel.ai](https://platform.parallel.ai/)

## License

[MIT](LICENSE.md)
