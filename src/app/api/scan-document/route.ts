import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const REGO_PROMPT = `You are extracting data from an Australian vehicle registration document.
Extract these fields if present (return null if not found):
- registration_cost: the total registration fee/cost paid (number, AUD)
- expiry_date: registration expiry date (YYYY-MM-DD format)
- vehicle_rego: registration plate number (string)
- vehicle_make: vehicle make/manufacturer (string)
- vehicle_model: vehicle model (string)
- vehicle_year: year of manufacture (number)
- state: Australian state abbreviation e.g. NSW, VIC (string)

Respond ONLY with valid JSON matching this schema, no explanation:
{"registration_cost": null, "expiry_date": null, "vehicle_rego": null, "vehicle_make": null, "vehicle_model": null, "vehicle_year": null, "state": null}`

const INSURANCE_PROMPT = `You are extracting data from an Australian vehicle insurance certificate or policy document.
Extract these fields if present (return null if not found):
- premium_amount: the total annual premium/cost (number, AUD)
- expiry_date: policy expiry date (YYYY-MM-DD format)
- policy_number: insurance policy number (string)
- insurer_name: name of the insurance company (string)
- coverage_type: type of coverage e.g. "Comprehensive", "Third Party" (string)

Respond ONLY with valid JSON, no explanation:
{"premium_amount": null, "expiry_date": null, "policy_number": null, "insurer_name": null, "coverage_type": null}`

function getMediaType(filePath: string): { mediaType: string; contentType: 'document' | 'image' } {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return { mediaType: 'application/pdf', contentType: 'document' }
  if (ext === 'jpg' || ext === 'jpeg') return { mediaType: 'image/jpeg', contentType: 'image' }
  if (ext === 'png') return { mediaType: 'image/png', contentType: 'image' }
  if (ext === 'heic') return { mediaType: 'image/heic', contentType: 'image' }
  return { mediaType: 'image/jpeg', contentType: 'image' }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
    }

    const body = await req.json() as { filePath: string; category: string }
    const { filePath, category } = body

    if (!filePath || !category) {
      return NextResponse.json({ error: 'filePath and category are required' }, { status: 400 })
    }

    // Create Supabase admin client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get a signed URL for the file
    const { data: signedData, error: signedError } = await supabase.storage
      .from('vehicle-files')
      .createSignedUrl(filePath, 60)

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json({ error: signedError?.message ?? 'Could not create signed URL' }, { status: 500 })
    }

    // Fetch the file and convert to base64
    const fileRes = await fetch(signedData.signedUrl)
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch file from storage' }, { status: 500 })
    }
    const arrayBuffer = await fileRes.arrayBuffer()
    const base64String = Buffer.from(arrayBuffer).toString('base64')

    const { mediaType, contentType } = getMediaType(filePath)

    // Build the prompt
    const prompt = category === 'rego' ? REGO_PROMPT : INSURANCE_PROMPT

    // Call Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contentBlock: any
    if (contentType === 'document') {
      contentBlock = {
        type: 'document',
        source: { type: 'base64', media_type: mediaType, data: base64String },
      }
    } else {
      contentBlock = {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64String },
      }
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [contentBlock, { type: 'text', text: prompt }],
        },
      ],
    })

    const responseText = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    // Extract JSON from response (handle potential markdown code fences)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Claude did not return valid JSON', raw: responseText }, { status: 500 })
    }

    const extracted = JSON.parse(jsonMatch[0]) as Record<string, unknown>

    return NextResponse.json({ ok: true, category, extracted })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
