import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import os
import sys
import threading
import time
import webbrowser

class SchedulerLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("Scheduler Desktop Launcher")
        self.root.geometry("400x450")
        
        # Style
        style = ttk.Style()
        style.theme_use('clam')
        
        # Status Variables
        self.server_status = tk.StringVar(value="Stopped")
        self.client_status = tk.StringVar(value="Stopped")
        self.server_process = None
        self.client_process = None

        # UI Elements
        main_frame = ttk.Frame(root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Header
        header_label = ttk.Label(main_frame, text="Scheduler Launcher", font=("Segoe UI", 16, "bold"))
        header_label.pack(pady=(0, 20))

        # Status Section
        status_frame = ttk.LabelFrame(main_frame, text="System Status", padding="15")
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
        control_frame = ttk.LabelFrame(main_frame, text="Controls", padding="15")
        control_frame.pack(fill=tk.X, pady=20)

        self.btn_start_server = ttk.Button(control_frame, text="Start Server", command=self.toggle_server)
        self.btn_start_server.pack(fill=tk.X, pady=5)

        self.btn_start_client = ttk.Button(control_frame, text="Start Client", command=self.toggle_client)
        self.btn_start_client.pack(fill=tk.X, pady=5)
        
        ttk.Separator(control_frame, orient='horizontal').pack(fill='x', pady=10)

        self.btn_browser = ttk.Button(control_frame, text="Open App in Browser", command=self.open_browser)
        self.btn_browser.pack(fill=tk.X, pady=5)

        # Cleanup on exit
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

        # Monitor thread
        self.running = True
        self.monitor_thread = threading.Thread(target=self.monitor_processes, daemon=True)
        self.monitor_thread.start()

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
            # Try to find python executable
            python_exec = sys.executable
            script_path = os.path.join(cwd, "backend", "main.py")
            
            # Start process
            # Creating a new console group/process group might help, but simple creation is usually fine
            self.server_process = subprocess.Popen(
                [python_exec, script_path], 
                cwd=cwd,
                creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
            )
            
            self.server_status.set("Running")
            self.lbl_server_status.configure(foreground="green")
            self.btn_start_server.configure(text="Stop Server")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start server: {str(e)}")

    def start_client(self):
        try:
            cwd = os.getcwd()
            npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
            
            # Start process
            self.client_process = subprocess.Popen(
                [npm_cmd, "run", "dev"], 
                cwd=cwd,
                creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
            )
            
            self.client_status.set("Running")
            self.lbl_client_status.configure(foreground="green")
            self.btn_start_client.configure(text="Stop Client")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start client: {str(e)}")

    def stop_server(self):
        if self.server_process:
            self.kill_process(self.server_process)
            self.server_process = None
            self.server_status.set("Stopped")
            self.lbl_server_status.configure(foreground="red")
            self.btn_start_server.configure(text="Start Server")

    def stop_client(self):
        if self.client_process:
            self.kill_process(self.client_process)
            self.client_process = None
            self.client_status.set("Stopped")
            self.lbl_client_status.configure(foreground="red")
            self.btn_start_client.configure(text="Start Client")

    def kill_process(self, process):
        try:
            if os.name == 'nt':
                # taskkill /F /T /PID <pid> force kills process and children
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(process.pid)])
            else:
                process.terminate()
        except Exception as e:
            print(f"Error killing process: {e}")

    def open_browser(self):
        # Default Vite port is usually 5173, but we should double check if it's dynamic
        # For now, 5173 is a safe bet for Vite
        webbrowser.open("http://localhost:5173")

    def monitor_processes(self):
        while self.running:
            if self.server_process:
                if self.server_process.poll() is not None:
                    self.server_process = None
                    # Use after() to update UI from subthread
                    self.root.after(0, lambda: self.server_status.set("Stopped"))
                    self.root.after(0, lambda: self.lbl_server_status.configure(foreground="red"))
                    self.root.after(0, lambda: self.btn_start_server.configure(text="Start Server"))

            if self.client_process:
                if self.client_process.poll() is not None:
                    self.client_process = None
                    self.root.after(0, lambda: self.client_status.set("Stopped"))
                    self.root.after(0, lambda: self.lbl_client_status.configure(foreground="red"))
                    self.root.after(0, lambda: self.btn_start_client.configure(text="Start Client"))
                
            time.sleep(1)

    def on_closing(self):
        self.running = False
        self.stop_server()
        self.stop_client()
        self.root.destroy()

if __name__ == "__main__":
    try:
        root = tk.Tk()
        # Set icon if available, skipped for now
        app = SchedulerLauncher(root)
        root.mainloop()
    except Exception as e:
        # Fallback logging if GUI fails
        with open("launcher_error.log", "w") as f:
            f.write(str(e))
