import { Response } from 'express';
import { SSEEvent } from '../../core/types.js';

interface SSEClient {
  id: string;
  res: Response;
  jobId: string;
}

export class SSEManager {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, jobId: string, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', jobId })}\n\n`);

    this.clients.set(id, { id, res, jobId });

    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  send(event: SSEEvent): void {
    for (const [, client] of this.clients) {
      if (client.jobId === event.jobId) {
        client.res.write(
          `data: ${JSON.stringify(event)}\n\n`
        );
      }
    }
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
