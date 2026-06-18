'use client'

import { useEffect } from 'react'
import { signout } from '@/app/auth/actions'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes in milliseconds
const ACTIVITY_KEY = 'creditly_last_activity'

export default function AutoLogout() {
    useEffect(() => {
        if (typeof window === 'undefined') return

        // Set initial activity time
        localStorage.setItem(ACTIVITY_KEY, Date.now().toString())

        const updateActivity = () => {
            localStorage.setItem(ACTIVITY_KEY, Date.now().toString())
        }

        // List of events to listen to
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click']

        events.forEach(event => {
            window.addEventListener(event, updateActivity, { passive: true })
        })

        // Check inactivity status periodically
        const interval = setInterval(async () => {
            const lastActivityStr = localStorage.getItem(ACTIVITY_KEY)
            if (lastActivityStr) {
                const lastActivity = parseInt(lastActivityStr, 10)
                const now = Date.now()
                
                if (now - lastActivity > INACTIVITY_TIMEOUT) {
                    clearInterval(interval)
                    events.forEach(event => {
                        window.removeEventListener(event, updateActivity)
                    })
                    // Clear the activity key to avoid infinite loop / double signout triggers
                    localStorage.removeItem(ACTIVITY_KEY)
                    // Trigger signout
                    await signout()
                }
            }
        }, 10000) // Check every 10 seconds

        return () => {
            clearInterval(interval)
            events.forEach(event => {
                window.removeEventListener(event, updateActivity)
            })
        }
    }, [])

    return null
}
