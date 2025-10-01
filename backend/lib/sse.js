// lib/sse.js - Gestor central de conexiones SSE con filtrado ligero
import bus from '../events/bus.js';

class SSEManager {
  constructor() {
    this.connections = new Map(); // id -> { res, userId, role, filters:Set }
    this.nextId = 1;
    this.globalEventId = 1; // Incremental simple (reinicia al reiniciar proceso)
    this._wired = false;
    this.capabilities = {
      filters: true,
      ping: true,
      eventIds: true,
      version: '1'
    };
    this._wireBus();
  }

  _wireBus() {
    if (this._wired) return;
    bus.on('broadcast', (evt) => {
      try {
        this.broadcast(evt);
      } catch (e) {
        // Evitar que un error rompa el flujo global
        console.error('[SSE] Error broadcasting event:', e?.message || e);
      }
    });
    this._wired = true;
  }

  addConnection({ res, userId, role, filters }) {
    const id = this.nextId++;
    this.connections.set(id, { res, userId, role, filters });
    return id;
  }

  removeConnection(id) {
    this.connections.delete(id);
  }

  broadcast(evt) {
    if (!evt || typeof evt !== 'object') return;
    const type = evt.type || 'message';
    const payload = evt.payload ?? {};
    const targets = evt.targets; // opcional future: { userIds?, roles?, trabajadorId?, revendedorId? }

    const eventId = this.globalEventId++;
    const dataString = JSON.stringify({ ...payload, __ts: Date.now() });

    for (const [id, conn] of this.connections.entries()) {
      const { res, filters } = conn;
      if (res.writableEnded) {
        this.connections.delete(id);
        continue;
      }

      // Filtrado por tipo explícito
      if (filters && filters.size > 0 && !filters.has(type)) continue;

      // Filtrado por targets (simple): si evt.targets?.userIds existe y no incluye userId → skip
      if (targets?.userIds && !targets.userIds.includes(conn.userId)) continue;
      if (targets?.roles && !targets.roles.includes(conn.role)) continue;

      try {
        res.write(`id: ${eventId}\n`);
        res.write(`event: ${type}\n`);
        res.write(`data: ${dataString}\n\n`);
      } catch (e) {
        console.warn('[SSE] write failed, dropping connection', id, e?.message);
        this.connections.delete(id);
      }
    }
  }
}

export const sseManager = new SSEManager();
