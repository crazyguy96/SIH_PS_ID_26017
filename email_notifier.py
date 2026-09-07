import os
import smtplib
from email.message import EmailMessage


def send_email(
    recipients,
    subject,
    message,
):
    """
    Send an alert email to the supplied recipients.
    """

    if not recipients:
        print("No email recipients configured.")
        return False

    smtp_host = os.getenv("ALERT_SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("ALERT_SMTP_PORT", "587"))
    smtp_user = os.getenv("ALERT_SMTP_USER")
    smtp_password = os.getenv("ALERT_SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        print(
            "Email credentials are not configured. "
            "Set ALERT_SMTP_USER and ALERT_SMTP_PASSWORD."
        )
        return False

    msg = EmailMessage()

    msg["From"] = smtp_user
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject

    msg.set_content(message)

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        print(
            f"Email sent successfully to: "
            f"{', '.join(recipients)}"
        )

        return True

    except Exception as exc:
        print(f"Email dispatch failed: {exc}")
        return False