#!/usr/bin/env node
/**
 * BOB als MCP-server.
 *
 * Hiermee kan Claude Desktop en Claude Code rechtstreeks bij je agenda,
 * mail en taken — en kan Claude BOB hardop laten praten met jouw Cartesia-stem.
 * Alles loopt via de lokale BOB-server, dus je API-sleutels blijven op één plek.
 *
 * Start (voor testen):  node mcp/bob-mcp-server.js
 * In Claude Desktop:    zie mcp/claude_desktop_config.json
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const BASE = process.env.BOB_URL || `http://localhost:${process.env.PORT || 4321}`;

async function bob(pathname, init) {
  const res = await fetch(BASE + pathname, init);
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    if (!res.ok) throw new Error(`BOB ${res.status} op ${pathname}`);
    return { ok: true, bytes: (await res.arrayBuffer()).byteLength };
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `BOB ${res.status}`);
  return json;
}

const TOOLS = [
  {
    name: 'bob_agenda',
    description: 'Sanders afspraken uit Google Agenda en Outlook samen, op tijd gesorteerd. Gebruik dit voor elke vraag over zijn planning, beschikbaarheid of afspraken.',
    inputSchema: {
      type: 'object',
      properties: {
        offset: { type: 'number', description: '0 = vandaag, 1 = morgen, 2 = overmorgen. Standaard 0.' },
      },
    },
  },
  {
    name: 'bob_mail',
    description: 'Ongelezen mail uit Gmail en Outlook, met afzender en onderwerp.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'bob_tasks',
    description: 'Open Todoist-taken, gegroepeerd in over tijd / vandaag / morgen.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'bob_complete_task',
    description: 'Vinkt één Todoist-taak af. Vraag Sander altijd eerst om bevestiging voordat je dit gebruikt.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Het task-id uit bob_tasks.' } },
      required: ['id'],
    },
  },
  {
    name: 'bob_briefing',
    description: 'De samengestelde dagbriefing als tekst: agenda, taken en mail in één alinea.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'bob_speak',
    description: 'Laat BOB iets hardop zeggen op Sanders computer, met zijn eigen Cartesia-stem. Gebruik dit als hij vraagt om iets voor te lezen of te melden.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Wat BOB moet uitspreken. Nederlands, kort.' } },
      required: ['text'],
    },
  },
  {
    name: 'bob_status',
    description: 'Welke connectoren van BOB verbonden zijn en welke nog niet. Gebruik dit als iets niet lijkt te werken.',
    inputSchema: { type: 'object', properties: {} },
  },
];

const server = new Server(
  { name: 'bob', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    let result;
    switch (name) {
      case 'bob_agenda':       result = await bob(`/api/agenda?offset=${Number(args.offset) || 0}`); break;
      case 'bob_mail':         result = await bob('/api/mail'); break;
      case 'bob_tasks':        result = await bob('/api/todoist'); break;
      case 'bob_briefing':     result = await bob('/api/briefing'); break;
      case 'bob_status':       result = await bob('/api/status'); break;
      case 'bob_complete_task':
        result = await bob(`/api/todoist/${encodeURIComponent(args.id)}/complete`, { method: 'POST' });
        break;
      case 'bob_speak':
        result = await bob('/api/voice/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: args.text }),
        });
        result = { ok: true, spoken: args.text };
        break;
      default:
        throw new Error(`Onbekende tool: ${name}`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `BOB kon dit niet uitvoeren: ${err.message}\n` +
              `Draait de BOB-server op ${BASE}? Start hem met "npm start" in de BOB-map.`,
      }],
    };
  }
});

await server.connect(new StdioServerTransport());
console.error(`BOB MCP-server luistert. Praat met ${BASE}`);
