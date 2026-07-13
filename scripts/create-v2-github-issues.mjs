#!/usr/bin/env node
/**
 * Creates Post-MVP UX & Core Flows milestone and 14 GitHub issues.
 * Usage: node scripts/create-v2-github-issues.mjs
 */
import { spawnSync } from 'node:child_process';

const REPO = 'fpresti/saas-foundation';
const MILESTONE = 'Post-MVP UX & Core Flows';

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

function ensureAuth() {
  try {
    gh(['auth', 'status']);
  } catch {
    console.error('GitHub CLI not authenticated. Run: gh auth login');
    process.exit(1);
  }
}

function ensureMilestone() {
  const existing = JSON.parse(
    gh(['api', `repos/${REPO}/milestones`, '--paginate'])
  );
  const found = existing.find((m) => m.title === MILESTONE);
  if (found) {
    console.log(`milestone exists: #${found.number} ${found.title}`);
    return found.title;
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
      'description=UX fixes, auth flows, invitation email, roles model, profile',
    ])
  );
  console.log(`milestone created: #${created.number}`);
  return created.title;
}

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

const issues = [
  {
    title: 'V01 — Fix tokens CSS (labels invisibles en tema claro)',
    labels: ['type:bug', 'priority:critical'],
    body: `## Tema
Los labels secundarios (Home, Settings, Members) usan \`--color-text-secondary\` que en tema claro es blanco sobre fondo claro.

## Objetivo
Texto legible en light y dark theme.

## Criterios de aceptación
- [ ] \`:root\` define \`--color-text-secondary\` con contraste adecuado (ej. gris)
- [ ] \`[data-theme="dark"]\` redefine primary/secondary text
- [ ] Home, Settings y Members muestran labels visibles

## Plan de pruebas
\`\`\`bash
npm run build
# Manual: revisar Home y Settings en light theme
\`\`\`
`,
  },
  {
    title: 'V02 — Login: enlace Create account en modo Password',
    labels: ['type:bug', 'priority:high'],
    body: `## Tema
"Create account" solo aparece en tab Magic link.

## Objetivo
Mismo enlace a \`/sign-up\` visible en ambos modos de login.

## Criterios de aceptación
- [ ] Modo password muestra enlace Create account
- [ ] Forgot password sigue visible solo en modo password

## Archivos
- \`src/app/features/login/login.component.html\`
`,
  },
  {
    title: 'V03 — Onboarding full-screen (sin sidebar)',
    labels: ['type:feature', 'priority:high'],
    body: `## Tema
"Create your organization" aparece dentro del app-shell con sidebar, no centrado en viewport.

## Objetivo
Primera visita de usuario nuevo: pantalla centrada a pantalla completa sin navegación lateral.

## Criterios de aceptación
- [ ] Ruta onboarding fuera del layout con sidebar, o layout dedicado full-bleed
- [ ] Formulario centrado vertical y horizontalmente
- [ ] Tras crear tenant → redirect a home con shell normal

## Plan de pruebas
- Manual: usuario nuevo sin tenants → solo ve formulario onboarding
`,
  },
  {
    title: 'V04 — Sidebar fija al hacer scroll',
    labels: ['type:feature', 'priority:medium'],
    body: `## Tema
Al hacer scroll en el contenido principal, el menú lateral se desplaza.

## Objetivo
Sidebar/rail permanece fijo; solo el \`main\` hace scroll.

## Criterios de aceptación
- [ ] Desktop: aside sticky o fixed height 100vh
- [ ] Contenido principal con overflow-y auto
- [ ] Drawer móvil sin regresiones

## Archivos
- \`src/app/features/app-shell/pages/app-shell.page.html\`
`,
  },
  {
    title: 'V05 — Transiciones visuales sidebar y drawer',
    labels: ['type:feature', 'priority:medium'],
    body: `## Tema
Abrir/cerrar menú (rail ↔ panel, drawer móvil) es instantáneo.

## Objetivo
Transición suave (width/transform/opacity) al expandir/colapsar.

## Criterios de aceptación
- [ ] Rail → panel animado en desktop
- [ ] Drawer móvil entra/sale con transición
- [ ] Respeta \`prefers-reduced-motion\`

## Fuera de alcance
- Rediseño completo del shell
`,
  },
  {
    title: 'V06 — Guard: /select-tenant solo multi-tenant o super_admin',
    labels: ['type:bug', 'priority:high'],
    body: `## Tema
La nav oculta "Switch tenant" para owners con un solo tenant, pero la URL \`/select-tenant\` sigue accesible.

## Objetivo
Alinear guard de ruta con reglas de navegación.

## Criterios de aceptación
- [ ] Owner con 1 tenant → redirect si accede a /select-tenant
- [ ] super_admin con varios tenants → acceso permitido
- [ ] Usuario con varios tenants → acceso permitido

## Archivos
- Nuevo guard o extensión de \`tenant-context.guard.ts\`
- \`src/app/app.routes.ts\`
`,
  },
  {
    title: 'V07 — Invitaciones: enviar email con link (sin token en UI)',
    labels: ['type:feature', 'priority:critical'],
    body: `## Tema
Tras invitar, el modal muestra token/link para copiar manualmente. Debe enviarse email al invitado.

## Objetivo
Al crear invitación, el invitado recibe email con URL lista:
\`{APP_URL}/accept-invitation?token={token}\`

## Criterios de aceptación
- [ ] Modal de éxito confirma "Invitation sent" sin mostrar token
- [ ] Email enviado al email del invite (Resend / Supabase Edge Function / SMTP)
- [ ] Link del email funciona con flujo accept-invitation existente
- [ ] Plantilla de email con nombre del tenant e invitador (si disponible)
- [ ] Actualizar \`verify:invitations\` si hace falta (modo test sin email real)

## Fuera de alcance
- Re-invitar / cancelar invitación
`,
  },
  {
    title: 'V08 — Sign-up con email y password',
    labels: ['type:feature', 'priority:high'],
    body: `## Tema
Sign-up actual solo ofrece magic link.

## Objetivo
Permitir registro con email + password además de magic link (misma pantalla o tabs como login).

## Criterios de aceptación
- [ ] Formulario password en /sign-up
- [ ] Tras registro → flujo onboarding (crear tenant) o confirmación email según config Supabase
- [ ] Cuenta puede usar magic link O password después (identidad única Supabase)

## Notas
Supabase Auth permite ambos métodos en la misma cuenta (mismo email).
`,
  },
  {
    title: 'V09 — Reset password para cuentas sin contraseña (magic link)',
    labels: ['type:feature', 'priority:high'],
    body: `## Tema
Usuarios registrados solo con magic link no pueden entrar con password ni resetear fácilmente.

## Objetivo
Forgot password funciona para establecer contraseña inicial en cuentas magic-only.

## Criterios de aceptación
- [ ] Forgot password envía email y /reset-password permite definir password
- [ ] Documentar/configurar Supabase Redirect URLs (localhost + prod)
- [ ] UX: mensaje claro si usuario solo tiene magic link ("Te enviaremos un enlace para crear contraseña")
- [ ] Profile (futuro): sección cambiar password coherente con este flujo

## Plan de pruebas
- Manual: cuenta magic-only → forgot password → set password → login con password
`,
  },
  {
    title: 'V10 — Definir modelo de roles y permisos (doc + ADR)',
    labels: ['type:chore', 'priority:critical'],
    body: `## Tema
Confusión entre super_admin, owner/member (membership) y roles RBAC (Admin, Member).

## Objetivo
Documento acordado antes de implementar seed y UI de roles.

## Entregable
Actualizar \`AI_PLAYBOOK.md\` o \`docs/ROLES.md\` con:

### Capas
1. **Platform:** \`super_admin\` (acceso cross-tenant)
2. **Membership:** \`tenant_members.member_type\` → \`owner\` | \`member\`
3. **RBAC:** tabla \`roles\` + \`tenant_member_roles\` + \`permissions\`

### Propuesta inicial (a validar)
| Concepto | Qué es | Permisos |
|----------|--------|----------|
| Owner | Creador del tenant (member_type) | Implícitos vía \`is_tenant_owner\` |
| Member | Miembro invitado | Vía rol asignado |
| Rol Admin | Rol tenant \`admin\` | Casi todos excepto transfer ownership |
| Rol Member | Rol tenant \`member\` | Lectura básica |

### Quién puede crear roles
- Owner siempre
- Usuario con \`tenant.roles.create\` (ej. rol Admin)

### Referencia Jira
- Org admin vs project roles vs permission schemes
- Invitaciones siempre por email

## Criterios de aceptación
- [ ] Doc revisado y aprobado por producto
- [ ] Matriz permisos × roles default definida
`,
  },
  {
    title: 'V11 — Seed roles por defecto al crear tenant',
    labels: ['type:feature', 'priority:critical'],
    body: `## Tema
/roles vacío; assign role sin opciones.

## Objetivo
Al \`create_tenant_with_owner\`, crear roles default del tenant según doc V10.

## Criterios de aceptación
- [ ] Migración o extensión RPC crea roles \`admin\` y \`member\` (nombres según V10)
- [ ] Permisos asignados en \`role_permissions\` según matriz acordada
- [ ] Owner: member_type=owner (permisos implícitos; rol opcional)
- [ ] Invitado aceptado: member_type=member + rol \`member\` por defecto
- [ ] \`verify:roles-read\` espera ≥1 rol tras onboarding

## Dependencia
- V10 aprobado

## Fuera de alcance
- UI crear/editar roles custom (ticket aparte si se decide)
`,
  },
  {
    title: 'V12 — Settings tenant: edición básica y alcance',
    labels: ['type:feature', 'priority:medium'],
    body: `## Tema
Settings es solo lectura; labels invisibles (V01).

## Objetivo
Pantalla de configuración del **tenant** (no del usuario — ver V13 Profile).

## v1 — Campos editables
- [ ] Nombre organización
- [ ] Tax ID (si política lo permite)

## v1 — Solo lectura
- [ ] Slug
- [ ] Status
- [ ] Plan / subscription status (desde tabla subscriptions)

## Futuro (documentar, no implementar aún)
- Logo, timezone, locale
- Datos facturación / billing address
- Integraciones

## Criterios de aceptación
- [ ] Guard \`tenant.settings.update\` en edición
- [ ] Persistencia vía RLS o RPC
- [ ] Labels legibles (depende V01)

## Permisos
- Leer: \`tenant.settings.read\`
- Editar: \`tenant.settings.update\` (owner + rol admin)
`,
  },
  {
    title: 'V13 — Feature Profile (usuario)',
    labels: ['type:feature', 'priority:high'],
    body: `## Tema
No existe pantalla de perfil de usuario.

## Objetivo
Ruta \`/profile\` para datos personales y contraseña.

## Campos v1
| Campo | Editable |
|-------|----------|
| Email | No (lectura) |
| full_name | Sí (\`profiles\`) |
| avatar_url | Sí (URL) |
| Password | Sí (sección aparte) |

## Contraseña
- Con password: cambio directo (\`updateUser\`)
- Solo magic link: botón "Enviar enlace para crear contraseña" (\`resetPasswordForEmail\`)

## Criterios de aceptación
- [ ] Feature store/service según AI_PLAYBOOK
- [ ] Nav: enlace desde topbar/avatar
- [ ] Guard: solo auth (no requiere permiso tenant)
- [ ] Permisos DB: \`profile.self.read\` / \`profile.self.update\`

## Fuera de alcance v1
- Cambio email, upload avatar Storage, 2FA
`,
  },
  {
    title: 'V14 — Auth dual: magic link + password en la misma cuenta',
    labels: ['type:chore', 'priority:medium'],
    body: `## Tema
Aclarar y verificar que un usuario puede autenticarse con magic link o password indistintamente.

## Objetivo
Documentación + smoke test del comportamiento Supabase Auth.

## Criterios de aceptación
- [ ] README o docs/AUTH.md explica flujos soportados
- [ ] Mismo email: sign-up password → luego magic link OK (y viceversa)
- [ ] Script o pasos en verify para regresión (opcional)
- [ ] Redirect URLs documentadas para dev y prod

## Relacionado
- V08 sign-up password
- V09 reset password magic-only
`,
  },
];

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
  const milestoneTitle = ensureMilestone();
  const urls = createIssues(milestoneTitle);
  console.log(`\nDone. Created ${urls.length} issue(s).`);
  if (urls.length) console.log(urls.join('\n'));
}

main();
