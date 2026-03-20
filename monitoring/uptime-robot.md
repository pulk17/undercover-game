# Uptime Robot Configuration

This document describes how to configure Uptime Robot monitors for the Undercover Game services.

## Monitor 1: API Health Check

| Setting | Value |
|---|---|
| Monitor Type | HTTP(S) |
| Friendly Name | Undercover Game — API Health |
| URL | `{SERVER_URL}/api/v1/health` |
| Monitoring Interval | 5 minutes |
| Alert after | 2 consecutive failures |

Replace `{SERVER_URL}` with your Render.com service URL (e.g. `https://undercover-game-server.onrender.com`).

## Monitor 2: Frontend

| Setting | Value |
|---|---|
| Monitor Type | HTTP(S) |
| Friendly Name | Undercover Game — Frontend |
| URL | `{CLIENT_URL}` |
| Monitoring Interval | 5 minutes |
| Alert after | 2 consecutive failures |

Replace `{CLIENT_URL}` with your Vercel deployment URL (e.g. `https://undercover-game.vercel.app`).

## Setting Up Alert Contacts

1. Log in to [Uptime Robot](https://uptimerobot.com) and go to **My Settings → Alert Contacts**.
2. Click **Add Alert Contact**.
3. Choose **E-mail** as the alert contact type.
4. Enter the email address that should receive notifications.
5. Click **Create Alert Contact** and confirm via the verification email.
6. When creating each monitor above, add this alert contact under **Alert Contacts to Notify**.

## Notes

- Both monitors use a 5-minute check interval (the minimum on the free plan).
- Alerts fire after 2 consecutive failures to reduce false positives from transient network issues.
- The `/api/v1/health` endpoint returns HTTP 200 when the server is healthy.
