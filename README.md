# Full-Stack Cloud & Analytics Platform

A portfolio-scale operations dashboard built with React, TypeScript, Node.js/Express, PostgreSQL, Docker, and an optional AWS S3 export integration. The application demonstrates an end-to-end feature path: persisted operational data, versioned API-style endpoints, aggregate metrics, and a dashboard for orders and inventory.

## Features

- Responsive React + TypeScript dashboard with summary metrics, recent orders, inventory levels, and low-stock indicators.
- Express REST API for dashboard metrics, order creation/status updates, and inventory listing.
- PostgreSQL schema, indexes, and sample operational data.
- Validated request payloads and parameterized SQL queries.
- Optional AWS S3 integration to write a JSON snapshot of dashboard metrics; Terraform configuration provisions a private encrypted bucket.
- Docker Compose local environment and GitHub Actions build/test workflow.

## Architecture

```text
React + TypeScript (Vite)
       | /api/* proxy
       v
Node.js + Express REST API
       |
       v
PostgreSQL ---- AWS S3 (optional report export)
```

## Run locally with Docker

Requirements: Docker Desktop with Compose.

```bash
docker compose up --build
```

Open the dashboard at `http://localhost:5173` and API health at `http://localhost:4000/api/health`. PostgreSQL is exposed on host port 5434 for local tools; the API uses the internal Compose network. The database container initializes from `db/init.sql`.

To run without Docker, start PostgreSQL with the schema in `db/init.sql`, then run:

```bash
npm install
DATABASE_URL="postgres://analytics:analytics_dev@localhost:5434/operations" npm run dev:api
npm run dev:web
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Database readiness |
| GET | `/api/metrics/summary` | Aggregate orders, revenue, and low-stock counts |
| GET | `/api/orders?limit=20` | List recent orders |
| POST | `/api/orders` | Create an order |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET | `/api/inventory` | List inventory and reorder thresholds |
| POST | `/api/exports/metrics` | Write metrics JSON snapshot to configured S3 bucket |

Example order:
```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Example Customer","totalAmount":125.50}'
``

## AWS S3 export

Set `AWS_REGION` and `AWS_S3_BUCKET` for the API and configure AWS credentials using the standard AWS SDK credential chain (for example, an EC2 instance profile). Then call `POST /api/exports/metrics`. The API stores a JSON snapshot under `metrics/` in the private bucket.

The Terraform files under `infra/aws` provision a private S3 bucket with server-side encryption and public access blocked. Review the plan and use your own AWS account before applying. No cloud resources are created by CI or by the local Docker setup. No EC2 deployment is included in this repository.

## Tests and build

```bash
npm install
npm test
npm run build
```

The API unit tests cover numeric normalization for PostgreSQL aggregate results. The CI workflow installs dependencies, runs tests, and builds both API and web packages.

## Security and scope

SQL values are parameterized and API inputs are validated. This is a learning/portfolio application, not a production-ready order management system. It does not include user authentication, role-based access, audit trails, pagination cursors, payment processing, or a deployed cloud environment. Compose credentials are local development credentials only.

## Repository structure

```text
apps/api/       Express + TypeScript API, PostgreSQL access, S3 export
apps/web/       React + TypeScript dashboard
db/             PostgreSQL schema and sample records
infra/aws/      Terraform S3 bucket configuration
.github/        CI workflow
```
