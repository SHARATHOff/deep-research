import * as fs from 'fs/promises';
import * as readline from 'readline';

import { getModel } from './ai/providers';
import {
  deepResearch,
  writeFinalAnswer,
  writeFinalReport,
} from './deep-research';
import { generateFeedback } from './feedback';

// Helper function for consistent logging
function log(...args: any[]) {
  console.log(...args);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}
console.log("FIREWORKS_API_KEY:", process.env.FIREWORKS_API_KEY);

// run the agent
async function run() {
  console.log('Using model: ', getModel().modelId);

  // Get company research parameters
  const companyName = await askQuestion('Enter the company name: ');
  const jobDescription = await askQuestion('Enter the job description: ');
  const role = await askQuestion('Enter the role/position title: ');

  // Get breath and depth parameters
  const breadth =
    parseInt(
      await askQuestion(
        'Enter research breadth (recommended 4-8, default 6): ',
      ),
      10,
    ) || 6;
  const depth =
    parseInt(
      await askQuestion('Enter research depth (recommended 2-4, default 3): '),
      10,
    ) || 3;

  // Create initial query for company interview research
  const initialQuery = `
Company: ${companyName}
Role: ${role}
Job Description: ${jobDescription}

Research Goal: Provide comprehensive interview preparation guidance including:
1. Company background, culture, and values
2. Required technical and soft skills
3. Interview process and rounds with detailed preparation strategies
4. Common interview questions and how to answer them
5. Industry insights and company-specific knowledge
`;

  log(`Creating research plan for ${companyName} interview preparation...`);

  // Generate follow-up questions specific to company research
  const followUpQuestions = await generateFeedback({
    query: initialQuery,
  });

  log(
      '\nTo better understand your interview preparation needs, please answer these follow-up questions:',
    );

    // Collect answers to follow-up questions
    const answers: string[] = [];
    for (const question of followUpQuestions) {
      const answer = await askQuestion(`\n${question}\nYour answer: `);
      answers.push(answer);
    }

    // Combine all information for deep research
    const combinedQuery = `
Initial Query: ${initialQuery}
Follow-up Questions and Answers:
${followUpQuestions.map((q: string, i: number) => `Q: ${q}\nA: ${answers[i]}`).join('\n')}
`;

  log('\nStarting research...\n');

  const { learnings, visitedUrls } = await deepResearch({
    query: combinedQuery,
    breadth,
    depth,
  });

  log(`\n\nLearnings:\n\n${learnings.join('\n')}`);
  log(`\n\nVisited URLs (${visitedUrls.length}):\n\n${visitedUrls.join('\n')}`);
  log('Writing final interview preparation report...');

  const report = await writeFinalReport({
    prompt: combinedQuery,
    learnings,
    visitedUrls,
  });

  const fileName = `${companyName.toLowerCase().replace(/\s+/g, '_')}_interview_prep_report.md`;
  await fs.writeFile(fileName, report, 'utf-8');
  console.log(`\n\nFinal Interview Preparation Report:\n\n${report}`);
  console.log(`\nReport has been saved to ${fileName}`);

  rl.close();
}

run().catch(console.error);
