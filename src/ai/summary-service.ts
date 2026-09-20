import { GeminiProvider } from './gemini-provider';
import { ContentItem } from '../types';

export class SummaryService {
  constructor(private geminiProvider: GeminiProvider) { }

  async summarizeDailyContent(items: ContentItem[]): Promise<string> {
    if (items.length === 0) {
      return 'No trends collected today.';
    }

    // Prepare a concise text summary of items for Gemini
    const itemSummaries = items
      .map(item => {
        const description = item.metadata.description || '';
        return `- [${item.source.toUpperCase()}] ${item.title} (Score: ${item.score}) - ${description}`;
      })
      .slice(0, 50) // limit to top 50 items to avoid token limits
      .join('\n');

    // const prompt = `
    //   You are a Technology Intelligence Assistant. Analyze the following trending technology items from GitHub, Hacker News, and Reddit from today:

    //   ${itemSummaries}

    //   Based on these trends, generate a structured markdown report including:
    //   1. **Emerging Tech & Tools**: What specific projects, frameworks, or tools are gaining traction?
    //   2. **Key Discussions**: What are the main topics being debated or discussed in tech circles today?
    //   3. **Emerging Patterns & Concepts**: Any conceptual shifts or architectural patterns that appear frequently (e.g., local-first, LLM routing, edge database)?

    //   Keep the report concise, professional, and insightful. Use bullet points and clean structure. Using Vietnamese to response. 
    //   Besides, summary each repo as markdown format with title, description, url, how to apply into project, pros and cons, description mechanism
    //   `;
    const prompt = `
      You are a Senior Technology Research Analyst and Technical Mentor.

      Audience:
      - Backend Engineer (~2 years of experience)
      - System Design enthusiast
      - Cloud / DevOps learner
      - SRE learner

      Assumption: the reader already knows programming and basic concepts
      (HTTP, databases, containers...) but is NOT yet familiar with advanced
      distributed systems concepts. Every explanation must be simple enough
      for a backend engineer with 2 years of experience to understand — do
      not assume deep knowledge of distributed systems, ML, or compilers.

      Analyze the following technology trends collected today from GitHub
      Trending, Hacker News, and Reddit.

      Data:

      ${itemSummaries}

      Generate a markdown report in Vietnamese.

      # Mandatory Rules

      - Write in Vietnamese, with a technical, practical tone.
      - Do not use marketing language.
      - Do not invent facts. If the data is insufficient to draw a
        conclusion, explicitly state "Không đủ thông tin để đánh giá X".
      - Broad at the overview level, deep and narrow at the analysis level:
        the Overview section should list ALL notable technologies/projects,
        but the deep-dive section must select ONLY 1-2 projects that matter
        most, rather than spreading thin across many projects. You must
        clearly state the criteria/reason for selecting that project (e.g.,
        direct relevance to backend/infra/SRE, technical novelty, level of
        discussion activity on HN/Reddit, etc.).
      - Every technical explanation must be understandable by a backend
        engineer with 2 years of experience — avoid unexplained academic
        jargon.
      - Whenever describing architecture, always represent it with a Mermaid
        diagram (flowchart, sequence diagram, or component diagram) inside a
        \`\`\`mermaid code block, followed by a written explanation right
        below the diagram.
      - Focus on technologies, engineering practices, architecture,
        infrastructure, and developer tools.

      # Output Format

      # 📊 Tổng Quan

      Provide:

      - Top 5 công nghệ hoặc dự án đáng chú ý nhất hôm nay (ngắn gọn, 1-2 câu/mục).
      - Vì sao chúng đang nổi lên.
      - Ai nên quan tâm.
      - Nêu rõ 1-2 dự án nào sẽ được chọn để phân tích chuyên sâu ở phần tiếp
        theo, và lý do chọn (dựa trên các tiêu chí đã nêu ở phần Rules).

      ---

      # 🔥 Phân Tích Chuyên Sâu (1-2 dự án được chọn)

      For each selected project:

      ## {Project Name}

      ### Mô tả

      Short, easy-to-understand description.

      ### URL

      Repository URL.

      ### Tại sao đang nổi bật

      Explain based on collected data (stars, upvotes, comment count, trend...).

      ### Nguyên lý cơ bản

      Explain the core technical principle behind the project: what problem
      it solves, how its approach differs from the traditional way. Keep
      this at the conceptual level, without diving into implementation
      details.

      ### Cơ chế hoạt động

      Explain in detail how the system works: data flow, main components,
      and how they interact with each other.

      ### Sơ đồ kiến trúc (HLD)

      Draw a High-Level Design diagram using Mermaid (flowchart or sequence
      diagram), with a brief annotation for each component in the diagram.

      ### Có thể áp dụng vào dự án như thế nào?

      Practical backend/system engineering use cases — give concrete
      examples, not generic statements.

      ### Tips áp dụng ngay trong công việc

      2-4 concrete tips/practices that can be applied immediately in daily
      work, derived from how this project solves its problem (patterns,
      configuration, measurement approaches, debugging techniques...).

      ### Bài tập thực hành (1 buổi tối hoặc 1 cuối tuần)

      Propose 1-2 concrete exercises/mini-projects that can be completed
      within a few hours to a full weekend. Clearly specify:
      - The exercise's goal
      - Tools/stack needed
      - Main steps (bullet points)
      - Expected outcome upon completion

      ### Ưu điểm

      - item
      - item

      ### Nhược điểm

      - item
      - item

      ---

      # 💬 Các Chủ Đề Đang Được Thảo Luận

      Summarize key discussions from Reddit and Hacker News.

      Include:

      - technical debates
      - adoption concerns
      - industry trends

      ---

      # 🏗️ Xu Hướng Kiến Trúc & Kỹ Thuật

      Identify recurring concepts such as:

      - AI Agents
      - MCP
      - RAG
      - Observability
      - OpenTelemetry
      - eBPF
      - Local-first
      - Edge Computing
      - Event-driven Architecture
      - Platform Engineering

      For each concept that ACTUALLY appears in the data: explain briefly,
      in simple terms, what it is and why it matters to backend/DevOps/SRE.
      If a concept does not appear in the data, skip it — do not speculate.

      ---

      # 🎯 Gợi Ý Học Tập

      Provide:

      ## Nên học ngay

      Technologies worth investing time in.

      ## Nên theo dõi

      Technologies that are promising but still early.

      ## Có dấu hiệu hype

      Technologies receiving attention but lacking evidence of long-term value.

      Explain your reasoning.

      ---

      # 💡 Ý Tưởng Side Project

      Generate 5 side project ideas inspired by today's trends.

      Focus on:

      - Backend
      - DevOps
      - Infrastructure
      - Developer Tools
      - AI Engineering

      For each idea, specify: the problem it solves, suggested tech stack,
      estimated difficulty (small/medium/large), and estimated completion time.

      Return valid markdown only, with no text outside the markdown.
      `;
    return this.geminiProvider.generateText(prompt);
  }

  async extractTopics(items: ContentItem[]): Promise<string[]> {
    if (items.length === 0) {
      return [];
    }

    const titles = items
      .slice(0, 100)
      .map(item => item.title)
      .join('\n');

    const prompt = `
Based on the following list of trending titles, identify the top 5-10 key technology topics or keywords (e.g., "WebAssembly", "TypeScript", "LLM", "DevOps", "Database").
Respond ONLY with a JSON array of strings. Do not include markdown formatting or other text.

Titles:
${titles}
`;

    try {
      const response = await this.geminiProvider.generateText(prompt);
      // Clean potential markdown code blocks (e.g. ```json ... ```)
      const cleanJson = response
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map(t => t.toUpperCase());
      }
      throw new Error('Response is not a JSON array');
    } catch (error) {
      console.warn('Failed to parse topics from Gemini response. Returning defaults.', error);
      // Fallback topic extraction based on simple text search
      const topics = new Set<string>();
      const text = titles.toLowerCase();
      const keywords = ['rust', 'go', 'python', 'typescript', 'ai', 'llm', 'database', 'docker', 'kubernetes', 'react', 'nextjs', 'hono', 'bun'];
      for (const kw of keywords) {
        if (text.includes(kw)) {
          topics.add(kw.toUpperCase());
        }
      }
      return Array.from(topics);
    }
  }
}
export default SummaryService;
