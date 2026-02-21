import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const { action } = body

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        if (action === 'delete') {
            console.log("Deleting user:", body.userId)
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(body.userId)

            if (deleteError) {
                throw new Error(`Erreur suppression Auth: ${deleteError.message}`)
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Default action: Create
        console.log("Creating user:", body.email)

        // Check if exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
        if (existingUser?.users.find(u => u.email === body.email)) {
            return new Response(JSON.stringify({
                error: `SUPABASE_AUTH: Cet utilisateur existe déjà (${body.email}).`
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

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
            throw new Error(`SUPABASE_AUTH: ${authError.message}`)
        }

        // Send Email via Resend
        let emailSent = false
        let emailError = null

        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'GranitLogix <onboarding@resend.dev>',
                    to: [body.email],
                    subject: 'Vos accès GranitLogix',
                    html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Bienvenue ${body.firstName},</h2>
              <p>Votre compte GranitLogix a été créé.</p>
              <p><strong>Identifiant :</strong> ${body.email}</p>
              <p><strong>Mot de passe temporaire :</strong> ${body.password}</p>
              <p style="color: #d97706;"><em>Veuillez changer ce mot de passe à votre première connexion.</em></p>
            </div>
          `
                })
            })
            if (res.ok) emailSent = true
            else emailError = await res.text()
        } catch (e) {
            emailError = e.message
        }

        if (!emailSent) {
            return new Response(JSON.stringify({
                success: true,
                warning: "Compte créé, mais email non envoyé.",
                manualPassword: body.password,
                details: emailError
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
