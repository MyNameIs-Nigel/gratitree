// Smooth scrolling (honors reduced motion via CSS block)
document.documentElement.style.scrollBehavior = 'smooth';

// --- Tiny demo state (no backend) ---
const input = document.getElementById('noteInput');
const addBtn = document.getElementById('addBtn');
const frame = document.getElementById('frame');
const countLabel = document.getElementById('countLabel');

const cards = []; // [{el, text, colors}]
const palette = [
    ['#CFFAE1','#7AD9B9'],
    ['#E6F7FF','#9FD7FF'],
    ['#FFF2D9','#FFC98B'],
    ['#F3E8FF','#D0B5FF'],
    ['#FFE6EA','#FFB8C4'],
    ['#E6FFE9','#A6F5BD']
];

function randomPalette(){
    const [soft, bold] = palette[Math.floor(Math.random() * palette.length)];
    return {soft, bold};
}

function updateCount(){
    countLabel.textContent = `${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`;
}

function createCardElement(text, colors){
    const card = document.createElement('div');
    card.className = 'stack-card';
    card.style.background = `linear-gradient(180deg, ${colors.soft}, ${colors.bold})`;
    card.style.filter = 'saturate(1.05)';

    const inner = document.createElement('div');
    inner.className = 'text';
    inner.textContent = text;
    card.appendChild(inner);

    card.style.transform = 'translateY(0) scale(1)';
    card.style.opacity = '1';
    card.style.zIndex = '1000';
    return card;
}

function renderStack(){
    frame.querySelectorAll('.stack-card').forEach(n => n.remove());
    const visible = Math.min(cards.length, 5);

    for (let i = 0; i < cards.length; i++){
    const { el } = cards[i];
    if (i < visible){
        const offset = i * 10;
        const scale = 1 - i * 0.04;
        const opacity = 1 - i * 0.12;
        el.style.transform = `translateY(${offset}px) scale(${scale})`;
        el.style.opacity = opacity.toString();
        el.style.zIndex = (1000 - i).toString();
        frame.appendChild(el);
    } else {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px) scale(0.8)';
    }
    }
    updateCount();
}

function addCardFromInput(){
    const text = input.value.trim();
    if (!text) return;
    const colors = randomPalette();
    const el = createCardElement(text, colors);
    cards.unshift({ el, text, colors });
    renderStack();
    input.value = '';
    input.focus();
}

function cycleStack(){
    if (cards.length <= 1) return;
    const top = cards.shift();
    cards.push(top);
    renderStack();
}

addBtn.addEventListener('click', addCardFromInput);
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter'){
    e.preventDefault();
    addCardFromInput();
    }
});
frame.addEventListener('click', cycleStack);

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Seed demo
const samples = [
    'Morning sunlight through the window',
    'A friend who checked in',
    'Finishing that tough task',
    'Hot tea and a quiet moment'
];
samples.reverse().forEach(t => {
    const colors = randomPalette();
    const el = createCardElement(t, colors);
    cards.unshift({ el, text: t, colors });
});
renderStack();

// Signup demo submit
const signup = document.getElementById('signup');
signup.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = signup.querySelector('input[type="email"]').value.trim();
    if (!email) return;
    alert(`You're on the list! (demo)\n\nEmail: ${email}`);
    signup.reset();
});