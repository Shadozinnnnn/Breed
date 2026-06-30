const getImageUrl = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

// Agora guardamos objetos com {name, id}
let allPokemon = []; 

window.onload = async () => {
    try {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1000');
        const data = await res.json();
        
        allPokemon = data.results.map(p => {
            const pId = p.url.split('/')[6]; // Pega o ID na URL
            return { name: p.name, id: pId };
        });
        
        document.getElementById('poke-input').placeholder = "Digite o nome do Pokémon...";
        document.getElementById('poke-input').disabled = false;
        document.getElementById('search-btn').disabled = false;
        
        // Inicializa o sistema de autocompletar
        setupAutocomplete();

    } catch (err) {
        console.error("Erro ao carregar dicionário", err);
        document.getElementById('poke-input').placeholder = "Erro ao carregar banco de dados.";
    }
};

// --- SISTEMA DE AUTOCOMPLETAR COM IMAGENS ---
function setupAutocomplete() {
    const inp = document.getElementById("poke-input");
    const list = document.getElementById("autocomplete-list");

    inp.addEventListener("input", function() {
        const val = this.value.toLowerCase();
        closeAllLists();
        
        if (!val) return false;
        list.style.display = "block";
        
        let matches = 0;
        for (let i = 0; i < allPokemon.length; i++) {
            // Se o nome incluir as letras digitadas
            if (allPokemon[i].name.includes(val)) {
                if (matches >= 20) break; // Limita a 20 fotos para não travar o site
                
                const item = document.createElement("div");
                item.className = "autocomplete-item";
                
                // Coloca a foto e o nome
                item.innerHTML = `
                    <img src="${getImageUrl(allPokemon[i].id)}" alt="${allPokemon[i].name}"> 
                    <strong>${allPokemon[i].name.replace('-', ' ')}</strong>
                `;
                
                // O que acontece quando clica no item da lista
                item.addEventListener("click", function() {
                    inp.value = allPokemon[i].name;
                    closeAllLists();
                    processSearch(); // Inicia a busca automaticamente!
                });
                
                list.appendChild(item);
                matches++;
            }
        }
        
        // Se não achou nada, fecha a lista
        if (matches === 0) closeAllLists();
    });

    // Fecha a lista se clicar fora dela
    document.addEventListener("click", function (e) {
        if (e.target !== inp) closeAllLists();
    });
}

function closeAllLists() {
    const list = document.getElementById("autocomplete-list");
    list.innerHTML = '';
    list.style.display = "none";
}
// --------------------------------------------

function handleEnter(e) {
    if (e.key === 'Enter' && !document.getElementById('search-btn').disabled) {
        closeAllLists();
        processSearch();
    }
}

function resetPage() {
    document.getElementById('hero-section').style.display = 'flex';
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('poke-input').value = '';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('autocorrect-box').style.display = 'none';
    closeAllLists();
}

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, 
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) 
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function findBestMatch(inputStr) {
    let bestMatch = "";
    let minDistance = Infinity;
    for (const p of allPokemon) {
        if (p.name === inputStr) return { match: p.name, distance: 0 };
        const distance = levenshteinDistance(inputStr, p.name);
        const penalty = p.name.startsWith(inputStr.substring(0, 2)) ? 0 : 1; 
        if (distance + penalty < minDistance) {
            minDistance = distance + penalty;
            bestMatch = p.name;
        }
    }
    return { match: bestMatch, distance: minDistance };
}

async function processSearch() {
    const rawInput = document.getElementById('poke-input').value.trim().toLowerCase();
    const errorDiv = document.getElementById('error-message');
    const loader = document.getElementById('loader');
    const autocorrectBox = document.getElementById('autocorrect-box');

    if (!rawInput) return;

    errorDiv.style.display = 'none';
    autocorrectBox.style.display = 'none';
    loader.style.display = 'block';

    const result = findBestMatch(rawInput);
    const searchTarget = result.match;

    if (result.distance > 0 && result.distance < 5) {
        autocorrectBox.innerHTML = `💡 Você pesquisou por "<strong>${rawInput}</strong>". Exibindo resultados para "<strong>${searchTarget}</strong>".`;
        autocorrectBox.style.display = 'block';
    } else if (result.distance >= 5) {
        loader.style.display = 'none';
        errorDiv.textContent = "Não consegui entender qual Pokémon você quer. Tente digitar novamente.";
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${searchTarget}`);
        if (!res.ok) throw new Error("Erro na busca da API.");
        const data = await res.json();

        const eggGroups = data.egg_groups;
        const targetId = data.id;
        const targetName = data.name;

        if (eggGroups.some(g => g.name === 'no-eggs')) {
            throw new Error(`${targetName.toUpperCase()} pertence ao grupo "Undiscovered" (Sem Ovos). Ele não pode cruzar.`);
        }

        let partners = new Map(); 

        for (const group of eggGroups) {
            const groupRes = await fetch(group.url);
            const groupData = await groupRes.json();
            
            groupData.pokemon_species.forEach(p => {
                const pId = p.url.split('/')[6];
                partners.set(p.name, { name: p.name, id: pId });
            });
        }

        if (targetName !== 'ditto' && !partners.has('ditto')) {
            partners.set('ditto', { name: 'ditto', id: 132 });
        }

        renderResults(targetName, targetId, eggGroups, Array.from(partners.values()));
        
        loader.style.display = 'none';
        document.getElementById('hero-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'block';

    } catch (err) {
        loader.style.display = 'none';
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
    }
}

function renderResults(name, id, eggGroups, partnersList) {
    const targetInfo = document.getElementById('target-info');
    let groupsHtml = eggGroups.map(g => `<span class="egg-groups-badge">${g.name.replace('-', ' ')}</span>`).join('');
    
    targetInfo.innerHTML = `
        <img src="${getImageUrl(id)}" alt="${name}">
        <div>
            <h3>${name}</h3>
            <div style="margin-top: 5px;">Grupos: ${groupsHtml}</div>
        </div>
    `;

    const grid = document.getElementById('partners-grid');
    let cardsHtml = '';

    partnersList.sort((a, b) => a.name.localeCompare(b.name));

    partnersList.forEach(p => {
        cardsHtml += `
            <div class="poke-card">
                <img src="${getImageUrl(p.id)}" alt="${p.name}" loading="lazy">
                <h4>${p.name.replace('-', ' ')}</h4>
            </div>
        `;
    });

    grid.innerHTML = cardsHtml;
    document.getElementById('status-msg').textContent = `Encontramos ${partnersList.length} parceiros compatíveis para ${name}:`;
}