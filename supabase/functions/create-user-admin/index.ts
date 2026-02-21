import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    })
  }

  try {
    const body = await req.json()
    console.log("Requete reçue pour:", body.email)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Création de l'utilisateur dans l'Auth
    const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        first_name: body.firstName,
        last_name: body.lastName,
        phone: body.phone,
        role: body.role
      }
    })

    if (authError) {
      console.error("Erreur Auth:", authError.message)
      return new Response(JSON.stringify({ error: `SUPABASE: ${authError.message}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // 2. Envoi de l'email via Resend
    // NOTE: En mode Trial Resend, vous ne pouvez envoyer qu'à l'adresse de votre compte.
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [body.email],
        subject: 'Vos accès GranitLogix',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Bienvenue ${body.firstName},</h2>
            <p>Votre compte GranitLogix a été créé.</p>
            <p><strong>Identifiant :</strong> ${body.email}</p>
            <p><strong>Mot de passe temporaire :</strong> ${body.password}</p>
            <p style="color: #d97706;"><em>Vous devrez changer ce mot de passe à votre première connexion.</em></p>
          </div>
        `
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("Erreur Resend:", errText)
      return new Response(JSON.stringify({ error: `RESEND: ${errText}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (e) {
    console.error("Erreur Inattendue:", e.message)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
