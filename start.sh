#!/usr/bin/env bash
export PATH="$PATH:/c/Program Files/nodejs"

# Don't start twice — check if port 3000 is already in use
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "Server is already running."
  print_routes
  cmd //c start http://localhost:3000 2>/dev/null
  exit 0
fi

echo "Starting server..."
node src/app.js > server.log 2>&1 &
echo $! > .server.pid

# Wait until the server responds (up to 15s)
for i in $(seq 1 15); do
  sleep 1
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo ""
    echo "Server ready at http://localhost:3000"
    echo ""
    echo "  /              — Landing page (choose a mode)"
    echo "  /admin         — Demo Simulation (live faker + trucks)"
    echo "  /realistic     — Realistic Mode gateway"
    echo "  /realistic/admin  — Admin Command Center  (PIN: admin)"
    echo "  /realistic/user   — User SOS Portal"
    echo ""
    cmd //c start http://localhost:3000 2>/dev/null
    exit 0
  fi
  echo "  waiting... ($i)"
done

echo "Server did not start in time. Check server.log for errors."
exit 1
