# Edge Functions: bandeja de contacto

Tres funciones que hablan con la API de Gmail usando un refresh token OAuth. Diseño completo en
`docs/superpowers/specs/2026-10-25-contact-inbox-design.md` (carpeta `D:\Projects\portafolio\docs`).

| Función | Llamada por | Autenticación |
|---|---|---|
| `contact-submit` | modal público de Contacto | pública; CORS por `ALLOWED_ORIGINS`; honeypot + límite por IP |
| `contact-reply` | bandeja del admin | sesión del usuario, debe estar en la tabla `admins` |
| `contact-sync` | `pg_cron` cada 5 min (migración 0008) | cabecera `x-cron-secret` = `CRON_SECRET` |

`_shared/contact-core.ts` es lógica pura, probada con Karma en `src/testing/contact-core.spec.ts`.

## 1. Google Cloud (una vez)

1. [console.cloud.google.com](https://console.cloud.google.com): crear un proyecto y activar **Gmail API**.
2. **Pantalla de consentimiento OAuth**: tipo *Externo*, añadir `kmilo0230@gmail.com` como usuario de prueba y
   **publicar la app ("En producción")**. En modo *Prueba* el refresh token caduca a los 7 días.
3. **Credenciales → Crear ID de cliente OAuth → Aplicación web**, con URI de redirección autorizada
   `https://developers.google.com/oauthplayground`. Guardar *Client ID* y *Client secret*.
4. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground): engranaje → *Use your own OAuth credentials*
   (pegar ID y secreto) → en el campo de scopes escribir
   `https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly` →
   *Authorize APIs* con la cuenta de Gmail (aceptar el aviso de app no verificada) →
   *Exchange authorization code for tokens* → copiar el **Refresh token**.

## 2. Secretos en Supabase

Dashboard → Edge Functions → *Secrets*:

| Nombre | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | del paso 1.3 |
| `GOOGLE_CLIENT_SECRET` | del paso 1.3 |
| `GOOGLE_REFRESH_TOKEN` | del paso 1.4 |
| `GMAIL_ADDRESS` | `kmilo0230@gmail.com` |
| `CONTACT_IP_SALT` | 64 caracteres hex aleatorios |
| `CRON_SECRET` | 64 caracteres hex aleatorios (distinto del anterior) |
| `ALLOWED_ORIGINS` | `http://localhost:4200` (añadir la URL de Vercel separada por coma cuando exista) |
| `ADMIN_URL` | `http://localhost:4200` (o la URL de Vercel) |

Valor aleatorio en PowerShell: `-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })`.

## 3. Base de datos

SQL Editor: aplicar `supabase/migrations/0007_contact_inbox.sql`.

## 4. Desplegar

```bash
npx supabase@latest login
npx supabase@latest functions deploy contact-submit --no-verify-jwt --project-ref krptaszitdbxpsiuxpib
npx supabase@latest functions deploy contact-reply --no-verify-jwt --project-ref krptaszitdbxpsiuxpib
npx supabase@latest functions deploy contact-sync --no-verify-jwt --project-ref krptaszitdbxpsiuxpib
```

`--no-verify-jwt` es necesario: las claves `sb_publishable_...` no son JWT; cada función hace su propia autenticación.

## 5. Sincronización programada

1. SQL Editor: `select vault.create_secret('<mismo valor que CRON_SECRET>', 'contact_cron_secret');`
2. Aplicar `supabase/migrations/0008_contact_sync_cron.sql`.

## Si algo falla

- El panel (Mensajes) muestra la última sincronización y el último error.
- Error de autorización (`invalid_grant`): repetir el paso 1.4 y actualizar `GOOGLE_REFRESH_TOKEN`. Comprobar que la
  app sigue "En producción".
- Logs: Dashboard → Edge Functions → la función → *Logs*.
