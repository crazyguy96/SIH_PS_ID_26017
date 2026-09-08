import json
import os
import urllib.request
import urllib.error


def send_email(recipients, subject, message):
    if not recipients:
        print("No email recipients configured.")
        return False

    api_key = os.getenv("RESEND_API_KEY")

    if not api_key:
        print("RESEND_API_KEY is not configured.")
        return False

    sender = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

    payload = {
        "from": sender,
        "to": recipients,
        "subject": subject,
        "html": f"""
        <html>
          <body>
            <pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">
{message}
            </pre>
          </body>
        </html>
        """,
    }

    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response_body = response.read().decode("utf-8")
            print(f"Email sent successfully via Resend: {response_body}")
            return True

    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        print(f"Email dispatch failed: HTTP {exc.code} - {error_body}")
        return False

    except Exception as exc:
        print(f"Email dispatch failed: {exc}")
        return False