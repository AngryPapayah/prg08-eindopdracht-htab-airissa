import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { agent } from "./agent.js";
import { HumanMessage } from "@langchain/core/messages";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

const EXPECTED_TOOLS = ["searchHudsonKnowledge", "searchCocktailDB"];

function validateToolCalls(messages) {
    for (const msg of messages) {
        if (msg._getType() === "ai" && Array.isArray(msg.tool_calls)) {
            for (const call of msg.tool_calls) {
                const isKnown = EXPECTED_TOOLS.includes(call.name);
                console.log(
                    isKnown
                        ? `✅ Tool correct aangeroepen: ${call.name} — input: ${JSON.stringify(call.args)}`
                        : `⚠️  Onbekende tool aangeroepen: ${call.name}`
                );
            }
        }
    }
}

function parseSources(messages) {
    const sources = [];

    for (const msg of messages) {
        if (msg._getType() !== "tool") continue;

        const raw = typeof msg.content === "string"
            ? msg.content
            : Array.isArray(msg.content)
                ? msg.content.map(c => (typeof c === "string" ? c : (c.text ?? ""))).join("\n")
                : "";

        if (/BRON: Hudson receptenboekje/.test(raw) && !sources.includes("Hudson Receptenboekje")) {
            sources.push("Hudson Receptenboekje");
        }

        if (raw.includes("BRON: thecocktailDB") && !sources.includes("thecocktailDB")) {
            sources.push("thecocktailDB");
        }
    }

    return sources;
}

app.post("/chat", async (req, res) => {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
        return res.status(400).json({ error: "message en sessionId zijn verplicht" });
    }

    console.log(`\n💬 Vraag: "${message}" (sessie: ${sessionId})`);

    try {
        const result = await agent.invoke(
            { messages: [new HumanMessage(message)] },
            { configurable: { thread_id: sessionId } }
        );

        validateToolCalls(result.messages);
        const sources = parseSources(result.messages);

        const structured = result.structuredResponse;
        const answer = structured?.message ?? result.messages.at(-1)?.content;
        const image = structured?.image ?? null;

        console.log(`📎 Bronnen: ${sources.join(", ") || "geen tools"} | Afbeelding: ${image}`);

        res.json({ answer, sources, image, sessionId });

    } catch (err) {
        console.error("❌ Fout:", err.message);
        res.status(500).json({ error: "Er ging iets mis. Probeer het opnieuw." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🍹 HTab draait op http://localhost:${PORT}`);
});
