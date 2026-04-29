// Genereer een uniek sessie-ID per browsertabblad
const sessionId = sessionStorage.getItem("htab_session_id") ?? (() => {
    const id = crypto.randomUUID();
    sessionStorage.setItem("htab_session_id", id);
    return id;
})();

const messagesEl = document.getElementById("messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

function appendMessage(role, text, sources = [], image = null) {
    const div = document.createElement("div");
    div.classList.add("message", role);
    div.textContent = text;

    if (image) {
        const img = document.createElement("img");
        img.src = image;
        img.classList.add("cocktail-image");
        img.alt = "Cocktail afbeelding";
        div.appendChild(img);
    }

    if (sources.length > 0) {
        const badgesEl = document.createElement("div");
        badgesEl.classList.add("source-badges");

        for (const src of sources) {
            const badge = document.createElement("span");
            badge.classList.add("badge");

            if (src === "Hudson Receptenboekje") {
                badge.classList.add("hudson");
                badge.textContent = "Hudson Receptenboekje";
            } else if (src === "thecocktailDB") {
                badge.classList.add("cocktaildb");
                badge.textContent = "thecocktailDB";
            } else {
                badge.textContent = src;
            }

            badgesEl.appendChild(badge);
        }

        div.appendChild(badgesEl);
    }

    if (role === "assistant" || role === "loading") {
        const row = document.createElement("div");
        row.classList.add("agent-row");

        const logo = document.createElement("img");
        logo.src = "images/hudson-logo.jpg";
        logo.classList.add("agent-logo");
        logo.alt = "Hudson";

        row.appendChild(logo);
        row.appendChild(div);
        messagesEl.appendChild(row);
        row.scrollIntoView({ behavior: "smooth" });
        return row;
    }

    messagesEl.appendChild(div);
    div.scrollIntoView({ behavior: "smooth" });
    return div;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    sendBtn.disabled = true;

    appendMessage("user", message);
    const loadingEl = appendMessage("loading", "HTab denkt na...");

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, sessionId }),
        });

        if (!response.ok) {
            throw new Error(`Server fout: ${response.status}`);
        }

        const data = await response.json();
        loadingEl.remove();
        appendMessage("assistant", data.answer, data.sources ?? [], data.image ?? null);

    } catch (err) {
        loadingEl.remove();
        appendMessage("assistant", `Fout: ${err.message}. Probeer het opnieuw.`);
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
});
