import os

# -------------------------------------------------------------------
# Alert recipient configuration
# -------------------------------------------------------------------
# These values come from environment variables so real email
# addresses are NOT hardcoded into the source code.
#
# Example:
#   $env:ALERT_ADMIN_EMAIL="admin@example.com"
#   $env:ALERT_NORTH_EMAIL="north@example.com"
#
# Add more region/sector mappings as required.
# -------------------------------------------------------------------

ADMIN_EMAIL = os.getenv("ALERT_ADMIN_EMAIL", "")

REGION_RECIPIENTS = {
    "North": os.getenv("ALERT_NORTH_EMAIL", ""),
    "South": os.getenv("ALERT_SOUTH_EMAIL", ""),
    "East": os.getenv("ALERT_EAST_EMAIL", ""),
    "West": os.getenv("ALERT_WEST_EMAIL", ""),
    "Central": os.getenv("ALERT_CENTRAL_EMAIL", ""),
    "Northeast": os.getenv("ALERT_NORTHEAST_EMAIL", ""),
    "Multi-State/National": os.getenv("ALERT_NATIONAL_EMAIL", ""),
}

SECTOR_RECIPIENTS = {
    "ROAD TRANSPORT AND HIGHWAYS":
        os.getenv("ALERT_ROADS_EMAIL", ""),

    "RAILWAYS":
        os.getenv("ALERT_RAILWAYS_EMAIL", ""),

    "HEALTH AND FAMILY WELFARE":
        os.getenv("ALERT_HEALTH_EMAIL", ""),

    "PETROLEUM":
        os.getenv("ALERT_PETROLEUM_EMAIL", ""),

    "POWER":
        os.getenv("ALERT_POWER_EMAIL", ""),
}


def get_recipients(region, sector):
    """
    Determine who should receive an alert.

    Priority:
    1. Sector-specific manager
    2. Region-specific manager
    3. Central administrator
    """

    recipients = []

    sector_email = SECTOR_RECIPIENTS.get(str(sector), "")
    region_email = REGION_RECIPIENTS.get(str(region), "")

    if sector_email:
        recipients.append(sector_email)

    if region_email and region_email not in recipients:
        recipients.append(region_email)

    if ADMIN_EMAIL and ADMIN_EMAIL not in recipients:
        recipients.append(ADMIN_EMAIL)

    return recipients