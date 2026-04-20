# Taha Traders POS — Backend

REST API backend for the **Taha Traders POS System**. Handles authentication, product management, sales processing, inventory, financial reporting, and customer management.

🔗 **Frontend Repo:** [tahatraders](https://github.com/ft-umer/tahatraders)

---

## Features

- **JWT Authentication** — Secure login with token-based session management
- **Role-Based Access Control** — Admin and Staff permission levels enforced at the API level
- **Product & Inventory Management** — CRUD for products, categories, and stock levels
- **Sales Processing** — Create, retrieve, and manage sales transactions
- **Sales Returns** — Process returns with automatic inventory adjustment
- **Expense Tracking** — Record and categorize business expenses
- **Financial Reports** — Aggregated sales data, profit/loss summaries
- **Customer Management** — Store customer records and link purchase history

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Auth:** JWT (JSON Web Tokens)
- **Deployment:** Vercel

---

## Project Structure

```
├── config/          # Database connection and environment setup
├── controllers/     # Business logic for each resource
├── middleware/      # JWT auth and role-based access middleware
├── models/          # Mongoose schemas
│   ├── User
│   ├── Product
│   ├── Category
│   ├── Sale
│   ├── Expense
│   └── Customer
├── routes/          # API route definitions
└── server.js        # App entry point
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repo
git clone https://github.com/ft-umer/tahatradersbackend.git
cd tahatradersbackend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, PORT

# Start development server
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/products` | Get all products |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |
| GET | `/api/categories` | Get all categories |
| POST | `/api/sales` | Create a new sale |
| GET | `/api/sales` | Get sales history |
| POST | `/api/sales/return` | Process a sales return |
| GET | `/api/expenses` | Get expenses |
| POST | `/api/expenses` | Record an expense |
| GET | `/api/customers` | Get customer list |
| POST | `/api/customers` | Add a customer |
| GET | `/api/reports/summary` | Financial summary report |

---

## Security

- All protected routes require a valid JWT in the `Authorization` header
- Role-based middleware restricts admin-only operations from staff users
- PIN verification logic for sensitive financial operations

---

## Related

- 🖥️ Frontend (React/TypeScript): [tahatraders](https://github.com/ft-umer/tahatraders)

---

## Author

**Syed Umer Mujahid Hassni**  
[LinkedIn](https://www.linkedin.com/in/syedumer-dev) · [Portfolio](https://umermujahidhassniportfolio.vercel.app/)
