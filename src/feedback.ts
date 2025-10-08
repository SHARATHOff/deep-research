import { generateObject } from 'ai';
import { z } from 'zod';

import { getModel } from './ai/providers';
import { systemPrompt } from './prompt';

export async function generateFeedback({
  query,
  numQuestions = 4,
}: {
  query: string;
  numQuestions?: number;
}) {
  const userFeedback = await generateObject({
    model: getModel(),
    system: systemPrompt(),
    prompt: `Given the following interview preparation research query from the user, ask specific follow-up questions to better understand their interview preparation needs. Focus on:
    - Their experience level and background
    - Specific concerns or areas they want to focus on
    - Interview format preferences (remote/in-person, technical focus, etc.)
    - Timeline and urgency
    - Any specific challenges they've faced in previous interviews
    
    Return a maximum of ${numQuestions} questions, but feel free to return less if the original query is clear: <query>${query}</query>`,
    schema: z.object({
      questions: z
        .array(z.string())
        .describe(
          `Follow up questions to clarify interview preparation research needs, max of ${numQuestions}`,
        ),
    }),
  });

  return userFeedback.object.questions.slice(0, numQuestions);
}
