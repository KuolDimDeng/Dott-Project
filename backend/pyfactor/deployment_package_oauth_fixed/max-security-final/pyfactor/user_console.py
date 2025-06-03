# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/user_console.py
import queue

class UserConsole:
    def __init__(self):
        self.message_queue = queue.Queue()

    def info(self, message):
        self.message_queue.put({"type": "info", "content": message})

    def error(self, message):
        self.message_queue.put({"type": "error", "content": message})

    def get_message(self):
        try:
            return self.message_queue.get_nowait()
        except queue.Empty:
            return None

console = UserConsole()