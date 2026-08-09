"""
Student Career Assistant — a Streamlit chatbot powered by the Google Gemini API.

Run locally with:
    pip install streamlit google-genai
    streamlit run chatbot_app.py
"""

import os
import streamlit as st
from google import genai
from google.genai import types
from google.genai.errors import APIError

# Check environment variables for fallback API key
default_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""

# ---------------------------------------------------------------------------
# 1. PAGE CONFIG — sets browser tab title/icon, must be the first st. call
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Student Career Assistant",
    page_icon="🎓",
    layout="centered",
    initial_sidebar_state="expanded"
)

# ---------------------------------------------------------------------------
# 2. SYSTEM PROMPT — defines the bot's role and personality.
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "You are a helpful assistant for a college student, answering questions "
    "about study tips, resume building, and career guidance. Give practical, "
    "specific advice rather than generic platitudes. Keep answers focused "
    "and easy to act on. If a question is outside your scope (e.g. medical, "
    "legal, or highly personal advice), say so honestly and suggest who they "
    "should talk to instead."
)

# ---------------------------------------------------------------------------
# 3. PREMIUM UI STYLING — Injected custom CSS for modern aesthetics
# ---------------------------------------------------------------------------
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
    
    /* General app container background and typography */
    .stApp {
        background: radial-gradient(circle at 50% 0%, #191b35 0%, #0d0e15 100%) !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        color: #f1f5f9 !important;
    }
    
    /* Sidebar styling */
    section[data-testid="stSidebar"] {
        background-color: #07080d !important;
        border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
    }
    
    /* Input inputs and labels in sidebar */
    section[data-testid="stSidebar"] .stMarkdown h2, 
    section[data-testid="stSidebar"] .stMarkdown p,
    section[data-testid="stSidebar"] label {
        color: #e2e8f0 !important;
    }
    
    section[data-testid="stSidebar"] input {
        background-color: #11121d !important;
        color: #f1f5f9 !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 12px !important;
        padding: 0.5rem !important;
    }
    
    /* Chat input box at the bottom */
    div[data-testid="stChatInput"] {
        border: 1px solid rgba(99, 102, 241, 0.25) !important;
        border-radius: 24px !important;
        background-color: rgba(16, 17, 28, 0.92) !important;
        box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.6) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
    }
    
    /* Chat message container styling */
    .stChatMessage {
        border-radius: 20px !important;
        padding: 1.25rem !important;
        margin-bottom: 1.25rem !important;
        background-color: rgba(255, 255, 255, 0.015) !important;
        border: 1px solid rgba(255, 255, 255, 0.04) !important;
        box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.15) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    .stChatMessage:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.25) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
    }
    
    /* User Chat Message */
    .stChatMessage[data-testid="stChatMessageUser"] {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(79, 70, 229, 0.03) 100%) !important;
        border: 1px solid rgba(99, 102, 241, 0.2) !important;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.08) !important;
    }
    
    /* Assistant Chat Message */
    .stChatMessage[data-testid="stChatMessageAssistant"] {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-left: 5px solid #6366f1 !important;
    }
    
    /* Text font settings */
    .stChatMessage p, .stChatMessage li, .stChatMessage span, .stChatMessage div {
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        font-size: 1.05rem !important;
        line-height: 1.65 !important;
        color: #e2e8f0 !important;
    }
    
    /* Custom Streamlit Button Styling */
    div.stButton > button {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        color: #cbd5e1 !important;
        border-radius: 12px !important;
        padding: 0.6rem 1.2rem !important;
        font-weight: 500 !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        height: auto !important;
        min-height: 48px !important;
    }
    
    div.stButton > button:hover {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
        color: #ffffff !important;
        border-color: #6366f1 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.25), 0 4px 6px -2px rgba(99, 102, 241, 0.15) !important;
    }
    
    div.stButton > button:active {
        transform: translateY(0) !important;
    }
    
    /* Sidebar Clear button specifically */
    div[data-testid="stSidebar"] div.stButton > button {
        border: 1px solid rgba(239, 68, 68, 0.2) !important;
        min-height: 38px !important;
    }
    div[data-testid="stSidebar"] div.stButton > button:hover {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
        border-color: #ef4444 !important;
        box-shadow: 0 8px 15px -3px rgba(239, 68, 68, 0.25) !important;
    }
    
    /* Suggestion Container */
    .suggestion-title {
        color: #94a3b8 !important;
        font-size: 0.95rem !important;
        font-weight: 500 !important;
        margin-bottom: 0.75rem !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
    }
    
    /* Scrollbars */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
    }
    ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.18);
    }
    </style>
    """,
    unsafe_allow_html=True
)

# ---------------------------------------------------------------------------
# 4. API KEY & MODEL INPUTS (SIDEBAR)
# ---------------------------------------------------------------------------
with st.sidebar:
    st.markdown("""
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; margin-top: 0.5rem;">
            <span style="font-size: 1.8rem;">⚙️</span>
            <h2 style="margin: 0; font-size: 1.4rem; font-weight: 600; color: #f8fafc;">Setup Panel</h2>
        </div>
    """, unsafe_allow_html=True)
    
    api_key = st.text_input(
        "Google AI Studio API key",
        type="password",
        value=default_api_key,
        help="Get one at aistudio.google.com. Stored only for this session.",
    )
    
    selected_model = st.selectbox(
        "Gemini Model",
        options=[
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ],
        index=2, # Default to gemini-2.0-flash
        help="gemini-2.0-flash is high-speed and cost-effective. Stretches free credits furthest."
    )
    
    st.caption(
        "Your key is kept in memory for this session only — it is never "
        "written to disk or sent anywhere except directly to Google."
    )
    
    st.divider()
    
    # -----------------------------------------------------------------
    # CLEAR CHAT BUTTON — wipes the conversation history from state
    # -----------------------------------------------------------------
    if st.button("🗑️ Clear chat", use_container_width=True):
        st.session_state.messages = []
        st.session_state.suggested_prompt = None
        st.rerun()

# ---------------------------------------------------------------------------
# 5. CONVERSATION STATE INITIALIZATION
# ---------------------------------------------------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

if "suggested_prompt" not in st.session_state:
    st.session_state.suggested_prompt = None

# ---------------------------------------------------------------------------
# 6. HEADER & HERO BANNER
# ---------------------------------------------------------------------------
st.markdown("""
    <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(79, 70, 229, 0.04) 100%); 
                padding: 1.75rem; 
                border-radius: 20px; 
                border: 1px solid rgba(99, 102, 241, 0.18); 
                margin-bottom: 2rem;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;">
        <h1 style="margin: 0; color: #f8fafc; font-size: 2.2rem; font-weight: 700; letter-spacing: -0.02em;">
            🎓 Student Career Assistant
        </h1>
        <p style="margin: 0.6rem 0 0 0; color: #94a3b8; font-size: 1.05rem; font-weight: 400; line-height: 1.5;">
            Your AI-powered mentor for study strategies, resume building, and career guidance.
        </p>
    </div>
""", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# 7. RENDER EXISTING CONVERSATION HISTORY
# ---------------------------------------------------------------------------
for msg in st.session_state.messages:
    avatar_char = "👨‍🎓" if msg["role"] == "user" else "🎓"
    with st.chat_message(msg["role"], avatar=avatar_char):
        st.markdown(msg["content"])

# ---------------------------------------------------------------------------
# 8. RENDER SUGGESTION CHIPS (ONLY WHEN CHAT HISTORY IS EMPTY)
# ---------------------------------------------------------------------------
if not st.session_state.messages:
    st.markdown('<p class="suggestion-title">Get Started with a Topic:</p>', unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("📝 Resume Review\nTips to structure resumes", use_container_width=True):
            st.session_state.suggested_prompt = "How can I structure my resume for college internships, and what sections are most important?"
            st.rerun()
            
    with col2:
        if st.button("💡 Study Advice\nActive recall & habits", use_container_width=True):
            st.session_state.suggested_prompt = "What are the best study habits and active learning techniques to prepare for exams?"
            st.rerun()
            
    with col3:
        if st.button("🎯 Career Path\nPlanning your next steps", use_container_width=True):
            st.session_state.suggested_prompt = "How should a college sophomore start planning their career path and finding internships?"
            st.rerun()

# ---------------------------------------------------------------------------
# 9. CHAT INPUT & INTERACTIVE SUGGESTION LOGIC
# ---------------------------------------------------------------------------
user_input = st.chat_input("Type your question...")

# Override user_input if a suggestion button was clicked
if st.session_state.suggested_prompt:
    user_input = st.session_state.suggested_prompt
    st.session_state.suggested_prompt = None

if user_input is not None:
    user_input = user_input.strip()

    # --- Handle empty input gracefully -------------------------------
    if not user_input:
        st.warning("Please enter a question before sending.")
        st.stop()

    # --- Handle missing API key gracefully ----------------------------
    if not api_key:
        st.info("💡 To start the conversation, please enter your Google AI Studio API key in the sidebar first.")
        st.stop()

    # Add the user's message to history and display it immediately
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user", avatar="👨‍🎓"):
        st.markdown(user_input)

    # -----------------------------------------------------------------
    # 10. CALL THE GOOGLE GEMINI API WITH GRACEFUL ERROR HANDLING
    # -----------------------------------------------------------------
    with st.chat_message("assistant", avatar="🎓"):
        placeholder = st.empty()
        placeholder.markdown("Thinking...")

        try:
            client = genai.Client(api_key=api_key)

            # Map the message history to the format Gemini expects
            gemini_messages = []
            for msg in st.session_state.messages:
                role = "user" if msg["role"] == "user" else "model"
                gemini_messages.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=msg["content"])]
                    )
                )

            # Define generating configuration with system instruction
            config = types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=1000,
            )

            # Stream the generated content from the Gemini model
            response_stream = client.models.generate_content_stream(
                model=selected_model,
                contents=gemini_messages,
                config=config
            )

            # Custom generator for Streamlit's write_stream to enable typing effect
            def stream_chunks():
                for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text

            reply_text = placeholder.write_stream(stream_chunks())
            st.session_state.messages.append(
                {"role": "assistant", "content": reply_text}
            )

        except APIError as e:
            placeholder.error(
                f"Gemini API error occurred: {e.message} (Status Code: {e.code})"
            )
            st.session_state.messages.pop()  # remove the unanswered user turn

        except Exception as e:
            placeholder.error(f"Unexpected error: {e}")
            st.session_state.messages.pop()
