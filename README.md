# Instagram Automation Scripts

This project contains automated scripts for posting Instagram content from Supabase data sources for Ferguson College (FC) and Dr. D.Y. Patil University (DPU).

## Features

- **Automated Instagram Posting**: Posts images and content to Instagram accounts using the Graph API
- **Supabase Integration**: Fetches confession data from Supabase databases
- **Email Notifications**: Sends alerts for posting status and errors
- **Web Dashboard**: Monitor logs and test functions through a web interface
- **Scheduled Execution**: Runs automatically every hour via GitHub Actions
- **Environment-based Configuration**: Secure credential management using environment variables

## Project Structure

```
├── DPU.js              # DPU Instagram automation functions
├── FC.js               # FC Instagram automation functions
├── index.js            # Main script runner
├── server.js           # Express server for dashboard
├── package.json        # Node.js dependencies
├── .env               # Environment variables (create this file)
├── .github/workflows/ # GitHub Actions workflow
└── public/            # Static files for dashboard
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd scripts
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# DPU Instagram Configuration
INSTAGRAM_ACCESS_TOKEN=your_dpu_instagram_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_dpu_business_account_id
TABLE_NAME=your_dpu_table_name

# FC Instagram Configuration
INSTAGRAM_ACCESS_TOKEN_FC=your_fc_instagram_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID_FC=your_fc_business_account_id
TABLE_NAME_FC=your_fc_table_name

# Email Configuration
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
```

### 3. Obtain Required Tokens

#### Instagram Access Tokens
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a Facebook App with Instagram Basic Display
3. Generate access tokens for both DPU and FC accounts
4. Get the Business Account IDs from Instagram Graph API Explorer

#### Gmail App Password
1. Enable 2-factor authentication on your Gmail account
2. Go to Google Account settings > Security > App passwords
3. Generate an app password for this application

### 4. GitHub Secrets (for Actions)

Add the following secrets to your GitHub repository:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `TABLE_NAME`
- `INSTAGRAM_ACCESS_TOKEN_FC`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID_FC`
- `TABLE_NAME_FC`
- `EMAIL_USER`
- `EMAIL_PASS`

## Usage

### Local Development

```bash
# Run the scripts manually
node index.js

# Start the dashboard server
node server.js
```

### Dashboard

The web dashboard is available at `http://localhost:3000` when running the server. It provides:

- Real-time logs
- Function testing interface
- Status monitoring

### GitHub Actions

The scripts run automatically every hour via GitHub Actions workflow. You can also trigger them manually from the Actions tab.

## Available Functions

### DPU Functions
- `postImagesToInstagramDPU_Supabase()` - Posts images to DPU Instagram
- `countReadyConfessionsDPU_Supabase()` - Counts ready confessions
- `testInstagramContentPublishingLimitDPU_Supabase()` - Tests posting limits

### FC Functions
- `postImagesToInstagramFC_Supabase()` - Posts images to FC Instagram
- `countReadyConfessionsFC_Supabase()` - Counts ready confessions
- `testInstagramContentPublishingLimitFC_Supabase()` - Tests posting limits

## API Endpoints

- `GET /logs` - Get application logs
- `POST /run/dpu` - Run DPU posting function
- `POST /run/fc` - Run FC posting function
- `POST /run/count-dpu` - Run DPU count function
- `POST /run/count-fc` - Run FC count function
- `POST /run/test-dpu` - Run DPU test function
- `POST /run/test-fc` - Run FC test function

## Dependencies

- `axios` - HTTP client for API requests
- `nodemailer` - Email sending
- `dotenv` - Environment variable management
- `express` - Web server framework

## Troubleshooting

### Common Issues

1. **Instagram API Errors**: Ensure access tokens are valid and not expired
2. **Supabase Connection**: Verify URL and API keys are correct
3. **Email Issues**: Use Gmail App Password, not regular password
4. **GitHub Actions**: Check repository secrets are properly configured

### Logs

Check the dashboard or server console for detailed error messages and logs.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

This project is private and for internal use only.