# API Proposal: Dashboard Summary (FEAT-09)

Backend :5063 verificado 2026-10-04: `GET /api/dashboard/summary` → 404.
Web React usa agregado provisional con badge (ver DashboardPage).
Propuesta sin romper v1 (solo ADD-ON):

## Endpoint propuesto
- `GET /api/dashboard/summary?month=&year=` → 200 (scope JWT userId)

```json
{
  "month": 10, "year": 2026,
  "totalBalance": "1250.00",
  "savings": "1000.00",
  "accounts": "500.00",
  "cardDebt": "250.00",
  "income": "2000.00",
  "expenses": "750.00",
  "overBudgets": 1,
  "isProvisional": false
}
```

## Agregación (reutiliza queries existentes, no nueva lógica de dominio)
- `savings` = `GET /api/savings/balance`
- `cardDebt` = `GET /api/CreditCards/summary` (CurrentBalance total)
- `income/expenses` = `GET /api/transactions/cash/by-date?from=&to=` + `GET /api/savings/history`
- `totalBalance = savings + accounts - cardDebt` (misma fórmula que hoy calculan
  `pages/dashboards/dashboard/dashboard.facade.ts` y `DashboardPage.tsx`)
- Todo `decimal(18,2)`, todo filtrado por `CurrentUserService.UserId`

## Archivos a crear (plantilla Merchants/Categories)
`Application/Features/Dashboard/Queries/GetDashboardSummaryQuery(.cs+Handler+Validator)`,
`Application/DTOs/DashboardSummaryDto.cs`, `WebApi/Controllers/DashboardController.cs`.
Sin migration (solo lectura agregada). Cache memoria 30s por (user,month,year).

## Pendientes relacionados (no MVP)
- `PUT/DELETE /api/Merchants/{id}` → 404 hoy (controller tiene TODO). Propuesta en FEAT-15.
- `GET /api/reports/export?format=csv` → hoy solo export CSV cliente (DashboardPage).

## Estado 2026-10-07
IMPLEMENTADO: DashboardController GET /api/dashboard/summary (orquesta savings+cards+investments). Frontend usa API real.
