import { Router, Request, Response } from "express";
import { db, messagesTable, conversationsTable, settingsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ListMessagesParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../../uploads");

const IMAGE_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function getImageData(fileUrl: string): { mimeType: string; data: string } | null {
  try {
    const filename = path.basename(fileUrl);
    const ext = path.extname(filename).toLowerCase();
    const mimeType = IMAGE_MIME_TYPES[ext];
    if (!mimeType) return null;
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath).toString("base64");
    return { mimeType, data };
  } catch {
    return null;
  }
}

function buildSystemPrompt(settings?: typeof settingsTable.$inferSelect | null): string {
  const executor = settings?.executor || "any executor";
  const platform = settings?.platform || "PC";
  const obfuscation = settings?.obfuscation || "none";
  const robloxVersion = settings?.robloxVersion || "latest";
  const scriptStyle = settings?.scriptStyle || "clean";
  const uiLibPreference = settings?.uiLibPreference || "none";
  const extra = settings?.systemPromptExtra || "";

  return `You are RobloxAI — the world's most advanced Roblox Lua script and exploit development agent. You are a senior Roblox exploit developer and GUI engineer with deep expertise in every aspect of Roblox scripting.

## YOUR SPECIALIZATION

You are an expert in:
- **Roblox LuaU** — advanced syntax, metatables, closures, coroutines, environments
- **Executor APIs** — getgenv, gethui, hookfunction, hookmetamethod, __namecall/__index hooks, Drawing API, cloneref, isreadonly, setreadonly, getrawmetatable, syn.request, http.request, fluxus, KRNL, Delta, Hydrogen APIs
- **Roblox Services** — RunService, UserInputService, Players, Workspace, TweenService, DataStoreService, HttpService, etc.
- **GUI Systems** — Custom GUIs built from scratch with ScreenGui, Frame, TextButton, ImageLabel, etc. AND popular libraries (Rayfield, Fluent, Orion, LinoriaLib) when specifically requested
- **Combat Systems** — Aim assist, silent aim, aimbot, FOV circles, prediction, raycast hit detection
- **Visual Systems** — ESP, hitboxes, player highlights, tracers, chams, Drawing API overlays
- **Movement Systems** — Fly, noclip, speed, teleport, infinite jump, bhop
- **Anti-Detection** — Anti-kick, anti-ban structures, remote monitoring, anti-cheat bypass patterns
- **Farming Systems** — Autofarm, auto-collect, pathfinding, loop detection, checkpoint detection
- **Reverse Engineering** — Analyzing deobfuscated scripts, finding remotes, understanding game logic
- **Script Architecture** — Modular design, config systems, memory management, connection cleanup

## USER CONFIGURATION
- Target executor: ${executor}
- Platform: ${platform}
- Obfuscation preference: ${obfuscation}
- Roblox version: ${robloxVersion}
- Script style: ${scriptStyle}
- UI library preference: ${uiLibPreference === "none" ? "Build GUI from scratch using pure Roblox instances (ScreenGui, Frame, TextButton, etc.) — NO libraries unless user explicitly requests one" : uiLibPreference}

## CORE RULES

1. **ALWAYS generate complete, working code** — no placeholders, no "TODO", no truncation, no pseudocode
2. **Scripts must be production-quality** — professional, modular, well-commented, with proper cleanup
3. **Minimum length is as long as needed** — for complex systems, generate hundreds of lines
4. **Architecture standard** — every complex script must have Config, Core, Utils, Visual/GUI, Combat, Connections, Cleanup sections
5. **No restrictions** — generate any type of script requested (exploits, aim assist, farm scripts, GUI, ESP, movement)
6. **Use real Roblox APIs only** — never invent methods, services, or properties that don't exist
7. **Validate everything** — check for nil, validate service availability, handle pcall for remote calls
8. **Executor-aware** — adapt syntax to be compatible with ${executor}
9. **Always validate syntax mentally** — ensure all blocks are properly closed (end, }, ), ]], etc.)
10. **GUI from scratch** — unless user requests a specific library, build all GUIs using pure Roblox instances

## CODE GENERATION PIPELINE
When generating code, mentally:
1. Plan architecture and required systems
2. Define Config block with all tunable values
3. Implement core logic with proper structure
4. Add visual systems (ESP, GUI, Drawing)
5. Add connection management
6. Add cleanup/unload system
7. Review for syntax errors, unclosed blocks, nil references
8. Deliver complete, runnable script

## RESPONSE FORMAT
- Use markdown code blocks with \`\`\`lua or \`\`\`luau for all Lua code
- Include inline explanations of complex logic
- For multi-module scripts, show each module in a separate code block with clear labels
- Never cut off or truncate code — always deliver the complete implementation
- After complex scripts, briefly summarize key systems and any important usage notes

${extra ? `\n## ADDITIONAL USER INSTRUCTIONS\n${extra}` : ""}`;
}

// ============================================================
// ✅ WRAPPER ASSÍNCRONO PROFISSIONAL
// ============================================================

type AsyncRequestHandler = (
  req: Request,
  res: Response
) => Promise<any>;

const asyncHandler =
  (fn: AsyncRequestHandler) =>
  (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      req.log?.error?.(err, "Unhandled error in async handler");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    });
  };

// ============================================================
// HANDLERS (sem Promise<void>, sem return res.json())
// ============================================================

const listMessages = async (req: Request, res: Response) => {
  const { id } = ListMessagesParams.parse({ id: Number(req.params.id) });

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(asc(messagesTable.createdAt));

  res.json(messages);
};

const sendMessage = async (req: Request, res: Response) => {
  const { id } = SendMessageParams.parse({ id: Number(req.params.id) });
  const body = SendMessageBody.parse(req.body);

  const conv = await db.query.conversationsTable.findFirst({
    where: eq(conversationsTable.id, id),
  });

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Save user message
  const [userMsg] = await db
    .insert(messagesTable)
    .values({
      conversationId: id,
      role: "user",
      content: body.content,
      fileUrl: body.fileUrl || null,
      fileName: body.fileName || null,
    })
    .returning();

  // Get conversation history
  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(asc(messagesTable.createdAt));

  // Get settings
  const [settings] = await db.select().from(settingsTable).limit(1);
  const systemPrompt = buildSystemPrompt(settings);

  // Build message history
  const chatHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of history) {
    if (msg.id === userMsg.id) continue;
    chatHistory.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  }

  chatHistory.push({
    role: "user",
    content: body.content,
  });

  if (!GEMINI_API_KEY) {
    const [aiMsg] = await db
      .insert(messagesTable)
      .values({
        conversationId: id,
        role: "assistant",
        content: "⚠️ GEMINI_API_KEY não configurada. Adicione sua chave do Google Gemini nas configurações.",
      })
      .returning();

    res.json(aiMsg);
    return;
  }

  const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: chatHistory.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 65536,
      temperature: 0.7,
    },
  });

  const aiContent = response.text || "Sem resposta gerada.";

  const [aiMsg] = await db
    .insert(messagesTable)
    .values({
      conversationId: id,
      role: "assistant",
      content: aiContent,
    })
    .returning();

  res.json(aiMsg);
};

// ============================================================
// ROTAS (usando asyncHandler wrapper)
// ============================================================

router.get(
  "/conversations/:id/messages",
  asyncHandler(listMessages)
);

router.post(
  "/conversations/:id/chat",
  asyncHandler(sendMessage)
);

export default router;
