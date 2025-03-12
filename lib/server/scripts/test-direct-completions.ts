import { OpenAI } from "openai";
import fs from 'fs';
import path from 'path';
import os from 'os';
import pdfParse from 'pdf-parse-fork'
import dotenv from 'dotenv';

// Create OpenAI chat completion with a set of files and the similar asssitant instructions to app/api/assistants/route.ts

// Load environment variables from .env.local
dotenv.config({ path: '../../../.env.local' });

const openai = new OpenAI();

// Function to expand tilde in file paths
function expandTildePath(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    const homeDir = os.homedir();
    return filePath.replace(/^~(?=$|\/|\\)/, homeDir);
  }
  return filePath;
}

// Command line arguments handler
function parseArgs() {
  const args = process.argv.slice(2); // Remove node and script name

  if (args.length < 2) {
    console.error('Usage: node test-completions.js --job=<job_description_file> <work_exp_file1> <work_exp_file2> ...');
    process.exit(1);
  }

  // Find the job description argument
  const jobArgIndex = args.findIndex(arg => arg.startsWith('--job='));
  if (jobArgIndex === -1) {
    console.error('Error: Job description file must be specified with --job=<filename>');
    process.exit(1);
  }

  // Extract job description filename and expand tilde if present
  let jobDescriptionFile = args[jobArgIndex].substring('--job='.length);
  jobDescriptionFile = expandTildePath(jobDescriptionFile);

  // Remove the job arg from the args array
  const newArgs = [...args];
  newArgs.splice(jobArgIndex, 1);

  // The remaining arguments are work experience files - expand tilde in those too
  const workExperienceFiles = newArgs.map(file => expandTildePath(file));

  if (workExperienceFiles.length === 0) {
    console.error('Error: At least one work experience file must be provided');
    process.exit(1);
  }

  return { jobDescriptionFile, workExperienceFiles };
}

// Function to check if file is a PDF
function isPdf(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.pdf';
}

// Function to read PDF file and extract text
async function readPdfFile(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);

    // Use a try/catch specifically for the PDF parsing
    try {
      const pdfData = await pdfParse(dataBuffer, {
        // Disable the version check that reads test files
        version: "default"
      });
      return pdfData.text;
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError);
      throw new Error(`Failed to parse PDF: ${String(pdfError)}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error reading PDF file ${filePath}: ${errorMessage}`);
    process.exit(1);
  }
  return '';
}

// Function to read file contents
function readTextFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error reading file ${filePath}: ${errorMessage}`);
    process.exit(1);
  }
  return '';
}

// Function to read any file (text or PDF)
async function readFileContent(filePath: string): Promise<string> {
  if (isPdf(filePath)) {
    return await readPdfFile(filePath);
  } else {
    return readTextFile(filePath);
  }
}

async function main() {
  try {
    // Parse the arguments
    const { jobDescriptionFile, workExperienceFiles } = parseArgs();
    console.log("Job Description File:", jobDescriptionFile);
    console.log("Work Experience Files:", workExperienceFiles);

    // Read all file contents
    console.log("Reading input files...");
    const jobDescription = await readFileContent(jobDescriptionFile);
    const workExperiencesPromises = workExperienceFiles.map(async file => {
      return {
        filename: path.basename(file),
        content: await readFileContent(file)
      };
    });
    const workExperiences = await Promise.all(workExperiencesPromises);

    // Format project files content
    const projectFiles = workExperiences.map(exp =>
      `## ${exp.filename}\n\n${exp.content}\n`
    ).join('\n');

    const developerContent = `# Your Role

You are a professional resume-building assistant specialized in crafting resumes tailored precisely to job descriptions.

# Resume Creation Guidelines

Creating a resume for an **AI startup engineering leadership** role requires balancing technical credibility with leadership achievements, in a format that busy startup recruiters can quickly absorb. Below are best practices tailored to AI startup environments:

## 1. Ideal Formatting and Structure for Readability and Impact

- **Keep it concise:** Aim for a one-page resume if possible; two pages only if necessary.
- **Clear, scannable layout:** Use standard sections with clear headings (*Summary, Experience, Skills, Education*) so information is easy to find. Highlight key items (job titles, companies, technologies) clearly.
- **Bullet-point achievements:** Each bullet should start with a strong action verb and describe an accomplishment or result, e.g., *"Built CMS in Python reducing page updates from 1 hour to 18 mins (~70% reduction).""*
- **Visual clarity:** Maintain clean design, plenty of white space, readable fonts (Arial, Calibri), and consistent alignment. Avoid images or graphics.
- **Optional summary or headline:** Briefly highlight your experience and strengths relevant to the role, e.g., *"Engineering Manager with 8+ years in AI/ML, deployed NLP products at scale."*

## 2. Key Content Areas: Leadership, AI Technical Expertise, and Startup Achievements

- **Leadership experience:** Clearly showcase roles managing teams and projects, specifying size and outcomes. Highlight how you led through your team and demonstrated continuous growth in responsibility.
- **AI-specific technical expertise:** Integrate AI/ML skills into accomplishments. Demonstrate expertise by mentioning applied technologies in context, e.g., *"Deployed NLP model with TensorFlow, improving accuracy by 15%."* List core technical skills relevant to the job.
- **Startup-relevant achievements:** Emphasize initiative, adaptability, entrepreneurial experience, cross-functional roles, or high-growth phases. Showcase examples like launching V1 products, scaling MVPs, or improving key business metrics.

## 3. Highlighting High-Impact Projects, Team Leadership, and Business Outcomes

- **Emphasize outcomes:** Clearly state the impact of your work. Quantify results where possible, e.g., *"Reduced inference latency by 40%, improving user satisfaction."*
- **Provide context:** Clarify metrics clearly, e.g., *"Achieved 89% accuracy, improving from previous 80% baseline."* Avoid vanity metrics; emphasize meaningful business results.
- **Highlight leadership and collaboration:** Detail how you led teams or cross-functional projects, e.g., *"Led engineering and data science team to deliver recommendation system increasing retention 15%."*
- **Showcase business outcomes:** Explicitly link technical work to business value, e.g., *"Implemented ML model saving $500K annually in fraud losses."*

## 4. Common Resume Mistakes to Avoid

- **Too much fluff or irrelevant details:** Keep it focused and relevant; remove trivial information.
- **Generic skill lists with no proof:** List fewer, truly relevant skills, backing each with demonstrated experience.
- **No context or vague descriptions:** Clearly provide context (problem, action, result) to make experience compelling.
- **Keyword stuffing or buzzwords:** Avoid empty clichés or excessive buzzwords. Use keywords meaningfully in context.
- **Highlighting trivial or generic projects:** Avoid common tutorial-based projects unless uniquely implemented.
- **Typos and formatting errors:** Proofread carefully. Ensure formatting consistency and clarity.
- **Dishonesty or exaggeration:** Always represent experience truthfully and accurately.

## 5. Insights from AI Startup Hiring Managers

- **Demonstrated expertise:** Show depth in key technologies through practical examples and evidence.
- **Bias toward action and results:** Highlight initiative, persistence, and execution-driven projects.
- **Unique perspectives and passion:** Include distinctive, personally-driven projects or interests relevant to AI.
- **Impact and business alignment:** Emphasize outcomes relevant to startup business objectives (e.g., revenue growth, user retention).
- **Cultural and stage fit:** Highlight adaptability, entrepreneurial experiences, and cross-functional work relevant to startups.

## 6. Tools and Techniques to Improve Interview Chances (ATS & Keywords)

- **ATS-friendly formatting:** Simple, machine-readable formatting (no images, standard headings).
- **Relevant keywords:** Naturally incorporate keywords from job descriptions into your resume content.
- **Tailored applications:** Customize resume slightly for each job application to match emphasized requirements.
- **LinkedIn and online presence:** Maintain consistency between resume and online profiles (LinkedIn, GitHub).

---
# Project Files

## /job_description.txt
${jobDescription}

${projectFiles}
`;

    console.log("Creating chat completion...");
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: developerContent }],
      model: "gpt-4o"
    });

    console.log(completion.choices[0].message.content);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
