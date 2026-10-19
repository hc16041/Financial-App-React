# API Proposal: Centries / Seguridad (PROJECT-SPEC Módulo 8, Fase 3)

Backend :5063 verificado 2026-10-18: **no existen** controladores de
Usuario / Perfil / Cargo / Bitácora / Permisos. `Controllers/` solo trae las
financieras (Api, Auth, Categories, CreditCards, Dashboard, Factura,
Investments, Merchants, Payments, Platforms, Reports, Savings, Transactions,
WithdrawalMethods). Las pantallas Angular legacy (`formularios/centries/`) llaman
a endpoints `Usuario/*` inexistentes.

El frontend React avanza con **mocks locales** (localStorage), sin tocar v1,
igual que categories antes de su API.

## Mock web actual
`packages/core/src/centries.ts`: config por `CentryKind` (`usuario`, `inactivos`,
`perfil`, `cargo`, `permiso`, `bitacora`), seeds y CRUD sobre `loadJSON/saveJSON`
(clave `fa_centry_<base>`; `inactivos` comparte almacén con `usuario`).
Firma estable → al existir la API basta reimplementar
`listCentries/createCentry/updateCentry/deleteCentry/toggleCentry` con
`apiGet/apiPost/apiPut/apiDel` sin tocar la UI (`CentriesPage.tsx`, config-driven,
sirve las 6 pantallas).

## Propuesta OpenAPI (añadir sin romper v1)

```
Usuario  { id, usuario unique, nombre, cargoId FK Cargo, perfilId FK Perfil, activo bool, + AuditableEntity }
Perfil   { id, nombre unique, descripcion, activo bool }
Cargo    { id, nombre unique, activo bool }
PermisoPerfil { id, perfilId FK Perfil, modulo varchar(64), ver/crear/editar/eliminar bool }
Bitacora { id, fecha, usuarioId FK Usuario, accion, detalle }  -- append-only
```

- `GET    /api/centries/usuarios?activo=` → 200 `UsuarioDto[]` (activo=false ⇒ inactivos)
- `POST   /api/centries/usuarios` → 201 | 400 (usuario duplicado)
- `PUT    /api/centries/usuarios/{id}` → 200 | 404  (activo=false ⇒ desactivar)
- `DELETE /api/centries/usuarios/{id}` → 204 | 404
- `GET/POST/PUT/DELETE /api/centries/perfiles`, `/cargos`, `/permisos` (mismo patrón)
- `GET    /api/centries/bitacora?usuario=&accion=` → 200 `BitacoraDto[]` (solo lectura)
- Seguir plantilla `Merchants/Commads/*` + `*Configuration.cs` + `DbSet<>` +
  migration `AddCentries`. Auth: `AuthenticationBehavior` + `CurrentUserService`.
- `Bitacora` se escribe por behavior transversal (no por endpoint de escritura).

## Pendiente
- Rol oficial (`roloficial`) del Angular legacy no se portó (sin equivalente claro).

## Estado 2026-10-18
IMPLEMENTADO (mock): `packages/core/src/centries.ts` + `apps/web/src/features/centries/CentriesPage.tsx`
+ 6 rutas `/centries/*` + sección "Seguridad" + test `centries.test.ts`.
