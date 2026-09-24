import { Response } from 'express';

interface Client {
  id: string;
  res: Response;
}

class RealtimeStreamManager {
  private clients: Client[] = [];

  addClient(id: string, res: Response) {
    this.clients.push({ id, res });

    // Send initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId: id, time: new Date().toISOString() })}\n\n`);

    // Handle close
    res.on('close', () => {
      this.clients = this.clients.filter((c) => c.id !== id);
    });
  }

  broadcast(eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(payload);
      } catch (err) {
        // Client will be cleaned up on close
      }
    }
  }

  // Heartbeat to keep connections alive through proxies
  startHeartbeat(intervalMs = 25000) {
    setInterval(() => {
      for (const client of this.clients) {
        try {
          client.res.write(': keepalive\n\n');
        } catch {
          // ignore
        }
      }
    }, intervalMs);
  }
}

export const realtimeManager = new RealtimeStreamManager();
realtimeManager.startHeartbeat();
