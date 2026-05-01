# QuizLock 🔒

QuizLock is a Chrome extension designed to boost productivity by blocking distracting websites. To regain access, you must pass an AI-generated quiz tailored to your field of study or exam preparation.

## 🚀 Features
- **Smart Blocking**: Intercepts access to a user-defined list of distracting sites.
- **AI-Powered Quizzes**: Generates challenging questions (MCQs or Open-ended) via Groq API (LLama 3.3).
- **Customized Learning**: Tailors questions based on your field, class, and the specific exam you're preparing for.
- **Discipline Engine**: 10-minute unlock window after passing; 5-minute cooldown after failing.
- **Premium UI**: Beautiful stationary-inspired notebook theme with glassmorphism and LaTeX support for math/science.

---

## 🛠️ Setup Instructions

### 1. Backend Setup (FastAPI)
1. Navigate to the `server` directory.
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   - Copy `.env.example` to `.env`.
   - Add your `DATABASE_URL` (PostgreSQL), `GROQ_API_KEY`, and optional LangSmith keys.
5. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### 2. Frontend Setup (Angular)
1. Navigate to the `client` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
   The build output will be in `client/dist/client-app`.

### 3. Install Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `client/dist/client-app` folder.

---

## 📖 Usage
1. Click the **QuizLock** icon in your toolbar.
2. Go to **Options** to configure your profile (Field, Class, Exam, etc.) and add blocked sites.
3. Try visiting a blocked site (e.g., `youtube.com`).
4. Pass the quiz to unlock the site!

## 🧪 Technologies
- **Frontend**: Angular 19, SCSS, KaTeX (Math rendering).
- **Backend**: FastAPI, SQLAlchemy, LangChain, Groq API.
- **Database**: PostgreSQL.
