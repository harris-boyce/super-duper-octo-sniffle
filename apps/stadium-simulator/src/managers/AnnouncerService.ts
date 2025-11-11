import axios from 'axios';

export class AnnouncerService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages';
    this.apiKey = import.meta.env.VITE_CLAUDE_API_KEY || '';
  }

  public async getCommentary(gameContext: string): Promise<string> {
    // TODO: Implement API call error handling
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 150,
          messages: [
            {
              role: 'user',
              content: `You are an energetic 8-bit stadium announcer. Give exciting commentary for: ${gameContext}`,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );
      return response.data.content[0].text;
    } catch (error) {
      console.error('Failed to fetch announcer commentary:', error);
      return 'The crowd goes wild!';
    }
  }
}
