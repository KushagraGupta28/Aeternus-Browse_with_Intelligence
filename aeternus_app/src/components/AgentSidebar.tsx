import React, { useState, useEffect, useRef } from 'react';
import { Send, StopCircle, Activity, Bot, User } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const AgentSidebar = () => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<{ id: string; type: 'info' | 'error' | 'success' | 'warning' | 'user'; message: string }[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        // Connect to Python Backend
        const ws = new WebSocket('ws://localhost:8000/ws/agent');

        ws.onopen = () => {
            console.log('Connected to Aeternus Agent');
            addLog('success', 'Connected to Agent Core.');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type) {
                addLog(data.type, data.message || JSON.stringify(data));
            }
            if (data.type === 'done' || data.type === 'error') {
                setIsProcessing(false);
            }
        };

        ws.onerror = (e) => {
            console.error('WebSocket error', e);
            addLog('error', 'Connection error to Agent Core.');
            setIsProcessing(false);
        };

        ws.onclose = () => {
            addLog('warning', 'Disconnected from Agent Core.');
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        addLog('user', input);
        setIsProcessing(true);

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ task: input }));
        } else {
            addLog('error', 'Agent Core not connected.');
            setIsProcessing(false);
        }

        setInput('');
    };

    const handleStop = () => {
        addLog('error', 'Agent stopped by user.');
        setIsProcessing(false);
    };

    const addLog = (type: 'info' | 'error' | 'success' | 'warning' | 'user', message: string) => {
        setLogs(prev => [...prev, { id: Math.random().toString(36), type, message }]);
    };

    return (
        <div className="w-[350px] bg-[#11111b] border-l border-white/10 flex flex-col h-full font-sans">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#0B0B15]">
                <span className="font-bold text-lg text-white tracking-wide">
                    AETERNUS
                </span>
                <div className="flex items-center gap-2">
                    {isProcessing && <div className="text-[10px] text-green-400 font-mono">ACTIVE</div>}
                    <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {logs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-50">
                        <Activity className="w-8 h-8" />
                        <p className="text-sm">Agent Offline</p>
                    </div>
                )}

                {logs.map((log) => {
                    const isUser = log.type === 'user';
                    return (
                        <div key={log.id} className={cn(
                            "flex gap-3 text-sm",
                            isUser ? "flex-row-reverse" : "flex-row"
                        )}>
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                isUser ? "bg-purple-500/20 text-purple-300" : "bg-blue-500/20 text-blue-300"
                            )}>
                                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>

                            <div className={cn(
                                "flex flex-col gap-1 min-w-0 max-w-[85%]",
                                isUser ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "p-3 rounded-2xl",
                                    isUser
                                        ? "bg-purple-600 text-white rounded-tr-sm"
                                        : "bg-[#1f1f2e] text-gray-200 rounded-tl-sm border border-white/5",
                                    log.type === 'error' && "bg-red-900/20 border-red-500/30 text-red-200",
                                    log.type === 'success' && "bg-green-900/20 border-green-500/30 text-green-200"
                                )}>
                                    {log.message}
                                </div>
                                {!isUser && log.type !== 'info' && (
                                    <span className="text-[10px] text-gray-500 uppercase">{log.type}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={logsEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#0B0B15] border-t border-white/10">
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a command..."
                        disabled={isProcessing}
                        className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-3 pr-10 focus:outline-none focus:border-purple-500/50 transition-colors text-white placeholder:text-gray-600 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!input || isProcessing}
                        className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>

                {isProcessing && (
                    <button
                        onClick={handleStop}
                        className="w-full mt-2 flex items-center justify-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded transition-colors"
                    >
                        <StopCircle className="w-3 h-3" />
                        Stop Generation
                    </button>
                )}
            </div>
        </div>
    );
};

export default AgentSidebar;
