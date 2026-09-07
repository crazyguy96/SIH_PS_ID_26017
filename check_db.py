import sqlite3

conn = sqlite3.connect(r"model_output\scoring.db")

print("TABLES:")
print(conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall())

print("\nAUDIT LOGS:")

try:
    rows = conn.execute(
        "SELECT * FROM audit_logs ORDER BY id DESC LIMIT 10"
    ).fetchall()

    for row in rows:
        print(row)

except sqlite3.OperationalError as e:
    print("ERROR:", e)

conn.close()