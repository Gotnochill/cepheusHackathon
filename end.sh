#!/usr/bin/env bash

# Find the PID listening on port 3000
PID=$(netstat -ano 2>/dev/null | grep ":3000 " | grep "LISTENING" | awk '{print $5}' | head -1)

if [ -n "$PID" ] && [ "$PID" != "0" ]; then
  taskkill //PID "$PID" //F > /dev/null 2>&1 && echo "Server stopped (PID $PID)" || echo "Failed to stop PID $PID"
else
  # Fallback: kill all node.exe processes
  taskkill //IM node.exe //F > /dev/null 2>&1 && echo "Server stopped (killed node.exe)" || echo "No server running"
fi

# Clean up PID file if present
[ -f .server.pid ] && rm .server.pid

echo "Done."
