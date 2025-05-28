# Job Application Filler

An intelligent job application management system that combines a Next.js web application with a Chrome extension for automated form filling using AI.

## 🚀 Features

### Web Application
- **User Authentication**: Secure login/signup with Supabase Auth
- **Profile Management**: Comprehensive user profiles with personal, professional, and contact information
- **Job Application Tracking**: Track applications with status updates, notes, and timestamps
- **Experience & Education Management**: Store and manage work history and educational background
- **Skills Database**: Maintain a list of professional skills with proficiency levels

### Chrome Extension
- **Smart Job Page Detection**: Automatically detects job application pages using advanced heuristics
- **AI-Powered Form Filling**: Uses Gemini AI to analyze forms and generate filling instructions
- **Intelligent Field Mapping**: Maps user profile data to form fields with high accuracy
- **Multi-Page Support**: Handles complex application flows across multiple pages
- **Real-time Feedback**: Provides status updates and error handling during form filling

### AI Integration
- **Gemini AI Analysis**: Direct URL analysis for form structure understanding
- **Standardized Instructions**: Uses a robust instruction protocol for reliable form filling
- **Fallback Mechanisms**: Graceful degradation when AI analysis fails
- **Authentication & Security**: Secure API access with JWT token validation

## 🏗️ Architecture

```
JobApplicationFiller/
├── website/                    # Next.js web application
│   ├── src/
│   │   ├── app/               # App router pages
│   │   ├── components/        # React components
│   │   └── utils/             # Utilities and Supabase client
│   └── supabase/
│       ├── functions/         # Edge Functions
│       └── migrations/        # Database migrations
└── chrome-extension/          # Chrome extension
    ├── manifest.json          # Extension manifest
    ├── popup.html/js          # Extension popup
    ├── content.js             # Content script
    ├── service-worker.js      # Background service worker
    └── ai-instructions-protocol.js  # AI instruction executor
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first CSS framework
- **Supabase**: Backend-as-a-Service for auth and database

### Backend
- **Supabase Edge Functions**: Serverless functions on Deno runtime
- **PostgreSQL**: Database with Row Level Security
- **Gemini AI**: Google's AI model for form analysis

### Chrome Extension
- **Manifest V3**: Latest Chrome extension standard
- **Content Scripts**: DOM manipulation and form filling
- **Service Worker**: Background processing and API communication

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase CLI
- Chrome browser for extension testing

### 1. Clone the Repository
```bash
git clone <repository-url>
cd JobApplicationFiller
```

### 2. Setup Web Application
```bash
cd website
npm install

# Setup Supabase
npx supabase init
npx supabase start
npx supabase db reset

# Configure environment variables
cp .env.example .env.local
# Add your Supabase URL, anon key, and Gemini API key
```

### 3. Setup Chrome Extension
```bash
cd chrome-extension
npm install

# Update config.js with your Supabase URL
```

### 4. Deploy Edge Functions
```bash
cd website
npx supabase functions deploy ai-form-analyzer
```

## 🔧 Configuration

### Environment Variables (website/.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### Chrome Extension Configuration
Update `chrome-extension/config.js`:
```javascript
const CONFIG = {
  SUPABASE_URL: 'your_supabase_url',
  SUPABASE_ANON_KEY: 'your_supabase_anon_key'
}
```

## 🚀 Usage

### Web Application
1. Start the development server:
   ```bash
   cd website
   npm run dev
   ```
2. Visit `http://localhost:3000`
3. Sign up and complete your profile
4. Add work experience, education, and skills

### Chrome Extension
1. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `chrome-extension` folder
2. Navigate to a job application page
3. Click the extension icon and use "AI Fill" to automatically fill forms

## 🔄 Development Workflow

### Database Changes
```bash
cd website
npx supabase db diff --file new_migration_name
npx supabase db reset
```

### Edge Function Updates
```bash
npx supabase functions deploy ai-form-analyzer
```

### Extension Updates
After making changes to the extension:
1. Click the refresh icon in `chrome://extensions/`
2. Reload any tabs where you want to test the extension

## 📊 Database Schema

### Core Tables
- `profiles`: User profile information
- `job_applications`: Job application tracking
- `work_experience`: Employment history
- `education`: Educational background
- `skills`: Professional skills with proficiency levels

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- JWT token validation for API access

## 🤖 AI Form Filling

### How It Works
1. **Detection**: Content script detects job application pages
2. **Analysis**: Sends page URL to Supabase Edge Function
3. **AI Processing**: Gemini AI analyzes the form structure
4. **Instruction Generation**: Creates standardized filling instructions
5. **Execution**: Chrome extension executes instructions to fill forms

### Instruction Types
- `fill_field`: Fill text inputs and textareas
- `select_option`: Select dropdown options
- `check_checkbox`: Check/uncheck checkboxes
- `click_button`: Click buttons

## 🔒 Security Features

- **Authentication**: JWT token validation for all API calls
- **User Isolation**: Users can only access their own data
- **Secure API Keys**: Environment variables for sensitive data
- **Content Security**: Chrome extension follows security best practices

## 🐛 Troubleshooting

### Common Issues

1. **"Authentication required"**
   - Ensure you're logged in to the web application
   - Check that the extension has the correct Supabase configuration

2. **"AI analysis failed"**
   - Verify Gemini API key is set correctly
   - Check Edge Function logs in Supabase dashboard

3. **Extension not detecting job pages**
   - The page might not match detection patterns
   - Check browser console for detection logs

### Development Tools

- **Supabase Dashboard**: Monitor database and Edge Functions
- **Chrome DevTools**: Debug extension and content scripts
- **VS Code**: Configured with Deno support for Edge Functions

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Supabase**: For the excellent backend platform
- **Google Gemini**: For AI-powered form analysis
- **Deno**: For the secure Edge Functions runtime
- **Next.js**: For the robust React framework

---

**Note**: This system is designed to assist with job applications, not replace human judgment. Always review and verify all information before submitting applications.