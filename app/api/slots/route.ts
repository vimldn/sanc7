import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { slotId } = await req.json()

  if (!slotId) return NextResponse.json({ error: 'slotId required' }, { status: 400 })

  // Cast to any — untyped supabase-js client still has strict update() signature
  // that conflicts with generated columns. Safe here: this route only writes status.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as any

  const { data: slot, error: fetchError } = await db
    .from('inventory_slots')
    .select('*')
    .eq('id', slotId)
    .single()

  if (fetchError || !slot || slot.status !== 'available') {
    return NextResponse.json({ error: 'Slot no longer available' }, { status: 409 })
  }

  const { error } = await db
    .from('inventory_slots')
    .update({ status: 'held' })
    .eq('id', slotId)
    .eq('status', 'available')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ held: true, slotId })
}
