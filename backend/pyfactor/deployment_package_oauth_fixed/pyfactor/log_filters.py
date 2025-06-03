"""
Custom logging filters for the application
"""

import logging

class DeduplicationFilter(logging.Filter):
    """
    Filter that prevents duplicate log messages from flooding the logs
    """
    def __init__(self, name="", capacity=100):
        super().__init__(name)
        self.capacity = capacity
        self.seen = set()

    def filter(self, record):
        log_entry = (record.name, record.levelno, record.pathname, record.lineno, record.msg)
        if log_entry in self.seen:
            return False
        if len(self.seen) >= self.capacity:
            self.seen.pop()
        self.seen.add(log_entry)
        return True