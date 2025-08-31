# Confession Scripts

This project contains Node.js scripts to automatically post confessions to Instagram from Supabase tables. The scripts are designed to run periodically on GitHub Actions.

## Setup

1. **Clone or upload this repository to GitHub** (make it public for free Actions usage).

2. **Install dependencies locally** (optional, for testing):
   ```
   npm install
   ```

3. **Configure environment variables**:
   - Copy `.env` and fill in your actual values.
   - For GitHub Actions, add these as **Repository Secrets** in your GitHub repo settings:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `INSTAGRAM_ACCESS_TOKEN` (for DPU)
     - `INSTAGRAM_BUSINESS_ACCOUNT_ID` (for DPU)
     - `TABLE_NAME` (for DPU)
     - `INSTAGRAM_ACCESS_TOKEN_FC` (for FC)
     - `INSTAGRAM_BUSINESS_ACCOUNT_ID_FC` (for FC)
     - `TABLE_NAME_FC` (for FC)
     - `EMAIL_USER`
     - `EMAIL_PASS` (use an App Password for Gmail)

4. **Test locally** (optional):
   - Set up your `.env` file.
   - Run `node index.js` to test both scripts.
   - **For the web dashboard**: Run `npm run server` and open http://localhost:3000

5. **GitHub Actions**:
   - The workflow in `.github/workflows/schedule.yml` will run every hour automatically.
   - You can also trigger it manually from the Actions tab.

## Scripts

- `DPU.js`: Handles posting for DPU College.
- `FC.js`: Handles posting for Ferguson College.
- `index.js`: Runs both scripts sequentially.
- `server.js`: Web server for the dashboard.

## Web Dashboard

The project includes a web-based dashboard for monitoring and testing:

- **View Logs**: Real-time log display with auto-refresh
- **Test Functions**: Buttons to manually run any script function
- **Status Updates**: Visual feedback for function execution

To run the dashboard:
```bash
npm run server
```
Then open http://localhost:3000 in your browser.

**Note**: For production deployment, you can host this on services like Vercel, Heroku, or Railway by deploying `server.js` as the entry point.

## Notes

- Ensure your Instagram tokens are valid and have the necessary permissions.
- The scripts check posting limits and only post between 8am-1am.
- Emails are sent on failures using nodemailer.
- Free GitHub Actions minutes are sufficient for hourly runs on public repos.
