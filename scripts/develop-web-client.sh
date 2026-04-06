tmux \
    new-session  -s develop-web-client 'cd packages/gridlock-lib; npm run watch' \; \
    split-window 'cd packages/gridlock-lib; npx tsc -p jsconfig.typecheck.json --watch' \; \
    split-window 'cd packages/gridlock-web-client; npm run watch' \; \
    select-layout even-vertical

# Notes:
#  - Use C-b before everything. For example, C-b C-o switches the
#    current window.
#  - Use C-b : to type commands.
#  - :kill-session command kills the session.
