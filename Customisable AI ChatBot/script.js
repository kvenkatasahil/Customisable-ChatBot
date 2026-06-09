// ==========================================
// CHATBOT LOGIC WITH CUSTOMIZABLE PERSONAS
// ==========================================

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const setupNotice = document.getElementById('setup-notice');
const closeNoticeBtn = document.getElementById('close-notice');

// Onboarding DOM Elements
const onboardingContainer = document.getElementById('onboarding-container');
const chatContainer = document.getElementById('chat-container');
const screenSelectPersona = document.getElementById('screen-select-persona');
const screenUserInfo = document.getElementById('screen-user-info');
const personaGrid = document.getElementById('persona-grid');
const selectedPersonaPreview = document.getElementById('selected-persona-preview');
const dynamicInputsContainer = document.getElementById('dynamic-inputs-container');
const userInfoForm = document.getElementById('user-info-form');
const backToPersonasBtn = document.getElementById('back-to-personas');
const backToOnboardingBtn = document.getElementById('back-to-onboarding');
const submitIntakeBtn = document.getElementById('submit-intake-btn');

// State Variables
let selectedPersonaKey = null;
let messageHistory = [];

// ==========================================
// INITIALIZATION & SCREEN SWAP LOGIC
// ==========================================

// Check if API key is missing and show notice
if (GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE' || GROQ_API_KEY === '') {
    setTimeout(() => {
        setupNotice.classList.add('show');
    }, 1000);
}

closeNoticeBtn.addEventListener('click', () => {
    setupNotice.classList.remove('show');
});

// Render the select specialist cards dynamically from config.js
function initOnboarding() {
    personaGrid.innerHTML = ''; // Clear first

    Object.keys(AI_PERSONAS).forEach(key => {
        const persona = AI_PERSONAS[key];

        const card = document.createElement('div');
        card.className = 'persona-card';

        card.innerHTML = `
            <div class="persona-card-icon" style="background: ${persona.color}">
                <i class="fas ${persona.icon}"></i>
            </div>
            <div class="persona-card-info">
                <h3>${persona.name}</h3>
                <p>${persona.description}</p>
            </div>
            <div class="persona-card-chevron">
                <i class="fas fa-chevron-right"></i>
            </div>
        `;

        // Hover border color effect using dynamic styling
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = getComputedThemeColor(persona.color);
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = 'var(--border-color)';
        });

        card.addEventListener('click', () => selectPersona(key));
        personaGrid.appendChild(card);
    });
}

// Helper to extract hex or rgb color from the gradient string for border styling
function getComputedThemeColor(gradientStr) {
    if (gradientStr.includes('#10b981')) return '#10b981';
    if (gradientStr.includes('#f59e0b')) return '#f59e0b';
    if (gradientStr.includes('#ef4444')) return '#ef4444';
    // Fallback if custom gradient is defined: extract first hex value
    const hexRegex = /#[0-9a-fA-F]{6}/;
    const match = gradientStr.match(hexRegex);
    return match ? match[0] : '#3d1a9a';
}

// When a persona is clicked, display the details form screen
function selectPersona(key) {
    selectedPersonaKey = key;
    const persona = AI_PERSONAS[key];

    // Update preview banner
    selectedPersonaPreview.innerHTML = `
        <div class="selected-persona-preview-icon" style="background: ${persona.color}">
            <i class="fas ${persona.icon}"></i>
        </div>
        <div class="selected-persona-preview-info">
            <h4>${persona.name}</h4>
            <p>${persona.description}</p>
        </div>
    `;

    // Custom style for submit button to match selected persona
    submitIntakeBtn.style.background = persona.color;

    // Dynamically build input fields
    dynamicInputsContainer.innerHTML = '';

    persona.questions.forEach(q => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.setAttribute('for', `input-${q.id}`);
        label.innerText = q.label;
        formGroup.appendChild(label);

        let inputEl;
        if (q.type === 'select') {
            inputEl = document.createElement('select');
            inputEl.id = `input-${q.id}`;
            inputEl.required = true;

            // Add a default placeholder option
            const defaultOpt = document.createElement('option');
            defaultOpt.value = "";
            defaultOpt.innerText = "-- Select an option --";
            defaultOpt.disabled = true;
            defaultOpt.selected = true;
            inputEl.appendChild(defaultOpt);

            q.options.forEach(opt => {
                const optEl = document.createElement('option');
                optEl.value = opt;
                optEl.innerText = opt;
                inputEl.appendChild(optEl);
            });
        } else {
            inputEl = document.createElement('input');
            inputEl.type = q.type;
            inputEl.id = `input-${q.id}`;
            inputEl.placeholder = q.placeholder || '';
            inputEl.required = true;

            // Focus styling based on active gradient
            inputEl.addEventListener('focus', () => {
                inputEl.style.borderColor = getComputedThemeColor(persona.color);
                inputEl.style.boxShadow = `0 0 0 3px ${getComputedThemeColor(persona.color)}20`;
            });
            inputEl.addEventListener('blur', () => {
                inputEl.style.borderColor = 'var(--border-color)';
                inputEl.style.boxShadow = 'none';
            });
        }

        formGroup.appendChild(inputEl);
        dynamicInputsContainer.appendChild(formGroup);
    });

    // Smooth transition between screens
    screenSelectPersona.style.display = 'none';
    screenUserInfo.style.display = 'flex';
}

// Go back button from the info screen
backToPersonasBtn.addEventListener('click', () => {
    screenUserInfo.style.display = 'none';
    screenSelectPersona.style.display = 'flex';
});

// Go back button from the chat screen to selection screen
backToOnboardingBtn.addEventListener('click', () => {
    chatContainer.classList.add('hidden');
    onboardingContainer.classList.remove('hidden');
    screenUserInfo.style.display = 'none';
    screenSelectPersona.style.display = 'flex';
    messageHistory = [];
    chatMessages.innerHTML = '';
});

// Submit user details form and start chat
userInfoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const persona = AI_PERSONAS[selectedPersonaKey];
    const answers = [];

    // Collect all answers
    persona.questions.forEach(q => {
        const inputEl = document.getElementById(`input-${q.id}`);
        answers.push({
            id: q.id,
            label: q.label,
            value: inputEl.value
        });
    });

    // Create the initial system prompt containing user answers
    const detailsString = answers.map(a => `${a.label}: ${a.value}`).join('; ');
    const systemPrompt = `${persona.systemPrompt} The user has shared their details: ${detailsString}.`;

    messageHistory = [
        { role: "system", content: systemPrompt }
    ];

    // Update Chat Header visuals to match selected persona
    const chatHeader = document.getElementById('chat-header');
    const chatHeaderIcon = document.getElementById('chat-header-icon');
    const chatHeaderTitle = document.getElementById('chat-header-title');
    const chatHeaderSubtitle = document.getElementById('chat-header-subtitle');

    chatHeader.style.background = persona.color;
    chatHeaderIcon.className = `fas ${persona.icon}`;
    chatHeaderTitle.innerText = persona.name;
    chatHeaderSubtitle.innerText = "Personalized Session";

    // Shift layout to chat container
    onboardingContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    userInput.focus();

    // Fetch personalized greeting from the AI
    await fetchWelcomeGreeting(persona, answers);
});

// Call API to generate a personalized welcoming greeting
async function fetchWelcomeGreeting(persona, answers) {
    const typingId = showTypingIndicator();

    // Handle demo mode if API key is not yet set
    if (GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE' || GROQ_API_KEY === '') {
        setTimeout(() => {
            removeMessage(typingId);
            const userDetailsList = answers.map(a => `• <b>${a.label}</b>: ${escapeHTML(a.value)}`).join('<br>');
            const demoGreeting = `Hi there! I am your <b>${persona.name}</b> assistant.<br><br>` +
                `Here is the information I gathered about you:<br>${userDetailsList}<br><br>` +
                `⚠️ <b>API Key Missing:</b> Please add your Groq API key in the <code>config.js</code> file to start a real chat session with me!`;

            // Render demo message in the chat
            appendMessage('bot', demoGreeting, true);
            messageHistory.push({ role: "assistant", content: demoGreeting });
        }, 1200);
        return;
    }

    try {
        // Temporary welcome generation query
        const requestHistory = [
            ...messageHistory,
            { role: "user", content: `(System instruction: Please execute this task: "${persona.welcomePrompt}". Write a warm greeting as the assistant based on my details. Keep it to 2-3 sentences. Do not mention that this is an instruction.)` }
        ];

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: requestHistory,
                temperature: 0.7,
                max_tokens: 256,
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const botReply = data.choices[0].message.content;

        removeMessage(typingId);
        appendMessage('bot', botReply);
        messageHistory.push({ role: "assistant", content: botReply });

    } catch (error) {
        removeMessage(typingId);
        const fallbackMsg = `Hello! I am your ${persona.name}. I've successfully received your details and am ready to support your goals. How can I help you today?`;
        appendMessage('bot', fallbackMsg);
        messageHistory.push({ role: "assistant", content: fallbackMsg });
        console.error("Welcome Greeting Error:", error);
    }
}

// ==========================================
// CHAT BOT CORE FUNCTIONALITY
// ==========================================

// Add event listeners for chatting
sendBtn.addEventListener('click', handleSendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});

async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    userInput.value = '';
    appendMessage('user', text);
    messageHistory.push({ role: "user", content: text });

    const typingId = showTypingIndicator();

    try {
        if (GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE' || GROQ_API_KEY === '') {
            throw new Error("Please add your Groq API key to the config.js file first.");
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messageHistory,
                temperature: 0.7,
                max_tokens: 1024,
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const botReply = data.choices[0].message.content;

        removeMessage(typingId);
        appendMessage('bot', botReply);
        messageHistory.push({ role: "assistant", content: botReply });

    } catch (error) {
        removeMessage(typingId);
        appendMessage('bot', `⚠️ Error: ${error.message}`);
        console.error("Chatbot Error:", error);
        messageHistory.pop(); // Remove the failed message from history
    }
}

function appendMessage(sender, text, isHTML = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (isHTML) {
        contentDiv.innerHTML = text; // Trusted HTML injection (e.g. for key missing notice)
    } else {
        contentDiv.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');
    }

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.id = id;

    messageDiv.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) {
        el.remove();
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Start onboarding layout on page load
initOnboarding();
