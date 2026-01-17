import React, { useState, useEffect, useRef } from 'react';

// Cosmic Color Palette
const colors = {
    bgDeep: '#05050a',
    bgDark: '#0a0a12',
    bgCard: '#12121e',
    bgHover: '#1a1a2e',
    accent: '#7c3aed',
    accentLight: '#a78bfa',
    accentBlue: '#3b82f6',
    accentCyan: '#06b6d4',
    textPrimary: '#f0f0ff',
    textSecondary: '#888899',
    textMuted: '#555566',
    border: 'rgba(255,255,255,0.08)',
    gradientPurple: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
    gradientCosmic: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 50%, #1a1a2e 100%)',
    gradientSidebar: 'linear-gradient(180deg, #0c0c16 0%, #12121e 50%, #0a0a14 100%)',
};

const BrowserShell = () => {
    const [tabs, setTabs] = useState([
        { id: 1, title: 'Google', active: true, url: 'https://google.com' },
    ]);
    const [urlInput, setUrlInput] = useState('https://google.com');
    const [isLoading, setIsLoading] = useState(false);
    const browserContainerRef = useRef<HTMLDivElement>(null);

    // Listen for events from main process
    useEffect(() => {
        const api = (window as any).electronAPI;
        if (api) {
            api.onLoading?.((loading: boolean) => setIsLoading(loading));
            api.onUrlChange?.((url: string) => {
                setUrlInput(url);
                setTabs(prev => prev.map(t => t.active ? { ...t, url } : t));
            });
            api.onTitleChange?.((title: string) => {
                setTabs(prev => prev.map(t => t.active ? { ...t, title: title || 'New Tab' } : t));
            });
        }
    }, []);

    const handleTabClick = (id: number) => {
        setTabs(tabs.map(t => ({ ...t, active: t.id === id })));
        const activeTab = tabs.find(t => t.id === id);
        if (activeTab) {
            setUrlInput(activeTab.url);
            (window as any).electronAPI?.navigate(activeTab.url);
        }
    };

    const addNewTab = () => {
        const newId = Math.max(...tabs.map(t => t.id)) + 1;
        setTabs([...tabs.map(t => ({ ...t, active: false })), { id: newId, title: 'New Tab', active: true, url: 'about:blank' }]);
        setUrlInput('');
    };

    const closeTab = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (tabs.length === 1) return;
        const newTabs = tabs.filter(t => t.id !== id);
        if (tabs.find(t => t.id === id)?.active) {
            newTabs[0].active = true;
            setUrlInput(newTabs[0].url);
            (window as any).electronAPI?.navigate(newTabs[0].url);
        }
        setTabs(newTabs);
    };

    const handleUrlSubmit = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            let url = urlInput.trim();
            if (!url) return;
            if (!url.startsWith('http')) {
                url = url.includes('.') ? 'https://' + url : 'https://google.com/search?q=' + encodeURIComponent(url);
            }
            (window as any).electronAPI?.navigate(url);
            setTabs(tabs.map(t => t.active ? { ...t, url } : t));
        }
    };

    useEffect(() => {
        if (!browserContainerRef.current) return;
        const updateLayout = () => {
            if (browserContainerRef.current) {
                const rect = browserContainerRef.current.getBoundingClientRect();
                (window as any).electronAPI?.updateLayout({
                    x: rect.x, y: rect.y, width: rect.width, height: rect.height
                });
            }
        };
        updateLayout();
        const observer = new ResizeObserver(updateLayout);
        observer.observe(browserContainerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw',
            backgroundColor: colors.bgDeep, color: colors.textPrimary,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflow: 'hidden'
        }}>
            {/* Titlebar with Tabs */}
            <div style={{
                height: '46px', display: 'flex', alignItems: 'flex-end',
                paddingLeft: '80px', paddingRight: '12px',
                background: colors.gradientCosmic,
                WebkitAppRegion: 'drag' as any, userSelect: 'none', flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', flex: 1, overflow: 'hidden' }}>
                    {tabs.map(tab => (
                        <Tab
                            key={tab.id}
                            tab={tab}
                            onClick={() => handleTabClick(tab.id)}
                            onClose={(e: React.MouseEvent) => closeTab(tab.id, e)}
                            isLoading={isLoading && tab.active}
                        />
                    ))}
                    <IconButton onClick={addNewTab} tooltip="New Tab" style={{ marginLeft: '4px', marginBottom: '4px' }}>
                        <PlusIcon />
                    </IconButton>
                </div>
            </div>

            {/* Main Area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Browser Section */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* Navigation Bar */}
                    <div style={{
                        height: '52px', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px',
                        background: colors.bgCard, borderBottom: `1px solid ${colors.border}`
                    }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <NavButton onClick={() => (window as any).electronAPI?.goBack()} tooltip="Back"><BackIcon /></NavButton>
                            <NavButton onClick={() => (window as any).electronAPI?.goForward()} tooltip="Forward"><ForwardIcon /></NavButton>
                            <NavButton onClick={() => (window as any).electronAPI?.reload()} tooltip="Reload" isLoading={isLoading}><ReloadIcon /></NavButton>
                        </div>

                        {/* URL Bar */}
                        <div style={{
                            flex: 1, maxWidth: '700px', display: 'flex', alignItems: 'center',
                            background: colors.bgDark, borderRadius: '12px', padding: '8px 14px',
                            border: `1px solid ${colors.border}`, transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}>
                            {isLoading ? <LoadingSpinner /> : <SearchIcon />}
                            <input
                                type="text"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                onKeyDown={handleUrlSubmit}
                                placeholder="Search or type URL"
                                style={{
                                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                    color: colors.textPrimary, fontSize: '14px', marginLeft: '10px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Webview Container */}
                    <div ref={browserContainerRef} style={{ flex: 1, background: colors.bgCard, position: 'relative' }} />
                </div>

                {/* Cosmic Agent Sidebar */}
                <AgentSidebar />
            </div>
        </div>
    );
};

// === Reusable Components ===

const Tab = ({ tab, onClick, onClose, isLoading }: any) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                minWidth: '140px', maxWidth: '200px', height: '38px', padding: '0 12px',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 500,
                borderRadius: '12px 12px 0 0',
                background: tab.active ? colors.bgCard : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                color: tab.active ? colors.textPrimary : colors.textSecondary,
                cursor: 'pointer', WebkitAppRegion: 'no-drag' as any,
                transition: 'background 0.15s, color 0.15s', flexShrink: 0,
                borderTop: tab.active ? `2px solid ${colors.accent}` : '2px solid transparent',
                boxShadow: tab.active ? `0 -4px 20px ${colors.accent}30` : 'none'
            }}
        >
            {isLoading ? <LoadingSpinner size={14} /> : <GlobeIcon active={tab.active} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {tab.title}
            </span>
            <button
                onClick={(e: React.MouseEvent) => onClose(e)}
                style={{
                    width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: hovered || tab.active ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none', color: colors.textMuted, cursor: 'pointer', borderRadius: '4px',
                    opacity: hovered || tab.active ? 1 : 0, transition: 'opacity 0.15s, background 0.15s'
                }}
            >
                <CloseIcon />
            </button>
        </div>
    );
};

const IconButton = ({ children, onClick, tooltip, style }: any) => {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={tooltip}
            style={{
                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none', color: hovered ? colors.textPrimary : colors.textSecondary,
                cursor: 'pointer', borderRadius: '8px', transition: 'all 0.15s',
                WebkitAppRegion: 'no-drag' as any, flexShrink: 0, ...style
            }}
        >
            {children}
        </button>
    );
};

const NavButton = ({ children, onClick, tooltip, isLoading }: any) => {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={tooltip}
            style={{
                width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hovered ? colors.bgHover : 'transparent',
                border: 'none', color: hovered ? colors.textPrimary : colors.textSecondary,
                cursor: 'pointer', borderRadius: '10px', transition: 'all 0.2s'
            }}
        >
            <div style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }}>{children}</div>
        </button>
    );
};

// === Agent Sidebar with Cosmic Theme ===

const AgentSidebar = () => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<{ id: string; role: 'user' | 'agent'; content: string; status?: string }[]>([]);
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws/agent');
        ws.onopen = () => addMessage('agent', 'Connected to Agent Core.', 'success');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            addMessage('agent', data.message || JSON.stringify(data), data.type);
            if (data.type === 'done' || data.type === 'error') setIsProcessing(false);
        };
        ws.onerror = () => { addMessage('agent', 'Connection error.', 'error'); setIsProcessing(false); };
        ws.onclose = () => addMessage('agent', 'Disconnected.', 'warning');
        setSocket(ws);
        return () => ws.close();
    }, []);

    const addMessage = (role: 'user' | 'agent', content: string, status?: string) => {
        setMessages(prev => [...prev, { id: Math.random().toString(36), role, content, status }]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;
        addMessage('user', input);
        setIsProcessing(true);
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ task: input }));
        else { addMessage('agent', 'Not connected.', 'error'); setIsProcessing(false); }
        setInput('');
    };

    const handleStop = () => { addMessage('agent', 'Stopped by user.', 'error'); setIsProcessing(false); };

    return (
        <div style={{
            width: '380px', minWidth: '380px', display: 'flex', flexDirection: 'column', height: '100%',
            background: colors.gradientSidebar, borderLeft: `1px solid ${colors.border}`,
            position: 'relative', overflow: 'hidden'
        }}>
            {/* Cosmic glow effect */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '150px',
                background: `radial-gradient(ellipse at top, ${colors.accent}15 0%, transparent 70%)`,
                pointerEvents: 'none'
            }} />

            {/* Header */}
            <div style={{
                height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px', borderBottom: `1px solid ${colors.border}`,
                background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', zIndex: 1
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '10px',
                        background: colors.gradientPurple, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 20px ${colors.accent}40`
                    }}>
                        <BotIcon />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '1px', color: colors.textPrimary }}>
                        AETERNUS
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isProcessing && <span style={{ fontSize: '10px', color: colors.accentCyan, fontFamily: 'monospace' }}>ACTIVE</span>}
                    <div style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: isProcessing ? colors.accentCyan : colors.textMuted,
                        boxShadow: isProcessing ? `0 0 10px ${colors.accentCyan}` : 'none',
                        animation: isProcessing ? 'pulse 1.5s infinite' : 'none'
                    }} />
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>
                {messages.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, gap: '12px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: colors.bgHover, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SparklesIcon />
                        </div>
                        <span style={{ fontSize: '14px' }}>Ready to assist</span>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
                            background: msg.role === 'user' ? colors.gradientPurple : colors.bgHover,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: msg.role === 'user' ? `0 4px 15px ${colors.accent}30` : 'none'
                        }}>
                            {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
                        </div>
                        <div style={{
                            maxWidth: '80%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: msg.role === 'user' ? colors.accent :
                                msg.status === 'error' ? 'rgba(239, 68, 68, 0.15)' :
                                    msg.status === 'success' ? 'rgba(34, 197, 94, 0.15)' : colors.bgHover,
                            color: msg.status === 'error' ? '#fca5a5' : msg.status === 'success' ? '#86efac' : colors.textPrimary,
                            fontSize: '14px', lineHeight: '1.5', border: msg.role === 'agent' ? `1px solid ${colors.border}` : 'none',
                            boxShadow: msg.role === 'user' ? `0 4px 20px ${colors.accent}25` : 'none'
                        }}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${colors.border}`, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)', zIndex: 1 }}>
                <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                    <input
                        type="text" value={input} onChange={(e) => setInput(e.target.value)}
                        placeholder={isProcessing ? "Agent is working..." : "Type a command..."}
                        disabled={isProcessing}
                        style={{
                            width: '100%', padding: '14px 50px 14px 18px', backgroundColor: colors.bgHover,
                            border: `1px solid ${colors.border}`, borderRadius: '14px',
                            color: colors.textPrimary, fontSize: '14px', outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s'
                        }}
                    />
                    <button type="submit" disabled={!input.trim() || isProcessing} style={{
                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: input.trim() && !isProcessing ? colors.gradientPurple : 'transparent',
                        border: 'none', borderRadius: '10px', color: input.trim() && !isProcessing ? 'white' : colors.textMuted,
                        cursor: input.trim() && !isProcessing ? 'pointer' : 'not-allowed',
                        boxShadow: input.trim() && !isProcessing ? `0 4px 15px ${colors.accent}40` : 'none',
                        transition: 'all 0.2s'
                    }}>
                        <SendIcon />
                    </button>
                </form>
                {isProcessing && (
                    <button onClick={handleStop} style={{
                        width: '100%', marginTop: '10px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', border: `1px solid rgba(239, 68, 68, 0.25)`,
                        borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    }}>
                        <StopIcon /> Stop Agent
                    </button>
                )}
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            `}</style>
        </div>
    );
};

// === Icons ===
const GlobeIcon = ({ active }: { active?: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? colors.accentBlue : 'currentColor'} strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);
const CloseIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>;
const ForwardIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>;
const ReloadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>;
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const LoadingSpinner = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
);
const BotIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="3" /></svg>;
const UserIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const SparklesIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="1.5"><path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /><circle cx="12" cy="12" r="4" /></svg>;
const SendIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
const StopIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><rect x="9" y="9" width="6" height="6" /></svg>;

export default BrowserShell;
