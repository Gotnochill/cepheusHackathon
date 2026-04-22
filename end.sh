#!/usr/bin/env bash
export PATH="$PATH:/c/Program Files/nodejs"

if [ -f .server.pid ]; then
  PID=$(cat .server.pid)
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "Server stopped (PID $PID)"
  else
    echo "Server was not running (stale PID $PID)"
  fi
  rm .server.pid
else
  # Fallback: kill any node process running this app
  PIDS=$(ps aux | grep "node src/app.js" | grep -v grep | awk '{print $1}')
  if [ -n "$PIDS" ]; then
    echo "$PIDS" | xargs kill
    echo "Server stopped"
  else
    echo "No server process found"
  fi
fi
