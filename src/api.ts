import cors from 'cors';
import express, { Request, Response } from 'express';

import { generateInterviewRoadmap } from './deep-research';

const app = express();
const port = process.env.PORT || 3051;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function for consistent logging
function log(...args: any[]) {
  console.log(...args);
}

// API endpoint to generate interview preparation roadmap
app.post('/api/interview-roadmap', async (req: Request, res: Response) => {
  try {
    const { companyName, jobDescription, jobRole, weblink } = req.body;

    if (!companyName || !jobDescription || !jobRole) {
      return res.status(400).json({ 
        error: 'Company name, job description, and job role are required' 
      });
    }

    log('\nGenerating interview preparation roadmap...\n');
    log(`Company: ${companyName}`);
    log(`Role: ${jobRole}`);

    const roadmap = await generateInterviewRoadmap({
      companyName,
      jobDescription,
      jobRole,
      weblink,
    });

    // Return the roadmap
    return res.json({
      success: true,
      roadmap,
    });
  } catch (error: unknown) {
    console.error('Error in interview roadmap API:', error);
    return res.status(500).json({
      error: 'An error occurred while generating the interview roadmap',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Legacy endpoint for backward compatibility
app.post('/api/research', async (req: Request, res: Response) => {
  try {
    const { query, depth = 3, breadth = 3 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    log('\nStarting research...\n');

    // For backward compatibility, treat query as company name and generate roadmap
    const roadmap = await generateInterviewRoadmap({
      companyName: query,
      jobDescription: 'General software engineering role',
      jobRole: 'Software Engineer',
    });

    return res.json({
      success: true,
      roadmap,
    });
  } catch (error: unknown) {
    console.error('Error in research API:', error);
    return res.status(500).json({
      error: 'An error occurred during research',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Interview Preparation API running on port ${port}`);
});

export default app;
