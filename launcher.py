import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import subprocess
import os
import sys
import threading
import time
import webbrowser
import queue
import re
import json

CONFIG_FILE = "config.json"

class SchedulerLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("Scheduler Desktop Launcher")
        self.root.geometry("400x550")
        
        # Style
        style = ttk.Style()
        style.theme_use('clam')
        
        # Queue for log updates
        self.log_queue = queue.Queue()
        
        # Status Variables
        self.server_status = tk.StringVar(value="Stopped")
        self.client_status = tk.StringVar(value="Stopped")
        self.server_process = None
        self.client_process = None
        self.server_thread = None
        self.client_thread = None
        
        # Port Variables
        # Port Variables and Python Path
        self.server_port = tk.StringVar(value="8000")
        self.client_port = tk.StringVar(value="5173")
        self.python_path = tk.StringVar(value="python")
        
        self.load_config()

        # Notebook (Tabs)
        self.notebook = ttk.Notebook(root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Tabs
        self.tab_controls = ttk.Frame(self.notebook, padding="20")
        self.tab_server_logs = ttk.Frame(self.notebook)
        self.tab_client_logs = ttk.Frame(self.notebook)

        self.notebook.add(self.tab_controls, text="Controls")
        self.notebook.add(self.tab_server_logs, text="Server Logs")
        self.notebook.add(self.tab_client_logs, text="Client Logs")

        # --- Controls Tab ---
        
        # Header
        header_label = ttk.Label(self.tab_controls, text="Scheduler Launcher", font=("Segoe UI", 16, "bold"))
        header_label.pack(pady=(0, 20))

        # Status Section
        status_frame = ttk.LabelFrame(self.tab_controls, text="System Status", padding="15")
        status_frame.pack(fill=tk.X, pady=10)

        # Server Status
        server_frame = ttk.Frame(status_frame)
        server_frame.pack(fill=tk.X, pady=5)
        ttk.Label(server_frame, text="Backend Server:", width=15, font=("Segoe UI", 10)).pack(side=tk.LEFT)
        self.lbl_server_status = ttk.Label(server_frame, textvariable=self.server_status, foreground="red", font=("Segoe UI", 10, "bold"))
        self.lbl_server_status.pack(side=tk.LEFT)

        # Client Status
        client_frame = ttk.Frame(status_frame)
        client_frame.pack(fill=tk.X, pady=5)
        ttk.Label(client_frame, text="Frontend Client:", width=15, font=("Segoe UI", 10)).pack(side=tk.LEFT)
        self.lbl_client_status = ttk.Label(client_frame, textvariable=self.client_status, foreground="red", font=("Segoe UI", 10, "bold"))
        self.lbl_client_status.pack(side=tk.LEFT)

        # Controls
        control_frame = ttk.LabelFrame(self.tab_controls, text="Controls", padding="15")
        control_frame = ttk.LabelFrame(self.tab_controls, text="Controls", padding="15")
        control_frame.pack(fill=tk.X, pady=20)

        # Configuration Section inside Controls or separate? Let's verify layout.
        # Actually, let's insert a Configuration frame BEFORE the control buttons interact
        
        # Configuration Section Removed as per request (Ports/Path hidden)
        # self.server_port, self.client_port, self.python_path are still loaded from config or defaults


        self.btn_start_server = ttk.Button(control_frame, text="Start Server", command=self.toggle_server)
        self.btn_start_server.pack(fill=tk.X, pady=5)

        self.btn_start_client = ttk.Button(control_frame, text="Start Client", command=self.toggle_client)
        self.btn_start_client.pack(fill=tk.X, pady=5)
        
        ttk.Separator(control_frame, orient='horizontal').pack(fill='x', pady=10)

        self.btn_browser = ttk.Button(control_frame, text="Open App in Browser", command=self.open_browser)
        self.btn_browser.pack(fill=tk.X, pady=5)

        # --- Log Tabs ---
        self.server_log_text = scrolledtext.ScrolledText(self.tab_server_logs, state='disabled', font=("Consolas", 9))
        self.server_log_text.pack(fill=tk.BOTH, expand=True)

        self.client_log_text = scrolledtext.ScrolledText(self.tab_client_logs, state='disabled', font=("Consolas", 9))
        self.client_log_text.pack(fill=tk.BOTH, expand=True)

        # Cleanup on exit
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

        # Monitor / Update Loop
        self.running = True
        self.update_gui_loop()
        
        # ANSII escape sequence remover
        self.ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

    def log_message(self, target, message):
        # Strip ANSI codes
        clean_message = self.ansi_escape.sub('', message)
        self.log_queue.put((target, clean_message))

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r') as f:
                    config = json.load(f)
                    self.server_port.set(str(config.get('serverPort', 8000)))
                    self.client_port.set(str(config.get('clientPort', 5173)))
                    self.python_path.set(config.get('pythonPath', 'python'))
            except Exception as e:
                self.log_message('server', f"Failed to load config: {e}\n")

    def update_gui_loop(self):
        try:
            while True:
                target, msg = self.log_queue.get_nowait()
                widget = self.server_log_text if target == 'server' else self.client_log_text
                widget.configure(state='normal')
                widget.insert(tk.END, msg)
                widget.see(tk.END)
                widget.configure(state='disabled')
        except queue.Empty:
            pass
        
        # Monitor process health
        if self.server_process and self.server_process.poll() is not None:
             self.server_process = None
             self.server_status.set("Stopped")
             self.lbl_server_status.configure(foreground="red")
             self.btn_start_server.configure(text="Start Server")
             self.log_message('server', "\n[Process exited]\n")

        if self.client_process and self.client_process.poll() is not None:
             self.client_process = None
             self.client_status.set("Stopped")
             self.lbl_client_status.configure(foreground="red")
             self.btn_start_client.configure(text="Start Client")
             self.log_message('client', "\n[Process exited]\n")

        if self.running:
            self.root.after(100, self.update_gui_loop)

    def reader_thread(self, pipe, target):
        try:
            for line in iter(pipe.readline, ''):
                if not line: break
                self.log_message(target, line)
        except Exception as e:
            self.log_message(target, f"\n[Reader Error: {e}]\n")
        finally:
            pipe.close()

    def toggle_server(self):
        if self.server_process is None:
            self.start_server()
        else:
            self.stop_server()

    def toggle_client(self):
        if self.client_process is None:
            self.start_client()
        else:
            self.stop_client()

    def start_server(self):
        try:
            cwd = os.getcwd()
            
            # Prepare Environment with specific PORT
            env = os.environ.copy()
            env["PORT"] = self.server_port.get()

            # If frozen (PyInstaller), sys.executable is the launcher.exe itself.
            # We want to use the system python for the backend to keep the bundle small.
            # We use the configured python path.
            python_exec = self.python_path.get()
            
            script_path = os.path.join(cwd, "backend", "main.py")
            
            # Windows flag to hide window
            CREATE_NO_WINDOW = 0x08000000
            
            self.server_process = subprocess.Popen(
                [python_exec, script_path], 
                cwd=cwd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                encoding='utf-8',
                errors='replace',
                creationflags=CREATE_NO_WINDOW if os.name == 'nt' else 0,
                bufsize=1
            )
            
            # Start reader thread
            t = threading.Thread(target=self.reader_thread, args=(self.server_process.stdout, 'server'), daemon=True)
            t.start()
            
            self.server_status.set("Running")
            self.lbl_server_status.configure(foreground="green")
            self.btn_start_server.configure(text="Shutdown Server")
            
            # Switch to log tab to show activity
            # self.notebook.select(self.tab_server_logs) 
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start server: {str(e)}")

    def start_client(self):
        try:
            cwd = os.getcwd()
            npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
            
            CREATE_NO_WINDOW = 0x08000000

            self.client_process = subprocess.Popen(
                [npm_cmd, "run", "dev", "--", "--port", self.client_port.get()], 
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                encoding='utf-8',
                errors='replace',
                creationflags=CREATE_NO_WINDOW if os.name == 'nt' else 0,
                bufsize=1
            )
            
            t = threading.Thread(target=self.reader_thread, args=(self.client_process.stdout, 'client'), daemon=True)
            t.start()
            
            self.client_status.set("Running")
            self.lbl_client_status.configure(foreground="green")
            self.btn_start_client.configure(text="Shutdown Client")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start client: {str(e)}")

    def stop_server(self):
        if self.server_process:
            self.log_message('server', "\n[Stopping Server...]\n")
            self.kill_process(self.server_process)
            # Poll check in main loop will handle UI update

    def stop_client(self):
        if self.client_process:
            self.log_message('client', "\n[Stopping Client...]\n")
            self.kill_process(self.client_process)

    def kill_process(self, process):
        try:
            if os.name == 'nt':
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(process.pid)], creationflags=0x08000000)
            else:
                process.terminate()
        except Exception as e:
            print(f"Error killing process: {e}")

    def open_browser(self):
        webbrowser.open(f"http://localhost:{self.client_port.get()}")

    def on_closing(self):
        self.running = False
        self.stop_server()
        self.stop_client()
        self.root.destroy()

if __name__ == "__main__":
    try:
        root = tk.Tk()
        app = SchedulerLauncher(root)
        root.mainloop()
    except Exception as e:
        with open("launcher_error.log", "w") as f:
            f.write(str(e))
