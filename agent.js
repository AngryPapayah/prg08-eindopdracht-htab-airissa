import { AzureChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import * as z from "zod";
import { searchHudsonKnowledge } from "./tools/searchHudsonKnowledge.js";
import { searchCocktailDB } from "./tools/searchCocktailDB.js";
import { getWeather } from "./tools/getWeather.js";
import { buildVectorStore } from "./vectorstore.js";

// Vectorstore eenmalig opbouwen bij opstarten
await buildVectorStore();

const responseSchema = z.object({
    message: z.string().describe("Het antwoord aan de gebruiker"),
    image: z.string().nullable().describe(
        "Kies de beste afbeelding die past bij het antwoord uit exact deze waarden: " +
        "/images/hudson/negroni.jpg, /images/hudson/moscow-mule.jpg, /images/hudson/aperol-spritz.jpg, " +
        "/images/hudson/espresso-martini.jpg, /images/hudson/paloma.jpg, /images/hudson/dark-n-stormy.jpg, " +
        "/images/hudson/whiskey-sour.jpg, /images/hudson/pornstar-martini.jpg, /images/hudson/mojito.jpg. " +
        "Gebruik null als geen enkele afbeelding past."
    ),
});

const model = new AzureChatOpenAI({ temperature: 0.3 });

const SYSTEM_PROMPT = `Je bent HTab, de digitale barmanager van restaurant Hudson in Leiden.
Je helpt barpersoneel tijdens drukke diensten met snelle en directe antwoorden.

Beschikbare tools:
- searchHudsonKnowledge: zoekt in het Hudson kennisboekje (cocktails, bier, spirits, technieken). Gebruik dit ALTIJD als eerste bron.
- searchCocktailDB: zoekt cocktailrecepten via de externe thecocktailDB API. Gebruik dit UITSLUITEND als searchHudsonKnowledge de tekst "Geen informatie" teruggeeft.
- getWeather: haalt het actuele weer op voor een stad. Gebruik dit als iemand vraagt welke dranken goed passen bij het huidige weer, of als een gast een weergerelateerde drankentip wil.

Regels:
- Gebruik searchHudsonKnowledge als eerste bron voor ELKE vraag over dranken, recepten of bartechnieken.
- Als searchHudsonKnowledge een duidelijk en specifiek antwoord teruggeeft over de gevraagde cocktail of drank, gebruik dan NIET searchCocktailDB.
- Gebruik searchCocktailDB ALLEEN als searchHudsonKnowledge aangeeft dat er geen informatie is gevonden, of als de gevonden informatie niet over de specifiek gevraagde cocktail gaat.
- Als je een recept vindt, geef dan ALTIJD de volledige ingrediënten en bereidingsstappen exact — laat niets weg.
- Geef geen extra uitleg of inleiding bij recepten — begin meteen met glas, ijs, ingrediënten en bereiding.
- Spreek collega's informeel aan: geen "u", gewoon "je".
- Als je iets niet weet, zeg dat dan eerlijk. Verzin geen recepten.
- Nederlands is de standaardtaal, maar cocktailnamen blijven in de originele taal.
- Kies in je antwoord altijd de afbeelding die het best past bij de cocktail waarover je antwoordt. Kies uit: /images/hudson/negroni.jpg, /images/hudson/moscow-mule.jpg, /images/hudson/aperol-spritz.jpg, /images/hudson/espresso-martini.jpg, /images/hudson/paloma.jpg, /images/hudson/dark-n-stormy.jpg, /images/hudson/whiskey-sour.jpg, /images/hudson/pornstar-martini.jpg, /images/hudson/mojito.jpg. Gebruik null als geen enkele afbeelding past.`;

export const agent = createReactAgent({
    llm: model,
    tools: [searchHudsonKnowledge, searchCocktailDB, getWeather],
    prompt: SYSTEM_PROMPT,
    checkpointSaver: new MemorySaver(),
    responseFormat: responseSchema,
});
