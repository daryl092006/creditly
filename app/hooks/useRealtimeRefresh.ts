import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export function useRealtimeRefresh(tableName: string, filter?: string) {
    const router = useRouter()

    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel(`realtime_${tableName}_${filter || 'global'}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    table: tableName,
                    schema: 'public',
                    filter: filter
                },
                (payload) => {
                    console.log(`[Realtime] Change detected in ${tableName} ${filter ? `(filtered: ${filter})` : ''}:`, payload)
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tableName, filter, router])
}
