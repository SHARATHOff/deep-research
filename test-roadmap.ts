#!/usr/bin/env tsx

import { generateInterviewRoadmap } from './src/deep-research';

async function testInterviewRoadmap() {
  try {
    console.log('Testing Interview Roadmap Generation...\n');
    
    const roadmap = await generateInterviewRoadmap({
      companyName: 'Google',
      jobDescription: 'We are looking for a Software Development Engineer to join our team. You will be responsible for designing, developing, and maintaining scalable software systems. Requirements include strong programming skills in Python/Java, experience with cloud platforms, and knowledge of data structures and algorithms.',
      jobRole: 'SDE-1',
      weblink: 'https://careers.google.com'
    });

    console.log('Generated Roadmap:');
    console.log(JSON.stringify(roadmap, null, 2));
    
  } catch (error) {
    console.error('Error generating roadmap:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testInterviewRoadmap();
}
