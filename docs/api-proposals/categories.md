# API Proposal: Categories (FEAT-10 / SPEC-09)

Backend :5063 verificado 2026-10-04: `GET /api/categories` → 404.
Frontend React avanza con mock local (localStorage) sin romper v1.

## Propuesta OpenAPI (añadir sin romper v1)

```
Category { id: number PK, userId: FK Users, name: varchar(100),
  type: smallint (1=Ingreso,2=Gasto), color: varchar(32),
  icon: varchar(64), isActive: bool, + AuditableEntity }
Índice único: (UserId, lower(Name), Type)
```

- `GET /api/categories?type=&search=` → 200 `CategoryDto[]` (scope userId)
- `GET /api/categories/{id}` → 200 | 404
- `POST /api/categories` → 201 CreatedAtAction | 400 duplicada
- `PUT /api/categories/{id}` → 200 | 400 | 404
- `DELETE /api/categories/{id}` → 204 | 404 | 409 `{code:"CATEGORY_IN_USE"}`
- Seguir plantilla `Merchants/Commads/*` (nótese typo existente "Commads")
  + `CategoryConfiguration.cs` + `DbSet<Category>` + migration `AddCategories`
- Auth: `AuthenticationBehavior` + `CurrentUserService`, todo filtra por UserId

## Reglas (copian SPEC-09)
1. Duplicado (user, lower(trim(name)), type) ≠ mismo Id → 400 "Ya existe…"
2. Icon debe empezar `mdi-|ri-|bx-|la-`; color hex o `var(--fp-*)`, default `var(--fp-primary)`
3. DELETE con uso (Transaction/Merchant/Budget/Goal) → 409, frontend ofrece Desactivar (PUT isActive=false)
4. `Merchant.Category` string se conserva en v1; UI React usa select con fallback "legado"

## Mock web actual
`packages/core/src/categories.ts`: localStorage `fa_categories` seed
(Comida/Gasto, Sueldo/Ingreso, Transporte/Gasto). Misma firma que el futuro fetch real:
`listCategories(), createCategory(), updateCategory(), removeCategory(), deactivateCategory()`.
Al existir el endpoint, basta reimplementar esas 5 fns con `apiGet/apiPost/...` sin tocar UI.

## Estado 2026-10-07
IMPLEMENTADO: CategoriesController + migración AddCategories aplicada en finanzas_db. Frontend usa API real.
