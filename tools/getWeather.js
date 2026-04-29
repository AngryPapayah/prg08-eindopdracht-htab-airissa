import { tool } from "@langchain/core/tools";
import * as z from "zod";

export const getWeather = tool(
    async ({ city }) => {
        const apiKey = process.env.WEATHER_API_KEY;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=nl`;

        console.log(`🔧 getWeather aanroepen voor: ${city}`);

        const response = await fetch(url);

        if (!response.ok) {
            console.log(`❌ getWeather: fout voor "${city}" (${response.status})`);
            return `BRON: Weerdienst\n\nKon het weer voor "${city}" niet ophalen.`;
        }

        const data = await response.json();
        const temp = Math.round(data.main.temp);
        const feels = Math.round(data.main.feels_like);
        const desc = data.weather[0].description;

        let drinkTip = "";
        if (temp >= 22) {
            drinkTip = "Lekker warm — tip aan de gast: verfrissende cocktails zoals een Mojito, Aperol Spritz of Moscow Mule zijn nu extra populair.";
        } else if (temp >= 15) {
            drinkTip = "Aangenaam weer — klassiekers als Negroni of Whiskey Sour passen goed.";
        } else {
            drinkTip = "Koud weer — gasten kiezen nu eerder voor warme dranken of stevige cocktails zoals een Dark & Stormy of Espresso Martini.";
        }

        console.log(`✅ getWeather: ${city} ${temp}°C, ${desc}`);

        return `BRON: Weerdienst\n\nWeer in ${data.name}: ${temp}°C (voelt als ${feels}°C), ${desc}.\n\n${drinkTip}`;
    },
    {
        name: "getWeather",
        description: "Haal het actuele weer op voor een stad om een passende drankentip te geven aan gasten of barpersoneel.",
        schema: z.object({
            city: z.string().describe("Naam van de stad, bijv. 'Leiden'"),
        }),
    }
);
