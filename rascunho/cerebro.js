const jogos = [
    {
        teams: "Bastard Munchen vs Munshine City",
        sport: "BlueLock",
        odds: [1.85, 3.20, 1.10]
    },
    {
        teams: "Red Bulls vs Warriors",
        sport: "Basquetebol",
        odds: [2.10, 3.00, 3.80]
    },
    {
        teams: "Bengazai vs Lord Sapiência",
        sport: "FreeStyle-Rap",
        odds: [2.10, 3.00, 3.80]
    }, 
    {
        teams: "Argentina vs Angola",
        sport: "Futebol",
        odds: [1.10, 1.50, 30.80]
    },

    {
        teams: "Golden W. vs Lakers",
        sport: "Basquetebol",
        odds: [2.10, 3.80]
    },
    {
        teams: "Rennes vs PSG",
        sport: "Futebol",
        odds: [1.60, 2.40]
    }
];

function rendeirizarJogos() {
    const container = document.getElementById("partidas");

    jogos.forEach(match => {
        const card = document.createElement("div");
        card.className = "match-card";

        card.innerHTML = `
            <div class="match-title">${match.teams}</div>
            <div class="match-sport">${match.sport}</div>

            <div class="odds">
                ${match.odds.map(o => `
                    <button class="odd-btn"> ${o} pts </button>
                `).join("")}
            </div>
        `;

        container.appendChild(card);
    });
}

rendeirizarJogos();
