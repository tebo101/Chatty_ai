const charName = 'TestCharacter';
const charPersonality = 'TestPersonality';

fetch('http://localhost:3000/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: charName, personality: charPersonality })
}).then(res => res.json()).then(console.log).catch(console.error);
