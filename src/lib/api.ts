import axios from 'axios';
import { ScreenshotApiResponse, ScreenshotOptions } from './types';

// const NODEHIVE_API_BASE = 'https://preview.nodehive.com';

export async function captureScreenshot(
  url: string,
  options: ScreenshotOptions = { width: 1200, height: 800, format: 'png' }
): Promise<ScreenshotApiResponse> {
  try {
    const response = await axios.get('/api/screenshot', {
      params: {
        url,
        width: options.width,
        height: options.height,
        format: options.format,
      },
    });

    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function createJiraTicket(
  // _summary: string,
  // _description: string,
  // _attachments?: File[]
): Promise<{ success: boolean; issueKey?: string; error?: string }> {
  try {
    // This will be implemented later with actual JIRA API integration
    
    // Mock implementation for now
    return {
      success: true,
      issueKey: 'PROJ-' + Math.floor(Math.random() * 1000),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}