
## About the Project

InVora is a FORWARD: AI in Business 2026 Hackathon submission that turns manual, paper-based invoice management into an AI-assisted workflow. Many trade and wholesale businesses still track credit using colour-coded invoice paper and a mental checklist of who has paid, who is overdue, and who still qualifies for credit. InVora scans an invoice, classifies it using the business's own rules, keeps every invoice tied to a customer's record over time, and puts an AI assistant on top that can answer questions like "who has the highest credit risk?" directly from live data, citing the specific invoices behind every answer.

## Live demo: 
[hackathon-silk-zeta.vercel.app](https://hackathon-silk-zeta.vercel.app/)

## Tech Stack
* Frontend:
  Next.js, React, TypeScript, Tailwind CSS
* Auth & Database: Supabase (with Row Level Security)
* AI agent: Groq
* PDF parsing: pdfjs-dist
* Deployment: Vercel

## Getting Started
1. Prerequisites:
- Node.js
- A Supabase project
- A Groq API key

2. Clone the repo
   ```bash
   git clone https://github.com/StevenArya/hackathon.git
   cd hackathon
   ```
3. Configure environment variables

    Create a .env.local file in the project root:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
    GROQ_API_KEY=
    ```
    The first two come from your Supabase project's API settings. GROQ_API_KEY comes from your Groq account and is required for the AI credit assistant to work.

4. Install and run
    ```bash
      npm i
      npm run dev
    ```
    The app will be available at http://localhost:3000.

## Demo


You can try InVora right now on the live deployment without setting anything up locally
using: [hackathon-silk-zeta.vercel.app](https://hackathon-silk-zeta.vercel.app/)

Two guest accounts are seeded with sample data so you can see both sides of the product. These are demo accounts only, seeded with sample invoices and customers, not real business or customer data.

## Business / admin side Log in with:

* Email: admin01@gmail.com
* Password: admin1

This account lands on the admin dashboard, where you can view the receivables overview, add and manage customers and invoices, scan a new invoice, verify a customer's payment proof, and chat with the AI credit assistant.

## Client side Log in with:

* Email: antonius@gmail.com
* Password: antonius1

This account shows the product from a customer's point of view, including their own invoices and credit status and the ability to submit proof of payment.
