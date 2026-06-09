# -*- coding: utf-8 -*-
"""
Health Assistant Remote Agent MVP

Portable-agent source for Phase 2-4:
- Connect to Health Assistant OS by session code.
- Push low-resolution screenshots for view-only support.
- Execute a small allowlisted set of remote-control commands only after
  the local user explicitly approves control.

This MVP uses polling through the existing Vercel /api/gas bridge. It does not
support unattended access.
"""

from __future__ import annotations

import base64
import io
import json
import queue
import threading
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import tkinter as tk
from tkinter import messagebox, ttk

APP_VERSION = "HealthAssistantRemoteAgent v0.2.0 MVP"
DEFAULT_BASE_URL = "https://noph-assistant.vercel.app"
FRAME_INTERVAL_SECONDS = 2.5
COMMAND_INTERVAL_SECONDS = 2.0
MAX_FRAME_BASE64 = 44000

try:
    import pyautogui  # type: ignore
    from PIL import Image  # type: ignore

    pyautogui.FAILSAFE = True
    SCREEN_AVAILABLE = True
    SCREEN_IMPORT_ERROR = ""
except Exception as exc:  # pragma: no cover - depends on local workstation
    pyautogui = None  # type: ignore
    Image = None  # type: ignore
    SCREEN_AVAILABLE = False
    SCREEN_IMPORT_ERROR = str(exc)


@dataclass
class AgentState:
    connected: bool = False
    view_active: bool = False
    control_enabled: bool = False
    session_code: str = ""
    agent_id: str = "AGENT-" + uuid.uuid4().hex[:10].upper()


class GasClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def call(self, fn: str, args: Optional[List[Any]] = None) -> Dict[str, Any]:
        body = json.dumps({"fn": fn, "args": args or []}).encode("utf-8")
        req = urllib.request.Request(
            self.base_url + "/api/gas",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                text = resp.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            text = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(text or str(exc)) from exc
        data = json.loads(text or "{}")
        if data.get("__bridgeError"):
            raise RuntimeError(data.get("message") or "GAS bridge error")
        return data


class RemoteAgentApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Health Assistant Remote Agent")
        self.root.geometry("720x560")
        self.state = AgentState()
        self.client = GasClient(DEFAULT_BASE_URL)
        self.ui_queue: "queue.Queue[str]" = queue.Queue()
        self.stop_event = threading.Event()
        self.frame_thread: Optional[threading.Thread] = None
        self.command_thread: Optional[threading.Thread] = None

        self.base_var = tk.StringVar(value=DEFAULT_BASE_URL)
        self.code_var = tk.StringVar()
        self.status_var = tk.StringVar(value="Not connected")
        self.consent_var = tk.StringVar(value="View-only: off | Control: off")

        self._build_ui()
        self._pump_log_queue()

    def _build_ui(self) -> None:
        outer = ttk.Frame(self.root, padding=16)
        outer.pack(fill="both", expand=True)

        title = ttk.Label(outer, text="Health Assistant Remote Agent", font=("Segoe UI", 18, "bold"))
        title.pack(anchor="w")
        ttk.Label(
            outer,
            text="Portable MVP: view-only screenshots and consent-gated remote control. No unattended access.",
            foreground="#475569",
        ).pack(anchor="w", pady=(2, 14))

        form = ttk.LabelFrame(outer, text="Connection", padding=12)
        form.pack(fill="x")
        ttk.Label(form, text="Health Assistant OS URL").grid(row=0, column=0, sticky="w")
        ttk.Entry(form, textvariable=self.base_var).grid(row=1, column=0, sticky="ew", padx=(0, 8), pady=(2, 8))
        ttk.Label(form, text="Session Code").grid(row=0, column=1, sticky="w")
        ttk.Entry(form, textvariable=self.code_var, width=18).grid(row=1, column=1, sticky="ew", padx=(0, 8), pady=(2, 8))
        ttk.Button(form, text="Connect", command=self.connect).grid(row=1, column=2, sticky="ew", pady=(2, 8))
        form.columnconfigure(0, weight=1)

        controls = ttk.LabelFrame(outer, text="Local user consent", padding=12)
        controls.pack(fill="x", pady=12)
        ttk.Label(controls, textvariable=self.status_var, font=("Segoe UI", 10, "bold")).pack(anchor="w")
        ttk.Label(controls, textvariable=self.consent_var, foreground="#475569").pack(anchor="w", pady=(0, 8))
        row = ttk.Frame(controls)
        row.pack(fill="x")
        ttk.Button(row, text="Start View-only", command=self.start_view_only).pack(side="left", padx=(0, 8))
        ttk.Button(row, text="Stop View-only", command=self.stop_view_only).pack(side="left", padx=(0, 8))
        ttk.Button(row, text="Approve Control", command=lambda: self.set_control(True)).pack(side="left", padx=(0, 8))
        ttk.Button(row, text="Stop Control", command=lambda: self.set_control(False)).pack(side="left", padx=(0, 8))

        warning = ttk.Label(
            outer,
            text="Security: The IT officer cannot control this computer until you click Approve Control. Move the mouse to a screen corner to trigger pyautogui fail-safe.",
            foreground="#b45309",
            wraplength=660,
        )
        warning.pack(anchor="w", pady=(0, 10))

        log_frame = ttk.LabelFrame(outer, text="Log", padding=8)
        log_frame.pack(fill="both", expand=True)
        self.log_text = tk.Text(log_frame, height=14, wrap="word")
        self.log_text.pack(fill="both", expand=True)
        self.log(APP_VERSION)
        if not SCREEN_AVAILABLE:
            self.log("Screen/control dependencies are missing: " + SCREEN_IMPORT_ERROR)

    def log(self, message: str) -> None:
        self.ui_queue.put(time.strftime("%H:%M:%S") + "  " + str(message))

    def _pump_log_queue(self) -> None:
        while True:
            try:
                line = self.ui_queue.get_nowait()
            except queue.Empty:
                break
            self.log_text.insert("end", line + "\n")
            self.log_text.see("end")
        self.root.after(200, self._pump_log_queue)

    def _client(self) -> GasClient:
        self.client = GasClient(self.base_var.get().strip() or DEFAULT_BASE_URL)
        return self.client

    def _session_code(self) -> str:
        return "".join(ch for ch in self.code_var.get() if ch.isdigit())[:6]

    def connect(self) -> None:
        code = self._session_code()
        if len(code) != 6:
            messagebox.showwarning("Session Code", "Please enter the 6-digit session code.")
            return
        self.state.session_code = code
        try:
            res = self._client().call("agentRemoteSupportCheckInV753", [code, {"agentVersion": APP_VERSION}])
            if not res.get("success"):
                raise RuntimeError(res.get("message") or "Check-in failed")
            self.state.connected = True
            self.status_var.set("Connected to session " + code)
            self.log("Connected to session " + code)
            self._ensure_command_loop()
        except Exception as exc:
            self.state.connected = False
            self.status_var.set("Connection failed")
            messagebox.showerror("Connection failed", str(exc))
            self.log("Connection failed: " + str(exc))

    def start_view_only(self) -> None:
        if not self.state.connected:
            self.connect()
            if not self.state.connected:
                return
        if not SCREEN_AVAILABLE:
            messagebox.showerror("Missing dependency", "Install requirements first: pyautogui and pillow.")
            return
        if not messagebox.askyesno("Allow view-only?", "Allow IT staff to view your screen for this session?"):
            return
        try:
            self._client().call(
                "updateRemoteSupportSessionV753",
                [self.state.session_code, "", "consent", {"approved": True, "controlStatus": "View Only Approved"}],
            )
        except Exception as exc:
            messagebox.showerror("Consent failed", str(exc))
            return
        self.state.view_active = True
        self.stop_event.clear()
        self._update_consent_text()
        self._ensure_frame_loop()
        self.log("View-only started")

    def stop_view_only(self) -> None:
        self.state.view_active = False
        self._update_consent_text()
        self.log("View-only stopped")

    def set_control(self, enabled: bool) -> None:
        if not self.state.connected:
            messagebox.showwarning("Not connected", "Connect to a session first.")
            return
        if enabled:
            if not messagebox.askyesno("Approve remote control?", "Allow IT staff to control mouse/keyboard for this session?"):
                return
        self.state.control_enabled = bool(enabled)
        action_payload = {"approved": bool(enabled)}
        action = "controlConsent" if enabled else "stopControl"
        try:
            self._client().call("updateRemoteSupportSessionV753", [self.state.session_code, "", action, action_payload])
        except Exception as exc:
            messagebox.showerror("Control update failed", str(exc))
            return
        self._update_consent_text()
        self.log("Remote control " + ("approved" if enabled else "stopped"))

    def _update_consent_text(self) -> None:
        self.consent_var.set(
            "View-only: " + ("on" if self.state.view_active else "off") +
            " | Control: " + ("approved" if self.state.control_enabled else "off")
        )

    def _ensure_frame_loop(self) -> None:
        if self.frame_thread and self.frame_thread.is_alive():
            return
        self.frame_thread = threading.Thread(target=self._frame_loop, daemon=True)
        self.frame_thread.start()

    def _ensure_command_loop(self) -> None:
        if self.command_thread and self.command_thread.is_alive():
            return
        self.command_thread = threading.Thread(target=self._command_loop, daemon=True)
        self.command_thread.start()

    def _frame_loop(self) -> None:
        while not self.stop_event.is_set():
            if self.state.connected and self.state.view_active:
                self.send_frame_once()
            time.sleep(FRAME_INTERVAL_SECONDS)

    def send_frame_once(self) -> None:
        try:
            payload = self.capture_frame_payload()
            payload["agentVersion"] = APP_VERSION
            res = self._client().call("pushRemoteSupportFrameV753", [self.state.session_code, payload])
            if not res.get("success"):
                self.log("Frame rejected: " + str(res.get("message")))
            else:
                self.log("Frame sent")
        except Exception as exc:
            self.log("Frame error: " + str(exc))

    def capture_frame_payload(self) -> Dict[str, Any]:
        if not SCREEN_AVAILABLE:
            raise RuntimeError("Screen capture dependency is not available")
        shot = pyautogui.screenshot()
        screen_width, screen_height = shot.size
        frame = shot.convert("RGB")
        max_width = 760
        if frame.width > max_width:
            ratio = max_width / float(frame.width)
            frame = frame.resize((max_width, int(frame.height * ratio)), Image.LANCZOS)

        for quality in (42, 34, 28):
            buf = io.BytesIO()
            frame.save(buf, format="JPEG", quality=quality, optimize=True)
            b64 = base64.b64encode(buf.getvalue()).decode("ascii")
            if len(b64) <= MAX_FRAME_BASE64:
                return {
                    "imageBase64": b64,
                    "mime": "image/jpeg",
                    "frameWidth": frame.width,
                    "frameHeight": frame.height,
                    "screenWidth": screen_width,
                    "screenHeight": screen_height,
                    "capturedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
                }
        raise RuntimeError("Frame is still too large after compression")

    def _command_loop(self) -> None:
        while not self.stop_event.is_set():
            if self.state.connected:
                try:
                    res = self._client().call("pollRemoteSupportCommandsV753", [self.state.session_code, self.state.agent_id])
                    for cmd in res.get("commands") or []:
                        self.handle_command(cmd)
                except Exception as exc:
                    self.log("Command poll error: " + str(exc))
            time.sleep(COMMAND_INTERVAL_SECONDS)

    def handle_command(self, cmd: Dict[str, Any]) -> None:
        command_id = str(cmd.get("commandId") or cmd.get("signalId") or "")
        result: Dict[str, Any] = {"ok": False}
        try:
            cmd_type = str(cmd.get("type") or "")
            if cmd_type == "requestControl":
                approved = self.ask_yes_no_sync(
                    "Remote control request",
                    "IT staff requests mouse/keyboard control. Approve for this session?",
                )
                self.state.control_enabled = approved
                self._update_consent_text()
                self._client().call("updateRemoteSupportSessionV753", [self.state.session_code, "", "controlConsent", {"approved": approved}])
                result = {"ok": True, "approved": approved}
            elif cmd_type == "stopControl":
                self.state.control_enabled = False
                self._update_consent_text()
                result = {"ok": True, "stopped": True}
            elif cmd_type == "requestFrame":
                self.send_frame_once()
                result = {"ok": True}
            else:
                if not self.state.control_enabled:
                    raise RuntimeError("Control is not approved locally")
                self.execute_control_command(cmd)
                result = {"ok": True}
        except Exception as exc:
            result = {"ok": False, "error": str(exc)}
            self.log("Command failed: " + str(exc))
        try:
            self._client().call("ackRemoteSupportCommandV753", [self.state.session_code, self.state.agent_id, command_id, result])
        except Exception as exc:
            self.log("Ack failed: " + str(exc))

    def ask_yes_no_sync(self, title: str, message: str) -> bool:
        event = threading.Event()
        answer = {"value": False}

        def prompt() -> None:
            answer["value"] = messagebox.askyesno(title, message)
            event.set()

        self.root.after(0, prompt)
        event.wait()
        return bool(answer["value"])

    def execute_control_command(self, cmd: Dict[str, Any]) -> None:
        if not SCREEN_AVAILABLE:
            raise RuntimeError("Control dependency is not available")
        cmd_type = str(cmd.get("type") or "")
        if cmd_type in ("click", "doubleClick", "rightClick"):
            width, height = pyautogui.size()
            x = max(0, min(width - 1, int(float(cmd.get("xRatio") or 0) * width)))
            y = max(0, min(height - 1, int(float(cmd.get("yRatio") or 0) * height)))
            if cmd_type == "doubleClick":
                pyautogui.doubleClick(x, y)
            elif cmd_type == "rightClick":
                pyautogui.rightClick(x, y)
            else:
                pyautogui.click(x, y)
        elif cmd_type == "key":
            key = str(cmd.get("key") or "").strip()
            if key:
                pyautogui.press(key)
        elif cmd_type == "hotkey":
            hotkeys = [str(k).strip() for k in (cmd.get("hotkeys") or []) if str(k).strip()]
            if hotkeys:
                pyautogui.hotkey(*hotkeys[:4])
        elif cmd_type == "typeText":
            text = str(cmd.get("text") or "")
            if text:
                pyautogui.write(text, interval=0.01)
        elif cmd_type == "scroll":
            pyautogui.scroll(int(cmd.get("amount") or 0))
        else:
            raise RuntimeError("Unsupported command: " + cmd_type)
        self.log("Executed command: " + cmd_type)

    def close(self) -> None:
        self.stop_event.set()
        self.root.destroy()


def main() -> None:
    root = tk.Tk()
    app = RemoteAgentApp(root)
    root.protocol("WM_DELETE_WINDOW", app.close)
    root.mainloop()


if __name__ == "__main__":
    main()
