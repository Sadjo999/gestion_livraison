import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    const { email, firstName, password, roleName } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from: 'GranitLogix <onboarding@resend.dev>',
            to: [email],
            subject: 'Bienvenue sur GranitLogix - Vos accès',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #d97706;">Bienvenue sur GranitLogix, ${firstName} !</h2>
          <p>Votre compte a été créé avec succès par l'administrateur.</p>
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Voici vos identifiants de connexion :</p>
            <p style="margin: 10px 0 0 0;"><strong>Email :</strong> ${email}</p>
            <p style="margin: 5px 0 0 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #fff; padding: 2px 5px; border-radius: 4px; border: 1px solid #fbbf24;">${password}</code></p>
            <p style="margin: 10px 0 0 0;"><strong>Rôle :</strong> ${roleName}</p>
          </div>
          <p style="font-size: 14px; color: #666;">
            <strong>Note importante :</strong> Pour votre sécurité, vous devrez changer ce mot de passe lors de votre première connexion.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            Ceci est un email automatique, merci de ne pas y répondre.
          </p>
        </div>
      `,
        }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: res.status,
    })
})
