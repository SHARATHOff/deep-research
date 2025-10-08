import FirecrawlApp, { SearchResponse } from '@mendable/firecrawl-js';
import { generateObject } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';

import { getModel, trimPrompt } from './ai/providers';
import { systemPrompt, interviewRoadmapPrompt } from './prompt';

function log(...args: any[]) {
  console.log(...args);
}

export type ResearchProgress = {
  currentDepth: number;
  totalDepth: number;
  currentBreadth: number;
  totalBreadth: number;
  currentQuery?: string;
  totalQueries: number;
  completedQueries: number;
};

type ResearchResult = {
  learnings: string[];
  visitedUrls: string[];
};

// increase this if you have higher API rate limits
const ConcurrencyLimit = Number(process.env.FIRECRAWL_CONCURRENCY) || 2;

// Initialize Firecrawl with optional API key and optional base url
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_KEY ?? '',
  apiUrl: process.env.FIRECRAWL_BASE_URL,
});

// Interview Roadmap Schema
const InterviewRoundSchema = z.object({
  type: z.string().describe('Round type (MCQ/Coding/HR/Technical/Project)'),
  topics: z.record(z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']),
    preparation_modules: z.array(z.string()),
    description: z.string(),
    resources: z.array(z.string())
  })),
  duration: z.string().describe('Expected duration'),
  format: z.string().describe('Online/In-person/Phone'),
  description: z.string().describe('Detailed description of this round')
});

const InterviewRoadmapSchema = z.object({
  company: z.string(),
  role: z.string(),
  rounds: z.array(InterviewRoundSchema),
  preparation_timeline: z.object({
    weeks_1_2: z.array(z.string()),
    weeks_3_4: z.array(z.string()),
    weeks_5_6: z.array(z.string())
  }),
  key_skills: z.array(z.string()),
  company_specific_tips: z.array(z.string()),
  difficulty_overall: z.enum(['easy', 'medium', 'hard'])
});

// Generate interview preparation roadmap based on company and job details
export async function generateInterviewRoadmap({
  companyName,
  jobDescription,
  jobRole,
  weblink,
}: {
  companyName: string;
  jobDescription: string;
  jobRole: string;
  weblink?: string;
}) {
  log(`\nGenerating interview roadmap for ${companyName} - ${jobRole}\n`);

  // Generate search queries for company-specific interview research
  const searchQueries = await generateInterviewSearchQueries({
    companyName,
    jobRole,
    jobDescription,
  });

  log(`Generated ${searchQueries.length} search queries`);

  // Research company-specific interview information
  const researchData = await performInterviewResearch(searchQueries);

  // Generate the final roadmap using all collected information
  const roadmap = await generateFinalRoadmap({
    companyName,
    jobDescription,
    jobRole,
    weblink,
    researchData,
  });

  return roadmap;
}

// Generate search queries focused on interview preparation
async function generateInterviewSearchQueries({
  companyName,
  jobRole,
  jobDescription,
}: {
  companyName: string;
  jobRole: string;
  jobDescription: string;
}) {
  const res = await generateObject({
    model: getModel(),
    system: systemPrompt(),
    prompt: `Generate search queries to research interview preparation for ${companyName} - ${jobRole} position.

    Job Description: ${jobDescription}

    Focus on finding information about:
    - Company interview process and rounds
    - Technical skills required for this role
    - Common interview questions
    - Company culture and values
    - Recent company news and developments
    - Employee experiences and interview tips

    Generate 3-5 specific search queries that will help create a comprehensive interview preparation roadmap.`,
    schema: z.object({
      queries: z.array(z.object({
        query: z.string().describe('Search query for interview research'),
        purpose: z.string().describe('What information this query aims to find')
      }))
    }),
  });

  return res.object.queries;
}

// Perform research using the generated queries
async function performInterviewResearch(queries: Array<{ query: string; purpose: string }>) {
  const limit = pLimit(ConcurrencyLimit);
  
  const researchResults = await Promise.all(
    queries.map(queryItem =>
      limit(async () => {
        try {
          const result = await firecrawl.search(queryItem.query, {
            timeout: 15000,
            limit: 5,
            scrapeOptions: { formats: ['markdown'] },
          });

          const contents = compact(result.data.map(item => item.markdown)).map(content =>
            trimPrompt(content, 25_000),
          );

          log(`Research completed for: ${queryItem.query}`);

          return {
            query: queryItem.query,
            purpose: queryItem.purpose,
            contents,
            urls: compact(result.data.map(item => item.url))
          };
        } catch (error) {
          log(`Error researching query: ${queryItem.query}`, error);
          return {
            query: queryItem.query,
            purpose: queryItem.purpose,
            contents: [],
            urls: []
          };
        }
      })
    )
  );

  return researchResults;
}

// Generate the final interview roadmap
async function generateFinalRoadmap({
  companyName,
  jobDescription,
  jobRole,
  weblink,
  researchData,
}: {
  companyName: string;
  jobDescription: string;
  jobRole: string;
  weblink?: string;
  researchData: Array<{
    query: string;
    purpose: string;
    contents: string[];
    urls: string[];
  }>;
}) {
  const researchContent = researchData
    .map(item => `
Query: ${item.query}
Purpose: ${item.purpose}
Content: ${item.contents.join('\n\n')}
`)
    .join('\n\n---\n\n');

  const res = await generateObject({
    model: getModel(),
    system: interviewRoadmapPrompt(),
    prompt: trimPrompt(`
Create a comprehensive interview preparation roadmap for:

Company: ${companyName}
Role: ${jobRole}
Job Description: ${jobDescription}
${weblink ? `Company Website: ${weblink}` : ''}

Research Data:
${researchContent}

Based on this information, create a detailed roadmap that includes:
1. Different interview rounds with specific topics
2. Difficulty levels for each topic
3. Preparation modules and resources
4. Timeline for preparation
5. Company-specific tips and insights

Return the roadmap in the specified JSON format.
`),
    schema: InterviewRoadmapSchema,
  });

  return res.object;
}

// Legacy functions for backward compatibility
async function generateSerpQueries({
  query,
  numQueries = 3,
  learnings,
}: {
  query: string;
  numQueries?: number;
  learnings?: string[];
}) {
  const res = await generateObject({
    model: getModel(),
    system: systemPrompt(),
    prompt: `Given the following interview preparation research prompt from the user, generate a list of SERP queries to research company information, interview processes, and preparation strategies. Focus on queries that will help with interview preparation including:

    - Company background, culture, and values
    - Technical skills and requirements for the role
    - Interview process and rounds
    - Common interview questions
    - Industry insights and company news
    - Employee experiences and reviews
    
    Return a maximum of ${numQueries} queries, but feel free to return less if the original prompt is clear. Make sure each query is unique and not similar to each other: <prompt>${query}</prompt>\n\n${
      learnings
        ? `Here are some learnings from previous research, use them to generate more specific queries: ${learnings.join(
            '\n',
          )}`
        : ''
    }`,
    schema: z.object({
      queries: z
        .array(
          z.object({
            query: z.string().describe('The SERP query for company interview research'),
            researchGoal: z
              .string()
              .describe(
                'Describe the specific interview preparation goal this query aims to accomplish, including what information we need to find and how it will help with interview preparation. Be specific about interview-related insights.',
              ),
          }),
        )
        .describe(`List of SERP queries for interview preparation research, max of ${numQueries}`),
    }),
  });
  log(`Created ${res.object.queries.length} queries`, res.object.queries);

  return res.object.queries.slice(0, numQueries);
}

async function processSerpResult({
  query,
  result,
  numLearnings = 4,
  numFollowUpQuestions = 3,
}: {
  query: string;
  result: SearchResponse;
  numLearnings?: number;
  numFollowUpQuestions?: number;
}) {
  const contents = compact(result.data.map(item => item.markdown)).map(content =>
    trimPrompt(content, 25_000),
  );
  log(`Ran ${query}, found ${contents.length} contents`);

  const res = await generateObject({
    model: getModel(),
    abortSignal: AbortSignal.timeout(60_000),
    system: systemPrompt(),
    prompt: trimPrompt(
      `Given the following contents from a SERP search for interview preparation research query <query>${query}</query>, generate a list of learnings focused on interview preparation. Return a maximum of ${numLearnings} learnings, but feel free to return less if the contents are clear. 

      Focus on extracting information that helps with interview preparation including:
      - Company culture, values, and work environment
      - Technical skills and requirements
      - Interview process details and rounds
      - Common interview questions and answers
      - Company-specific insights and recent developments
      - Employee experiences and interview tips
      
      Make sure each learning is unique and not similar to each other. The learnings should be concise and to the point, as detailed and information dense as possible. Include any entities like people, places, companies, products, technologies, etc., as well as any exact metrics, numbers, or dates. The learnings will be used to prepare comprehensive interview guidance.\n\n<contents>${contents
        .map(content => `<content>\n${content}\n</content>`)
        .join('\n')}</contents>`,
    ),
    schema: z.object({
      learnings: z.array(z.string()).describe(`List of interview preparation learnings, max of ${numLearnings}`),
      followUpQuestions: z
        .array(z.string())
        .describe(
          `List of follow-up questions to research interview preparation topics further, max of ${numFollowUpQuestions}`,
        ),
    }),
  });
  log(`Created ${res.object.learnings.length} learnings`, res.object.learnings);

  return res.object;
}

export async function writeFinalReport({
  prompt,
  learnings,
  visitedUrls,
}: {
  prompt: string;
  learnings: string[];
  visitedUrls: string[];
}) {
  const learningsString = learnings
    .map(learning => `<learning>\n${learning}\n</learning>`)
    .join('\n');

  const res = await generateObject({
    model: getModel(),
    system: systemPrompt(),
    prompt: trimPrompt(
      `Given the following interview preparation research prompt from the user, write a comprehensive interview preparation report using the learnings from research. The report should be detailed and well-structured, aiming for 4-6 pages. Include ALL the learnings from research and organize them into the following sections:

      1. **Company Overview**
         - Company background, mission, and values
         - Recent news and developments
         - Company culture and work environment
         - Industry position and competitors

      2. **Role Analysis**
         - Job requirements and responsibilities
         - Required technical skills
         - Preferred qualifications
         - Career growth opportunities

      3. **Interview Process**
         - Interview rounds and stages (with detailed descriptions)
         - Timeline and duration
         - Interview format (remote/in-person)
         - Interviewers and their backgrounds

      4. **Preparation Strategy**
         - Technical preparation (specific skills to focus on)
         - Behavioral preparation (STAR method, common questions)
         - Company-specific preparation
         - Mock interview suggestions

      5. **Common Interview Questions**
         - Technical questions with sample answers
         - Behavioral questions with frameworks
         - Company-specific questions
         - Questions to ask the interviewer

      6. **Success Tips and Best Practices**
         - Interview day preparation
         - Communication strategies
         - Follow-up actions
         - Red flags to watch for

      Make the report actionable and specific, including concrete examples and practical advice:\n\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from previous research:\n\n<learnings>\n${learningsString}\n</learnings>`,
    ),
    schema: z.object({
      reportMarkdown: z.string().describe('Comprehensive interview preparation report in Markdown format'),
    }),
  });

  // Append the visited URLs section to the report
  const urlsSection = `\n\n## Sources and References\n\n${visitedUrls.map(url => `- ${url}`).join('\n')}`;
  return res.object.reportMarkdown + urlsSection;
}

export async function writeFinalAnswer({
  prompt,
  learnings,
}: {
  prompt: string;
  learnings: string[];
}) {
  const learningsString = learnings
    .map(learning => `<learning>\n${learning}\n</learning>`)
    .join('\n');

  const res = await generateObject({
    model: getModel(),
    system: systemPrompt(),
    prompt: trimPrompt(
      `Given the following prompt from the user, write a final answer on the topic using the learnings from research. Follow the format specified in the prompt. Do not yap or babble or include any other text than the answer besides the format specified in the prompt. Keep the answer as concise as possible - usually it should be just a few words or maximum a sentence. Try to follow the format specified in the prompt (for example, if the prompt is using Latex, the answer should be in Latex. If the prompt gives multiple answer choices, the answer should be one of the choices).\n\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from research on the topic that you can use to help answer the prompt:\n\n<learnings>\n${learningsString}\n</learnings>`,
    ),
    schema: z.object({
      exactAnswer: z
        .string()
        .describe('The final answer, make it short and concise, just the answer, no other text'),
    }),
  });

  return res.object.exactAnswer;
}

export async function deepResearch({
  query,
  breadth,
  depth,
  learnings = [],
  visitedUrls = [],
  onProgress,
}: {
  query: string;
  breadth: number;
  depth: number;
  learnings?: string[];
  visitedUrls?: string[];
  onProgress?: (progress: ResearchProgress) => void;
}): Promise<ResearchResult> {
  const progress: ResearchProgress = {
    currentDepth: depth,
    totalDepth: depth,
    currentBreadth: breadth,
    totalBreadth: breadth,
    totalQueries: 0,
    completedQueries: 0,
  };

  const reportProgress = (update: Partial<ResearchProgress>) => {
    Object.assign(progress, update);
    onProgress?.(progress);
  };

  const serpQueries = await generateSerpQueries({
    query,
    learnings,
    numQueries: breadth,
  });

  reportProgress({
    totalQueries: serpQueries.length,
    currentQuery: serpQueries[0]?.query,
  });

  const limit = pLimit(ConcurrencyLimit);

  const results = await Promise.all(
    serpQueries.map(serpQuery =>
      limit(async () => {
        try {
          const result = await firecrawl.search(serpQuery.query, {
            timeout: 15000,
            limit: 5,
            scrapeOptions: { formats: ['markdown'] },
          });

          // Collect URLs from this search
          const newUrls = compact(result.data.map(item => item.url));
          const newBreadth = Math.ceil(breadth / 2);
          const newDepth = depth - 1;

          const newLearnings = await processSerpResult({
            query: serpQuery.query,
            result,
            numFollowUpQuestions: newBreadth,
          });
          const allLearnings = [...learnings, ...newLearnings.learnings];
          const allUrls = [...visitedUrls, ...newUrls];

          if (newDepth > 0) {
            log(`Researching deeper, breadth: ${newBreadth}, depth: ${newDepth}`);

            reportProgress({
              currentDepth: newDepth,
              currentBreadth: newBreadth,
              completedQueries: progress.completedQueries + 1,
              currentQuery: serpQuery.query,
            });

            const nextQuery = `
            Previous research goal: ${serpQuery.researchGoal}
            Follow-up research directions: ${newLearnings.followUpQuestions.map(q => `\n${q}`).join('')}
          `.trim();

            return deepResearch({
              query: nextQuery,
              breadth: newBreadth,
              depth: newDepth,
              learnings: allLearnings,
              visitedUrls: allUrls,
              onProgress,
            });
          } else {
            reportProgress({
              currentDepth: 0,
              completedQueries: progress.completedQueries + 1,
              currentQuery: serpQuery.query,
            });
            return {
              learnings: allLearnings,
              visitedUrls: allUrls,
            };
          }
        } catch (e: any) {
          if (e.message && e.message.includes('Timeout')) {
            log(`Timeout error running query: ${serpQuery.query}: `, e);
          } else {
            log(`Error running query: ${serpQuery.query}: `, e);
          }
          return {
            learnings: [],
            visitedUrls: [],
          };
        }
      }),
    ),
  );

  return {
    learnings: [...new Set(results.flatMap(r => r.learnings))],
    visitedUrls: [...new Set(results.flatMap(r => r.visitedUrls))],
  };
}
