#!/usr/bin/env node
/**
 * Creates MVP Framework v1 milestone, labels, and 16 GitHub issues.
 * Requires: gh CLI authenticated (`gh auth login`)
 * Usage: node scripts/create-mvp-github-issues.mjs
 */
import { execSync, spawnSync } from 'node:child_process';

const REPO = 'fpresti/saas-foundation';
const MILESTONE = 'MVP Framework v1';

function gh(args, input) {
  const result = spawnSync('gh', args, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(
      `gh ${args.join(' ')}\n${result.stderr || result.stdout || 'unknown error'}`
    );
  }
  return (result.stdout || '').trim();
}

function ghJson(args) {
  return JSON.parse(gh([...args, '--json', 'id,number,title,url']));
}

function ensureAuth() {
  try {
    gh(['auth', 'status']);
  } catch {
    console.error('GitHub CLI not authenticated. Run: gh auth login');
    process.exit(1);
  }
}

function ensureLabels() {
  const labels = [
    { name: 'type:chore', color: 'C5DEF5', description: 'Infra, docs, tooling' },
    { name: 'type:feature', color: '0E8A16', description: 'New functionality' },
    { name: 'type:bug', color: 'D73A4A', description: 'Bug fix' },
    { name: 'type:refactor', color: 'FBCA04', description: 'Refactor without behavior change' },
    { name: 'priority:critical', color: 'B60205', description: 'Blocks MVP demo' },
    { name: 'priority:high', color: 'E99695', description: 'Important for MVP' },
    { name: 'priority:medium', color: 'FEF2C0', description: 'Polish / closure' },
  ];
  for (const l of labels) {
    try {
      gh([
        'label',
        'create',
        l.name,
        '--repo',
        REPO,
        '-c',
        l.color,
        '-d',
        l.description,
        '-f',
      ]);
      console.log(`label: ${l.name}`);
    } catch (e) {
      console.warn(`label ${l.name}:`, e.message);
    }
  }
}

function ensureMilestone() {
  const existing = JSON.parse(
    gh(['api', `repos/${REPO}/milestones`, '--paginate'])
  );
  const found = existing.find((m) => m.title === MILESTONE);
  if (found) {
    console.log(`milestone exists: #${found.number} ${found.title}`);
    return found.number;
  }
  const created = JSON.parse(
    gh([
      'api',
      '-X',
      'POST',
      `repos/${REPO}/milestones`,
      '-f',
      `title=${MILESTONE}`,
      '-f',
      'description=Entregable MVP Framework v1',
    ])
  );
  console.log(`milestone created: #${created.number}`);
  return created.number;
}

const issues = [
  {
    title: 'T01 — Sincronizar repo con Supabase',
    labels: ['type:chore', 'priority:critical'],
    body: `## Tema
Alinear migraciones y tipos entre el repositorio y el proyecto Supabase remoto.

## Objetivo
Evitar drift entre \`supabase/migrations/\` y la base de datos aplicada (incluye \`seed_members_permissions\`).

## Criterios de aceptación
- [ ] Migración \`20250315000000_seed_members_permissions\` presente en el repo
- [ ] \`list_migrations\` remoto coincide con archivos locales
- [ ] \`npm run supabase:types\` genera tipos sin sorpresas

## Plan de pruebas (agente)
\`\`\`bash
npm run supabase:types
# MCP Supabase: list_migrations
\`\`\`

## Plan de pruebas (manual)
- Revisar en Supabase Dashboard que permisos sembrados coinciden con \`src/types/supabase.ts\`

## Fuera de alcance
- Cambios de esquema nuevos
`,
  },
  {
    title: 'T02 — Entorno de test reproducible',
    labels: ['type:chore', 'priority:critical'],
    body: `## Tema
Credenciales y usuarios de prueba para smoke scripts.

## Objetivo
Permitir que el agente ejecute verifies contra Supabase dev sin intervención manual.

## Criterios de aceptación
- [ ] \`.env.test.local.example\` documentado (gitignored el real)
- [ ] Usuarios dev: owner + invitee
- [ ] \`npm run verify:setup\` hace login de ambos usuarios

## Plan de pruebas (agente)
\`\`\`bash
npm run verify:setup
\`\`\`

## Plan de pruebas (manual)
- Confirmar usuarios creados en Supabase Auth dashboard

## Fuera de alcance
- Datos de producción
`,
  },
  {
    title: 'T03 — Build y arranque verdes',
    labels: ['type:chore', 'priority:critical'],
    body: `## Tema
Confirmar que Genesis compila, testea y arranca.

## Objetivo
Baseline estable antes de features.

## Criterios de aceptación
- [ ] \`npm run build\` OK
- [ ] \`npm test\` OK (o tests obsoletos actualizados en T09)
- [ ] README con pasos mínimos: install, env, serve

## Plan de pruebas (agente)
\`\`\`bash
npm run build
npm test
\`\`\`

## Plan de pruebas (manual)
- [ ] \`npm start\` y login en localhost:4200

## Fuera de alcance
- CI completa (T16)
`,
  },
  {
    title: 'T04 — Onboarding tenant E2E',
    labels: ['type:feature', 'priority:critical'],
    body: `## Tema
Flujo signup → crear tenant → contexto activo.

## Objetivo
Un usuario nuevo puede crear su organización y entrar al shell.

## Criterios de aceptación
- [ ] Tras \`create_tenant_with_owner\`, \`get_access_context\` devuelve tenant
- [ ] Usuario aparece en \`tenant_members\` como owner
- [ ] Redirect a home tras onboarding

## Plan de pruebas (agente)
\`\`\`bash
npm run verify:tenant-onboarding
\`\`\`

## Plan de pruebas (manual)
- [ ] Flujo completo en navegador con usuario nuevo

## Fuera de alcance
- Múltiples planes / billing
`,
  },
  {
    title: 'T05 — Corregir permisos en Members',
    labels: ['type:bug', 'priority:critical'],
    body: `## Tema
Alinear código de permiso "Manage" con la base de datos.

## Objetivo
El botón Manage debe usar \`tenant.roles.assign\` (existe en DB), no \`tenant.members.manage\`.

## Criterios de aceptación
- [ ] \`members.permissions.ts\` usa el código correcto
- [ ] Usuario con \`tenant.roles.assign\` ve Manage habilitado
- [ ] Sin permiso → botón deshabilitado

## Plan de pruebas (agente)
\`\`\`bash
npm run verify:members-permissions
\`\`\`

## Archivos probables
- \`src/app/features/members/members.permissions.ts\`

## Fuera de alcance
- Nuevo modelo de permisos
`,
  },
  {
    title: 'T06 — Terminar invitaciones',
    labels: ['type:feature', 'priority:critical'],
    body: `## Tema
Completar flujo invite → accept (frontend + RPC).

## Objetivo
Un invitado puede unirse al tenant con el token de invitación.

## Criterios de aceptación
- [ ] Ruta \`/accept-invitation?token=...\`
- [ ] Feature con store/service (AI_PLAYBOOK)
- [ ] Token válido → fila en \`tenant_members\`, invitación aceptada
- [ ] Token inválido/expirado → error claro
- [ ] Si no hay sesión → redirect a login y retomar

## Plan de pruebas (agente)
\`\`\`bash
npm run verify:invitations
\`\`\`

## Plan de pruebas (manual)
- [ ] Copiar token desde /members y abrir link de aceptación

## Fuera de alcance
- Email transaccional
`,
  },
  {
    title: 'T07 — Members: invitaciones pendientes',
    labels: ['type:feature', 'priority:high'],
    body: `## Tema
Listar invitaciones no aceptadas en /members.

## Objetivo
El owner ve invitaciones pending con email, tipo y expiración.

## Criterios de aceptación
- [ ] Sección o tabla de invitaciones pending
- [ ] Solo visible con permiso adecuado
- [ ] Datos desde \`invitations\` (RLS)

## Plan de pruebas (agente)
\`\`\`bash
npm run verify:invitations
\`\`\`

## Plan de pruebas (manual)
- [ ] UI muestra invitación tras crear una en T06

## Fuera de alcance
- Revocar / reenviar invitación
`,
  },
  {
    title: 'T08 — Refactor Members → Store',
    labels: ['type:refactor', 'priority:high'],
    body: `## Tema
Cumplir Feature Architecture Contract en Members.

## Objetivo
Componente solo consume store; service solo desde store.

## Criterios de aceptación
- [ ] \`members.store.ts\` con signals, isLoading, error, load()
- [ ] \`MembersComponent\` sin llamadas directas a service/permission
- [ ] Build pasa

## Plan de pruebas (agente)
\`\`\`bash
npm run build
npm test
npm run verify:members-permissions
\`\`\`

## Fuera de alcance
- Nuevas features en Members
`,
  },
  {
    title: 'T09 — Tests unitarios mínimos',
    labels: ['type:chore', 'priority:high'],
    body: `## Tema
Cobertura mínima automatizada del core.

## Objetivo
Regresión básica en auth, permisos y members store.

## Criterios de aceptación
- [ ] Tests SessionStore / PermissionService / members.store
- [ ] \`app.spec.ts\` alineado con app actual
- [ ] \`npm test\` verde

## Plan de pruebas (agente)
\`\`\`bash
npm test
\`\`\`

## Fuera de alcance
- E2E Playwright
`,
  },
  {
    title: 'T10 — Limpiar deuda menor',
    labels: ['type:chore', 'priority:high'],
    body: `## Tema
Eliminar código debug y restos de scaffold.

## Objetivo
Repo limpio para MVP.

## Criterios de aceptación
- [ ] Sin \`alert('test')\` en tenant-select
- [ ] Sin placeholders rotos en tests
- [ ] Build + test verdes

## Plan de pruebas (agente)
\`\`\`bash
npm run build
npm test
\`\`\`
`,
  },
  {
    title: 'T11 — Home con datos reales',
    labels: ['type:feature', 'priority:high'],
    body: `## Tema
Sustituir demo de 50 filas ficticias por dashboard mínimo.

## Objetivo
Home muestra contexto real del tenant activo.

## Criterios de aceptación
- [ ] Nombre/status tenant activo
- [ ] Nº miembros (lectura)
- [ ] Plan/subscription si disponible por RLS

## Plan de pruebas (agente)
\`\`\`bash
npm run build
npm run verify:tenant-onboarding
\`\`\`

## Plan de pruebas (manual)
- [ ] Home refleja tenant tras onboarding
`,
  },
  {
    title: 'T12 — Roles — lectura',
    labels: ['type:feature', 'priority:high'],
    body: `## Tema
Implementar /roles (sustituir placeholder).

## Objetivo
Listar roles del tenant y permisos asociados.

## Criterios de aceptación
- [ ] Feature lazy-loaded con guard \`tenant.roles.read\`
- [ ] Lista roles sistema + custom
- [ ] Muestra permisos por rol (lectura)

## Plan de pruebas (agente)
\`\`\`bash
npm run verify:roles-read
\`\`\`

## Fuera de alcance
- CRUD de roles custom
`,
  },
  {
    title: 'T13 — Settings — perfil de tenant',
    labels: ['type:feature', 'priority:medium'],
    body: `## Tema
Primera pantalla útil en /settings.

## Objetivo
Owner ve y edita datos básicos del tenant.

## Criterios de aceptación
- [ ] Lee nombre, slug, status del tenant activo
- [ ] Edición persiste (RPC o RLS según backend)
- [ ] Guard \`tenant.settings.read\` / update

## Plan de pruebas (agente)
\`\`\`bash
npm run verify:tenant-settings
\`\`\`

## Plan de pruebas (manual)
- [ ] Cambio visible tras guardar
`,
  },
  {
    title: 'T14 — Navegación por permisos',
    labels: ['type:feature', 'priority:medium'],
    body: `## Tema
Ocultar items de nav sin permiso (cosmético).

## Objetivo
UX coherente con permisos del usuario.

## Criterios de aceptación
- [ ] Members/Roles/Settings ocultos sin permiso read
- [ ] Settings habilitado en nav cuando T13 listo
- [ ] Switch tenant solo super_admin multi-tenant (ya parcial)

## Plan de pruebas (agente)
\`\`\`bash
npm run build
\`\`\`

## Plan de pruebas (manual)
- [ ] Nav con usuario member vs owner
`,
  },
  {
    title: 'T15 — Seguridad DB pre-MVP',
    labels: ['type:chore', 'priority:medium'],
    body: `## Tema
Cerrar hallazgos críticos del Supabase advisor.

## Objetivo
Base lista para demo seria.

## Criterios de aceptación
- [ ] RLS en \`super_admins\` (o tabla eliminada de API)
- [ ] Tabla \`test\` eliminada o protegida
- [ ] REVOKE EXECUTE en RPCs sensibles para \`anon\` donde aplique
- [ ] Revisar política \`tenants_insert\` permisiva

## Plan de pruebas (agente)
\`\`\`bash
# MCP Supabase: get_advisors security
# SQL: verificar rls_enabled en tablas public
\`\`\`

## Fuera de alcance
- Auditoría completa de todas las políticas
`,
  },
  {
    title: 'T16 — CI verify + merge a master',
    labels: ['type:chore', 'priority:medium'],
    body: `## Tema
Automatizar verifies en PR y alinear rama principal.

## Objetivo
CI corre build + test + verify:all; Genesis mergeada en master.

## Criterios de aceptación
- [ ] GitHub Action en PRs a Genesis/master
- [ ] \`verify:all\` en CI (con secrets de test)
- [ ] PR Genesis → master mergeado
- [ ] Todos los issues T01–T15 cerrados

## Plan de pruebas (agente)
\`\`\`bash
npm run verify:all
# CI green en PR
\`\`\`
`,
  },
];

function issueExists(title) {
  try {
    const out = gh([
      'issue',
      'list',
      '--repo',
      REPO,
      '--search',
      `in:title "${title}"`,
      '--json',
      'title',
      '--limit',
      '5',
    ]);
    const list = JSON.parse(out);
    return list.some((i) => i.title === title);
  } catch {
    return false;
  }
}

function createIssues(milestoneTitle) {
  const created = [];
  for (const issue of issues) {
    if (issueExists(issue.title)) {
      console.log(`skip (exists): ${issue.title}`);
      continue;
    }
    const url = gh([
      'issue',
      'create',
      '--repo',
      REPO,
      '--title',
      issue.title,
      '--body',
      issue.body,
      '--milestone',
      milestoneTitle,
      ...issue.labels.flatMap((l) => ['--label', l]),
    ]);
    console.log(`created: ${url}`);
    created.push(url);
  }
  return created;
}

function main() {
  ensureAuth();
  ensureLabels();
  ensureMilestone();
  const urls = createIssues(MILESTONE);
  console.log(`\nDone. Created ${urls.length} issue(s).`);
  if (urls.length) {
    console.log(urls.join('\n'));
  }
}

main();
