# TaxOptimus 🇮🇪

TaxOptimus is a comprehensive Irish tax optimization and financial analysis platform. It helps PAYE and self-employed individuals maximize their take-home pay by leveraging AI-driven insights, document analysis, and mathematical optimization of tax reliefs.

## 🚀 Key Features

- **Tax Strategy Optimizer**: Uses SciPy to find the optimal allocation for pension contributions, EIIS investments, and more.
- **Financial Document Analysis**: Upload bank statements or receipts (PDF/Image) for automatic categorization and tax relief identification using Groq Llama 3.
- **Interactive AI Assistant**: A specialized chatbot trained on Irish Revenue regulations to answer complex tax queries.
- **Dynamic Tax Calculator**: Real-time calculation of Income Tax, USC, and PRSI based on 2026 tax bands.
- **Wealth Dashboard**: Track your tax profiles, uploaded documents, and optimization history.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15+, React 19, TypeScript, Tailwind CSS.
- **Backend**: Python 3.10+, FastAPI, SciPy (Optimization), Groq SDK.
- **Database/Auth**: Supabase (PostgreSQL + Auth).
- **PDF Processing**: MuPDF / PyPDFium2.

---

## 🏃 Getting Started

### 1. Prerequisites

- **Node.js** (v18+)
- **Python** (v3.10+)
- **Supabase Account** (for database and authentication)
- **Groq API Key** (for AI analysis and chatbot)

### 2. Environment Setup

#### Frontend (.env.local)
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Backend (.env)
Create a `.env` file in `taxoptimus-backend/`:
```env
GROQ_API_KEY=your_groq_api_key
```

### 3. Installation & Running

#### Frontend
```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```
The frontend will be available at [http://localhost:3000](http://localhost:3000).

#### Backend
```bash
cd taxoptimus-backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python app/main.py
```
The backend will be available at [http://localhost:8000](http://localhost:8000).

### 4. Database Setup
Run the SQL scripts in the `supabase/` folder in your Supabase SQL Editor to set up the necessary tables and functions. Start with `schema.sql`.

---

## 📂 Project Structure

- `app/`: Next.js App Router (Pages & API routes)
- `components/`: Reusable React components
- `lib/`: Utility functions (Supabase client, types, tax links)
- `taxoptimus-backend/`: Python FastAPI service
  - `app/engine.py`: Core tax calculation logic
  - `app/main.py`: API endpoints & Optimization orchestration
  - `app/analyzer.py`: Document analysis logic
  - `app/chatbot.py`: AI Assistant logic
- `supabase/`: SQL migration and schema scripts

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License
This project is licensed under the MIT License.
