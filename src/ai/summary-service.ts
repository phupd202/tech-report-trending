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
      You are a Senior Technology Research Analyst.

      Audience:
      - Backend Engineer
      - System Design enthusiast
      - Cloud / DevOps learner
      - SRE learner

      Analyze the following technology trends collected today from GitHub Trending, Hacker News, and Reddit.

      Data:

      ${itemSummaries}

      Generate a markdown report in Vietnamese.

      # Rules

      - Use Vietnamese.
      - Be technical and practical.
      - Avoid marketing language.
      - Do not invent facts.
      - If information is insufficient, explicitly mention it.
      - Focus on technologies, engineering practices, architecture, infrastructure, and developer tools.

      # Output Format

      # 📊 Tổng Quan

      Provide:

      - Top 5 công nghệ hoặc dự án đáng chú ý nhất.
      - Vì sao chúng đang nổi lên.
      - Ai nên quan tâm.

      ---

      # 🔥 Công Nghệ & Dự Án Nổi Bật

      For each important repository or project:

      ## {Project Name}

      ### Mô tả

      Short description.

      ### URL

      Repository URL.

      ### Tại sao đang nổi bật

      Explain the reason.

      ### Cơ chế hoạt động

      Explain how it works technically.

      ### Có thể áp dụng vào dự án như thế nào?

      Practical backend/system engineering use cases.

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

      Explain why they matter.

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

      Return valid markdown only.
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
