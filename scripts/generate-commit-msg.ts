import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from "child_process";
import "dotenv/config";

async function main() {
  const commitMsgFile = process.argv[2];
  if (!commitMsgFile) {
    console.error('No commit message file provided');
    process.exit(1);
  }

  // Use the GEMINI_API_KEY environment variable. 
  // Make sure it is exported in your ~/.zshrc or ~/.bashrc!
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('Skipping auto-generation: GEMINI_API_KEY environment variable is not set.');
    console.log('Please set it in your environment (e.g. export GEMINI_API_KEY="your-key") to enable AI commit messages.');
    return;
  }

  try {
    // Check if there are staged changes
    const diff = execSync('git diff --cached').toString();
    if (!diff.trim()) {
      return; // Nothing to commit
    }

    // Read the current commit message file to check if it's not a template
    const currentMsg = readFileSync(commitMsgFile, 'utf8');
    
    // Only generate if the message is empty or is just the default comments (starts with #)
    const lines = currentMsg.split('\n').filter(line => line.trim().length > 0 && !line.trim().startsWith('#'));
    if (lines.length > 0) {
      // User has already typed a message, don't overwrite it
      return; 
    }

    const ai = new GoogleGenAI({ apiKey });
    
    console.log('✨ Generating commit message with Gemini...');
    
    const prompt = `You are an expert software engineer. Write a clear, concise GitHub-style commit message for the following diff.
Use the conventional commits format (e.g., feat: ..., fix: ..., chore: ..., perf: ...).
Do not include any intro or outro text, just the commit message itself. Do not put it in backticks or quotes.

Diff:
${diff.substring(0, 15000)}`; // Truncate to prevent hitting token limits

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const generatedMsg = response.text?.trim() || '';
    
    if (generatedMsg) {
      // Prepend the generated message
      writeFileSync(commitMsgFile, `${generatedMsg}\n\n${currentMsg}`);
      console.log('✨ Commit message generated successfully!');
    }
  } catch (error: any) {
    console.error('Failed to generate commit message:', error.message);
  }
}

main();
