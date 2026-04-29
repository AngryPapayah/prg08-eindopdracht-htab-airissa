import { tool } from "@langchain/core/tools";
import { searchVectorStore } from "../vectorstore.js";
import * as z from "zod";

export const searchHudsonKnowledge = tool(
    async ({ query }) => {
        console.log(`🔧 searchHudsonKnowledge aanroepen: "${query}"`);

        const MIN_SCORE = 0.5;
        const allResults = await searchVectorStore(query, 4);

        console.log(`   scores: ${allResults.map(r => r.score.toFixed(2)).join(", ")}`);

        const results = allResults.filter(r => r.score >= MIN_SCORE);

        if (results.length === 0) {
            console.log(`❌ searchHudsonKnowledge: niets gevonden voor "${query}" (beste: ${allResults[0]?.score?.toFixed(2)})`);
            return `Geen informatie over "${query}" gevonden in het Hudson kennisboekje.`;
        }

        const sources = [...new Set(results.map(r => r.metadata.source))];
        const sourceLabel = sources.map(s => `${s}`).join(", ");

        console.log(`✅ searchHudsonKnowledge: ${results.length} chunks uit [${sourceLabel}] (score ≥ ${MIN_SCORE})`);

        const content = results.map(r => r.content).join("\n\n---\n\n");
        return `BRON: Hudson receptenboekje (${sourceLabel})\n\n${content}`;
    },
    {
        name: "searchHudsonKnowledge",
        description: "Zoek informatie in het Hudson kennisboekje over cocktails, bier, frisdranken, spirits, wijnen en bartechnieken. Gebruik dit ALTIJD als eerste bron.",
        schema: z.object({
            query: z.string().describe("Zoekterm, bijv. 'Negroni recept' of 'bieren op tap'"),
        }),
    }
);
