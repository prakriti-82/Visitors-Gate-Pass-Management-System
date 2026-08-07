# Visitor's Gate Pass Management System

A responsive web app for managing visitor and vendor entry, gate-pass generation, email notifications, reporting, and secure data storage — built with a React-style frontend/vanilla JS UI and an Express + MongoDB backend.

🔗 **Live App:** [visitors-gate-pass-management-system-1.onrender.com](https://visitors-gate-pass-management-system-1.onrender.com/)

---

## Features

- Visitor & vendor registration with Aadhaar-based lookup
- Live photo capture via webcam
- Auto-generated gate pass numbers with secure entry tokens
- Email notifications on gate pass creation (with building-based routing, e.g. Plant → HSE team)
- Visit history lookup per visitor/vendor
- Reopen today's gate pass
- Filter records by date or month
- Print-ready gate pass view

---

## Tech Stack

**Frontend:** HTML, CSS, JavaScript

**Backend:** Node.js, Express.js

**Database:** MongoDB (Mongoose ODM)

**Other:** Nodemailer (email alerts), CORS, dotenv

> **Note:** This project was originally built on MySQL during development. It has since been migrated to MongoDB Atlas for production deployment on Render, since Render does not offer a free managed MySQL tier.

---

## Project Structure

```
backend/
├── server.js              # App entry point
├── db.js                  # MongoDB connection (Mongoose)
├── mail.js                # Email sending logic
├── models/
│   ├── Visitor.js         # Visitor schema (with embedded visit history)
│   └── Vendor.js           # Vendor schema (with embedded entry history)
├── routes/
│   └── visitors.js         # All visitor/vendor API routes
└── package.json
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/visitors/filter` | Filter visitors & vendors by date or month |
| GET | `/api/visitors/history/:aadhar` | Get a visitor's visit history |
| GET | `/api/visitors/vendor-history/:aadhar` | Get a vendor's entry history |
| GET | `/api/visitors/reopen/:type/:aadhar/:gatePassNo` | Reopen an existing gate pass |
| POST | `/api/visitors/add` | Register a new visit/entry and generate a gate pass |
| POST | `/api/visitors/sendGatePass` | Resend a gate pass email |

---

## Environment Variables

Create a `.env` file inside `backend/` with:

```dotenv
PORT=3000
BASE_URL=http://localhost:3000

MONGO_URI=your_mongodb_atlas_connection_string

EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password
```

> `.env` is git-ignored — never commit real credentials. Set the same variables in your hosting provider's dashboard (e.g. Render → Environment) for production.

---

## Getting Started (Local Development)

```bash
# Install dependencies
cd backend
npm install

# Run the server
node server.js
# or, with auto-restart on file changes:
npx nodemon server.js
```

The API will be available at `http://localhost:3000`.

---

## Deployment

This project is deployed on **Render**, with the database hosted on **MongoDB Atlas** (free M0 tier). On push to `main`, Render auto-deploys the latest backend changes.

---

## License

This project was built as part of an internship/academic project and is intended for educational and demonstrative purposes.