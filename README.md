# n8n-nodes-parallel

This is an n8n community node for [Parallel AI](https://parallel.ai/) - the AI-powered web research platform. Transform your n8n workflows with intelligent data extraction, competitive analysis, lead enrichment, and automated research capabilities.

Try Parallel AI in the [playground](https://platform.parallel.ai/play) before integrating into your workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## What You Can Do

### 🔍 **Web Enrichment** - [Task API](https://docs.parallel.ai/task-api/task-quickstart.md)

Turn any input into structured data through AI-powered web research:

- **Lead Enrichment**: Company profiles, contact information, financials
- **Competitive Analysis**: Product features, pricing, market positioning
- **Content Research**: Article summaries, fact-checking, data validation
- **Market Intelligence**: Industry trends, company updates, regulatory changes

Choose from multiple [processor levels](https://docs.parallel.ai/task-api/core-concepts/choose-a-processor.md) based on complexity. For now, only **lite** and **base** are available.

### 🌐 **Web Search** - [Search API](https://docs.parallel.ai/search-api/search-quickstart.md)

Intelligent web search with AI-powered processing:

- Natural language search objectives
- Traditional keyword queries
- Domain filtering for trusted sources
- Structured results with excerpts and citations

## Key Features

### **Flexible Output Schemas**

- **Text**: Single text output field with evidence
- **JSON**: [Custom structured schemas](https://docs.parallel.ai/task-api/core-concepts/specify-a-task.md) for precise data extraction
- ~~Auto: (not available) Let AI determine the best output structure~~

### **Research Quality & Transparency**

Every result includes [confidence scores and evidence](https://docs.parallel.ai/task-api/core-concepts/access-research-basis.md) with clickable source citations, so you can validate and trust your automated research.

### **Source Control**

Use [source policies](https://docs.parallel.ai/features/source-policy.md) to include trusted domains (like Wikipedia, Reuters) or exclude unreliable ones.

### **Smart Polling**

Automatically handles long-running research tasks with intelligent retry logic - no manual polling required.

## Getting Started

1. **Get API Access**: Sign up at [platform.parallel.ai](https://platform.parallel.ai/) and generate an API key
2. **Try the Playground**: Test your research tasks at [platform.parallel.ai/play](https://platform.parallel.ai/play)
3. **Add Credentials**: Configure your API key in n8n's credential manager
4. **Build Workflows**: Start with simple enrichment tasks and scale to complex research pipelines

## Use Cases

- **Sales Intelligence**: Enrich leads with company data, news, and contact information
- **Content Creation**: Research topics, validate facts, and gather supporting data
- **Market Research**: Track competitors, analyze trends, and monitor industry changes
- **Due Diligence**: Gather comprehensive information about companies and individuals
- **Data Validation**: Cross-reference and verify information from multiple sources

## Resources

- [Parallel AI Documentation](https://docs.parallel.ai/)
- [API Quickstart Guide](https://docs.parallel.ai/task-api/task-quickstart.md)
- [Processor Selection Guide](https://docs.parallel.ai/task-api/core-concepts/choose-a-processor.md)
- [Understanding Task Specifications](https://docs.parallel.ai/task-api/core-concepts/specify-a-task.md)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE.md)

<!--last generation: https://letmeprompt.com/rules-httpsuithu-3loo9e0 -->
