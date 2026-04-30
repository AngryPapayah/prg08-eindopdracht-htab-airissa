import { tool } from "@langchain/core/tools";
import * as z from "zod";

export const searchCocktailDB = tool(
    async ({ cocktailName }) => {
        const url = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(cocktailName)}`;
        console.log(`🔧 searchCocktailDB aanroepen: "${cocktailName}"`);

        const response = await fetch(url);
        if (!response.ok) {
            console.log(`❌ searchCocktailDB: API-fout (${response.status}) voor "${cocktailName}"`);
            return `BRON: thecocktailDB\n\nAPI-fout (${response.status}) bij ophalen van "${cocktailName}".`;
        }
        const data = await response.json();

        if (!data.drinks) {
            console.log(`❌ searchCocktailDB: geen resultaat voor "${cocktailName}"`);
            return `BRON: thecocktailDB\n\nGeen recept gevonden voor "${cocktailName}".`;
        }

        const drink = data.drinks[0];
        const ingredients = [];
        for (let i = 1; i <= 15; i++) {
            if (drink[`strIngredient${i}`]) {
                const measure = drink[`strMeasure${i}`] ?? "";
                ingredients.push(`${measure} ${drink[`strIngredient${i}`]}`.trim());
            }
        }

        console.log(`✅ searchCocktailDB: gevonden "${drink.strDrink}"`);

        const imageMarker = drink.strDrinkThumb ? `\nAFBEELDING: ${drink.strDrinkThumb}` : "";
        return `BRON: thecocktailDB\n\nNaam: ${drink.strDrink}\nGlas: ${drink.strGlass}\nIngrediënten: ${ingredients.join(", ")}\nBereidingswijze: ${drink.strInstructions}${imageMarker}`;
    },
    {
        name: "searchCocktailDB",
        description: "Zoek een cocktailrecept via de thecocktailDB API. Gebruik dit UITSLUITEND als searchHudsonKnowledge 'Geen informatie' heeft teruggegeven. Als Hudson een recept heeft gevonden, roep deze tool dan NOOIT aan.",
        schema: z.object({
            cocktailName: z.string().describe("Naam van de cocktail, bijv. 'Margarita'"),
        }),
    }
);
