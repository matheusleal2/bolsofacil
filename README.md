<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f8df4c41-a4d5-44de-887f-9403f5c2b162

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment

This app is ready to be deployed on **Vercel**.

### Steps to Deploy:
1. Push your code to your GitHub repository.
2. Import the project on [Vercel](https://vercel.com).
3. In the project settings on Vercel, add the following **Environment Variables**:
   - `VITE_SUPABASE_URL`: Your project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your anon/public key.
4. Click **Deploy**.

The `vercel.json` file handles the redirects for the Single Page Application.
