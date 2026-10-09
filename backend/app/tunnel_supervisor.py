import os
import sys
import time
import subprocess
import re
import sqlite3
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "sql_app.db")
CLOUDFLARED_PATH = os.path.join(os.path.dirname(BASE_DIR), "cloudflared.exe")

def update_db_url(url):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE system_settings SET value=? WHERE key=?", (url, "PUBLIC_BASE_URL"))
        if cursor.rowcount == 0:
            cursor.execute("INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)", 
                           ("PUBLIC_BASE_URL", url, "Public Web Domain for QR Codes"))
        conn.commit()
        conn.close()
        logging.info(f"Successfully updated PUBLIC_BASE_URL in database to: {url}")
    except Exception as e:
        logging.error(f"Failed to update database setting: {e}")

def run_tunnel():
    if not os.path.exists(CLOUDFLARED_PATH):
        logging.error(f"cloudflared.exe not found at {CLOUDFLARED_PATH}")
        return

    cmd = [CLOUDFLARED_PATH, "tunnel", "--protocol", "http2", "--url", "http://localhost:5173"]
    logging.info("Starting Cloudflare Tunnel daemon...")
    
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

    for line in process.stdout:
        print(line, end="")
        match = url_pattern.search(line)
        if match:
            public_url = match.group(0)
            logging.info(f"\n========================================================")
            logging.info(f"ACTIVE CLOUDFLARE PUBLIC HTTPS TUNNEL URL:")
            logging.info(f" -> {public_url}")
            logging.info(f"========================================================\n")
            update_db_url(public_url)

if __name__ == "__main__":
    while True:
        try:
            run_tunnel()
        except Exception as e:
            logging.error(f"Tunnel process crashed: {e}")
        logging.info("Restarting Cloudflare tunnel in 5 seconds...")
        time.sleep(5)
