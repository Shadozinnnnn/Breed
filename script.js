const getImageUrl = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
let allPokemon = [];

// Base de dados de Egg Moves para servidor
const eggMoveDatabase = {
    "scyther": [
        { move: "Night Slash", partner: "Heracross / Pinsir" },
        { move: "Defog", partner: "Butterfree" }
    ],
    "feebas": [
        { move: "Dragon Breath", partner: "Gyarados" },
        { move: "Mirror Coat", partner: "Corsola" }
    ]
};

window.onload = async () => {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1000');
    const data = await res.json();
    allPokemon = data.results.map((p, i) => ({ name: p.name, id: i + 1 }));
    setupAutocomplete();
};

function setupAutocomplete() {
    const inp = document.getElementById("poke-input");
    const list = document.getElementById("autocomplete-list");
    inp.addEventListener("input", function() {
        list.innerHTML = "";
        const val = this.value.toLowerCase();
        if (!val) return;
        allPokemon.filter(p => p.name.includes(val)).slice(0, 5).forEach(p => {
            const div = document.createElement("div");
            div.className = "autocomplete-item";
            div.innerHTML = `<img src="${getImageUrl(p.id)}" width="40"> ${p.name}`;
            div.onclick = () => { inp.value = p.name; processSearch(); };
            list.appendChild(div);
        });
    });
}

async function processSearch() {
    const name = document.getElementById('poke-input').value.toLowerCase();
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${name}`);
    if (!res.ok) { alert("Pokémon não encontrado!"); return; }
    const data = await res.json();

    // Lógica de restrição (Exemplo)
    if (data.egg_groups.length === 0 || data.egg_groups[0].name === "no-eggs") {
        document.getElementById('status-msg').innerText = "❌ Este Pokémon não pode ser usado no /breed.";
        return;
    }

    // Exibir Egg Moves
    const moves = eggMoveDatabase[name] || [];
    const moveHtml = moves.length > 0 ? `<h3>🧬 Egg Moves Sugeridos:</h3><ul>${moves.map(m => `<li>${m.move} via ${m.partner}</li>`).join('')}</ul>` : "";
    document.getElementById('egg-moves-section').innerHTML = moveHtml;

    // Buscar parceiros (Simplificado)
    const groupUrl = data.egg_groups[0].url;
    const groupRes = await fetch(groupUrl);
    const groupData = await groupRes.json();
    
    document.getElementById('partners-grid').innerHTML = groupData.pokemon_species.slice(0, 20).map(p => 
        `<div class="poke-card">${p.name}</div>`
    ).join('');

    document.getElementById('hero-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'block';
}

function resetPage() { location.reload(); }
