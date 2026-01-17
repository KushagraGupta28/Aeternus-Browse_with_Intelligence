import sys
import os
import asyncio
import httpx
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Ensure we can import aeternus
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aeternus import Agent, Browser, ChatBrowserUse

# Unique CDP port for Aeternus - must match electron/main.ts
AETERNUS_CDP_PORT = 9333

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentRequest(BaseModel):
    task: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "Aeternus Agent", "cdp_port": AETERNUS_CDP_PORT}

async def verify_aeternus_connection() -> tuple[str | None, str | None]:
    """Verify we're connecting to the Aeternus Electron app and return the BrowserView's WebSocket URL.
    
    Returns:
        Tuple of (ws_url, error_message). One will be None.
        
    Validation checks:
    1. CDP endpoint is reachable
    2. There's at least one page target
    3. We can identify the BrowserView (the page showing actual web content)
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Check if CDP endpoint is reachable
            try:
                response = await client.get(f"http://localhost:{AETERNUS_CDP_PORT}/json/version")
                version_info = response.json()
                browser_name = version_info.get("Browser", "Unknown")
                
                # Verify it's Electron
                if "Electron" not in browser_name and "Chrome" not in browser_name:
                    return None, f"Unexpected browser: {browser_name}. Expected Electron."
                    
                print(f"[CDP] Connected to: {browser_name}")
            except Exception as e:
                return None, f"Cannot reach Aeternus on port {AETERNUS_CDP_PORT}. Is the app running?"
            
            # Get targets
            response = await client.get(f"http://localhost:{AETERNUS_CDP_PORT}/json")
            targets = response.json()
            
            if not targets:
                return None, "No browser targets found. The Aeternus app may not be fully loaded."
            
            # Find the BrowserView page (the one showing web content, not the React UI)
            # The BrowserView loads external URLs (like google.com)
            # The main window loads localhost:5173 (the React app)
            browser_view_target = None
            react_app_target = None
            
            for target in targets:
                if target.get("type") != "page" or "parentId" in target:
                    continue
                    
                url = target.get("url", "")
                title = target.get("title", "")
                
                # Skip internal pages
                if url.startswith("chrome://") or url.startswith("devtools://"):
                    continue
                
                # The React app runs on localhost:5173
                if "localhost:5173" in url or "localhost:5174" in url:
                    react_app_target = target
                    continue
                
                # This is likely the BrowserView (external web content)
                browser_view_target = target
                print(f"[CDP] Found BrowserView: '{title}' - {url[:50]}...")
            
            if browser_view_target:
                ws_url = browser_view_target.get("webSocketDebuggerUrl")
                return ws_url, None
            
            # If no BrowserView found but React app exists, the user hasn't navigated yet
            if react_app_target:
                return None, "BrowserView not ready. Please navigate to a webpage first."
            
            return None, "Could not find the Aeternus BrowserView target."
                
    except httpx.ConnectError:
        return None, f"Cannot connect to port {AETERNUS_CDP_PORT}. Make sure the Aeternus app is running."
    except Exception as e:
        return None, f"Connection error: {str(e)}"

@app.websocket("/ws/agent")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[WS] UI Connected")
    
    try:
        while True:
            data = await websocket.receive_text()
            request = json.loads(data)
            task = request.get("task")
            
            if not task:
                continue
                
            await websocket.send_json({"type": "info", "message": f"Received: {task}"})
            
            try:
                # Verify connection to Aeternus and get WebSocket URL
                ws_url, error = await verify_aeternus_connection()
                
                if error:
                    await websocket.send_json({"type": "error", "message": error})
                    continue
                
                await websocket.send_json({"type": "info", "message": "Connected to browser"})
                
                # Connect to the verified BrowserView
                browser = Browser(cdp_url=ws_url)
                
                # Use ChatBrowserUse with BROWSER_USE_API_KEY from env
                llm = ChatBrowserUse()

                # Define step callback for real-time updates
                async def on_step(browser_state, model_output, step_number):
                    try:
                        # Send thought process
                        if hasattr(model_output, 'thinking') and model_output.thinking:
                            await websocket.send_json({"type": "thought", "message": model_output.thinking})
                        
                        # Send action recommendations
                        if hasattr(model_output, 'recommendations') and model_output.recommendations:
                            await websocket.send_json({
                                "type": "recommendations", 
                                "actions": model_output.recommendations
                            })
                            
                        # Send general step info
                        await websocket.send_json({
                            "type": "step", 
                            "step": step_number,
                            "url": browser_state.url if hasattr(browser_state, 'url') else None
                        })
                    except Exception as step_e:
                        print(f"[Agent] Error in step callback: {step_e}")

                agent = Agent(
                    task=task,
                    llm=llm,
                    browser=browser,
                    max_actions_per_step=10,
                    register_new_step_callback=on_step
                )
                
                await websocket.send_json({"type": "info", "message": "Agent running..."})
                
                history = await agent.run()
                
                # Get the final result
                result_text = history.final_result() if hasattr(history, 'final_result') else str(history)
                
                await websocket.send_json({"type": "success", "message": f"Done: {result_text}"})
                await websocket.send_json({"type": "done", "result": result_text})

            except Exception as e:
                print(f"[Agent] Error: {e}")
                import traceback
                traceback.print_exc()
                try:
                    await websocket.send_json({"type": "error", "message": str(e)})
                except:
                    pass  # Client may have disconnected

    except WebSocketDisconnect:
        print("[WS] Client disconnected")

if __name__ == "__main__":
    print(f"[Aeternus Backend] Starting on port 8000, expecting CDP on port {AETERNUS_CDP_PORT}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
