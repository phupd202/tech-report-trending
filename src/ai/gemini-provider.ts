import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/config';

export class GeminiProvider {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = config.geminiApiKey;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      console.warn('GEMINI_API_KEY is not configured. AI capabilities will be disabled or simulated.');
    }
  }

  async generateText(prompt: string): Promise<string> {
    if (!this.genAI) {
      return this.getMockResponse(prompt);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: config.geminiModel });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.warn('Error generating content from Gemini, falling back to mock response:', error);
      return this.getMockResponse(prompt);
    }
  }

  private getMockResponse(prompt: string): string {
    console.warn('Returning simulated Gemini response.');
    
    // Check if the prompt wants a JSON array for tags
    if (prompt.includes('array of strings') || prompt.includes('JSON array')) {
      return `["TYPESCRIPT", "WEB DEV", "RUST", "AI", "CONTAINERS", "STORAGE"]`;
    }

    const useVietnamese = prompt.toLowerCase().includes('vietnamese') || prompt.toLowerCase().includes('tiếng việt');

    if (prompt.toLowerCase().includes('summary') || prompt.toLowerCase().includes('summarize')) {
      if (useVietnamese) {
        return `### Báo cáo phân tích xu hướng công nghệ (Giả lập do lỗi mạng/Firewall/Proxy)
          Dưới đây là phân tích xu hướng dựa trên dữ liệu thu thập được:

          - **Công nghệ & Công cụ nổi bật**: Các công cụ build nhanh và runtime hiện đại như Bun, Vite, cùng các framework nhẹ như Hono đang thu hút sự chú ý lớn. Rust tiếp tục dẫn đầu xu hướng viết lại các công cụ CLI và hệ thống để tối ưu hiệu năng.
          - **Chủ đề thảo luận chính**: Các cuộc thảo luận xoay quanh việc lưu trữ dữ liệu local-first, tối ưu hóa ứng dụng đơn trang (SPA) và các giải pháp triển khai AI nhẹ trực tiếp ở Client.
          - **Xu hướng kiến trúc**: Chuyển dịch dần từ các server truyền thống sang kiến trúc Serverless/Edge Computing và sử dụng SQLite/JSON cho các nhu cầu lưu trữ đơn giản.`;
                }
      return `### Mock AI Trend Summary
 
This is a simulated trend analysis (network issues or firewall blocked access to Gemini API).
 
- **Emerging Tech & Tools**: We noticed high activity in modern TypeScript tooling, including fast runtimes (like Bun) and lightweight web frameworks (like Hono). Rust continues to see strong adoption for CLI and systems-level tools.
- **Key Discussions**: Discussions are centered around local-first data persistence, the trade-offs of single-user applications vs. enterprise architectures, and optimizing AI inference runtimes.
- **Emerging Patterns & Concepts**: Move towards modular monolith configurations, removing databases where JSON files or local SQLite databases can fulfill simple user requirements.`;
    }

    if (useVietnamese) {
      return `### Phản hồi giả lập (Mock Response)
Không thể kết nối đến Gemini API. Vui lòng kiểm tra lại cấu hình mạng, Proxy/Firewall hoặc GEMINI_API_KEY.`;
    }
    return `### Mock Gemini Response
This is a placeholder response because the connection to Gemini API failed or was blocked.
Please configure GEMINI_API_KEY or check your proxy/firewall settings to enable actual AI features.`;
  }
}
export default GeminiProvider;
