import { useState, useEffect, useRef } from 'react'

/**
 * Hook to manage communication with the DfM (Parent) window.
 * Supports RPC-style execution: Ninja -> postMessage(function) -> DfM (eval) -> postMessage(result) -> Ninja
 */
export function useDfmBridge(spaUrl = "http://localhost:5175") {
    const [connectionStatus, setConnectionStatus] = useState('disconnected')
    const rpcRequests = useRef({})

    const execDfM = (executorFn, ...args) => {
        return new Promise((resolve, reject) => {
            if (!window.opener) {
                reject(new Error('Parent window (DfM) not found.'))
                return
            }

            const timestamp = Date.now()
            // Store request to resolve later when DfM responds
            rpcRequests.current[timestamp] = { resolve, reject }

            window.opener.postMessage({
                type: 'RPC_REQUEST',
                functionStr: executorFn.toString(),
                args: args,
                timestamp: timestamp
            }, '*')
        })
    }

    useEffect(() => {
        const handleMessage = (event) => {
            // Security: Origin check
            // For now we allow '*' in postMessage for development flexibility, 
            // but we still check the event origin if possible.
            // if (event.origin !== "expected-origin") return;

            const { type, timestamp, data, error } = event.data

            // 1. Handle RPC Responses
            if (type === 'RPC_RESPONSE') {
                const request = rpcRequests.current[timestamp]
                if (request) {
                    if (error) request.reject(new Error(error))
                    else request.resolve(data)
                    delete rpcRequests.current[timestamp]
                }
            }

            // 2. Handle System Pings/Pongs
            if (type === 'PONG') {
                setConnectionStatus('connected')
            }
        }

        window.addEventListener('message', handleMessage)

        // Initial Connection Check
        if (window.opener) {
            window.opener.postMessage({ type: 'PING' }, '*')
        }

        return () => window.removeEventListener('message', handleMessage)
    }, [])

    const reconnect = () => {
        if (window.opener) {
            setConnectionStatus('checking...')
            window.opener.postMessage({ type: 'PING' }, '*')
            setTimeout(() => {
                // If no PONG arrived within 1s, mark as disconnected
                // This is a simple heuristic.
            }, 1000)
        } else {
            alert('Parent window not found. Please run the bookmarklet on the DfM page.')
        }
    }

    return {
        connectionStatus,
        execDfM,
        reconnect
    }
}
