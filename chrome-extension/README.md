# Job Application Filler Chrome Extension

This Chrome extension helps users fill out job applications using their saved profile information.

## Environment Configuration

The extension uses a simple environment configuration system to handle different URLs between development and production. This is managed through the `config.js` file.

### How to Switch Environments

In `config.js`, set the `environment` property to either:
- `'development'` - Uses localhost URLs for local testing
- `'production'` - Uses production deployment URLs

```javascript
// Set this to 'production' before building for deployment
environment: 'development'
```

### Adding New Environment Variables

To add new environment variables:

1. Add them to both the `development` and `production` objects in `config.js`
2. Access them in your code via the imported `env` object

Example:
```javascript
import env from './config.js';

// Use the variables
console.log(env.baseUrl);
console.log(env.loginUrl);
```

## Building the Extension

Before deploying to production:

1. Set the environment to `'production'` in `config.js`
2. Build the extension bundle
3. Test the extension with production URLs

## Extension Permissions

The extension needs these permissions:
- `storage` - To store user preferences
- `activeTab` - To interact with the current tab
- `scripting` - To inject scripts into pages 