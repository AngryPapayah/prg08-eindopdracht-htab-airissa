import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, "docs");

const DOC_TITLES = {
    "hudson-cocktails.txt": "Cocktailrecepten",
    "hudson-bar-basics.txt": "Bar basics & technieken",
    "hudson-bier-fris.txt": "Bier & frisdranken",
    "hudson-spirits-wines.txt": "Spirits & wijnen",
};

function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

class MemoryVectorStore {
    constructor() {
        this.chunks = [];
    }

    add(content, embedding, metadata) {
        this.chunks.push({ content, embedding, metadata });
    }

    search(queryEmbedding, k = 4) {
        return this.chunks
            .map(chunk => ({ ...chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, k);
    }
}

let vectorStore = null;
const embeddings = new AzureOpenAIEmbeddings();

export async function buildVectorStore() {
    if (vectorStore) return vectorStore;

    console.log("📚 Vectorstore opbouwen uit docs/...");
    vectorStore = new MemoryVectorStore();

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
    });

    const files = readdirSync(docsDir).filter(f => f.endsWith(".txt"));

    for (const filename of files) {
        const content = readFileSync(join(docsDir, filename), "utf-8");
        const docTitle = DOC_TITLES[filename] ?? filename;

        const chunks = await splitter.createDocuments(
            [content],
            [{ source: filename, docTitle }]
        );

        const texts = chunks.map(c => c.pageContent);
        const vectors = await embeddings.embedDocuments(texts);

        for (let i = 0; i < chunks.length; i++) {
            vectorStore.add(chunks[i].pageContent, vectors[i], chunks[i].metadata);
        }

        console.log(`  ✅ ${filename} (${docTitle}): ${chunks.length} chunks`);
    }

    console.log(`📚 Vectorstore klaar: ${vectorStore.chunks.length} chunks totaal\n`);
    return vectorStore;
}

export async function searchVectorStore(query, k = 4) {
    const store = await buildVectorStore();
    const queryVector = await embeddings.embedQuery(query);
    return store.search(queryVector, k);
}
