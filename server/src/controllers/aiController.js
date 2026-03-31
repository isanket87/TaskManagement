import { GoogleGenerativeAI } from "@google/generative-ai";
import { successResponse, errorResponse } from '../utils/helpers.js';
import prisma from '../utils/prisma.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Suggests a priority for a task based on title and description.
 * POST /api/tasks/ai/suggest-priority
 */
export const suggestPriority = async (req, res, next) => {
    try {
        const { title, description } = req.body;
        if (!title) return errorResponse(res, 'Title is required', 400);

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
            You are a project management assistant. Based on the following task details, suggest a priority level: "low", "medium", "high", or "urgent".
            Respond with ONLY the priority word in lowercase.

            Task Title: ${title}
            Task Description: ${description || 'No description provided'}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const priority = response.text().trim().toLowerCase();

        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        const finalPriority = validPriorities.includes(priority) ? priority : 'medium';

        return successResponse(res, { priority: finalPriority }, 'Priority suggested');
    } catch (err) {
        console.error('AI Suggestion Error:', err);
        return successResponse(res, { priority: 'medium' }, 'Fallback priority used');
    }
};

/**
 * Generates a draft reply for a message or conversation context.
 * POST /api/ai/generate-draft
 */
export const generateDraft = async (req, res, next) => {
    try {
        const { context, instruction } = req.body;
        if (!context) return errorResponse(res, 'Context is required', 400);

        console.log('[AI Draft] Received Context:', context.substring(0, 100) + '...');

        const model = genAI.getGenerativeModel({ 
            model: "gemini-flash-latest",
            generationConfig: {
                maxOutputTokens: 200,
                temperature: 0.8,
            },
        });

        // More assertive system instruction to prevent "How can I help you" loops
        const prompt = `
            SYSTEM: You are an expert communication assistant for the Brioright Project Management platform.
            TASK: Generate a professional, natural, and helpful reply to the conversation below.
            
            CONVERSATION HISTORY:
            ${context}

            ${instruction ? `USER INSTRUCTION: ${instruction}` : 'INSTRUCTION: Write a reply that logically continues this conversation. Be concise (max 2 sentences).'}

            CRITICAL RULES:
            - DO NOT offer general help (e.g. "How can I help you today?").
            - DO NOT introduce yourself.
            - DO NOT use generic AI filler.
            - Write ONLY the message content itself.
            - If you cannot generate a logical reply, write a natural polite acknowledgment.

            DRAFT REPLY:
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const draft = response.text().trim().replace(/^["']|["']$/g, '');
        
        console.log('[AI Draft] Raw Output:', draft);

        // Final safety check for generic phrases
        const lowerDraft = draft.toLowerCase();
        if (lowerDraft.includes("how can i help you") || lowerDraft.includes("i am an ai")) {
             return successResponse(res, { draft: "Got it, looking into this now." }, 'Fallback used');
        }

        return successResponse(res, { draft }, 'Draft generated');
    } catch (err) {
        console.error('AI Draft Error:', err);
        return errorResponse(res, 'Failed to generate draft', 500);
    }
};

/**
 * Summarizes a comment thread for a task.
 * POST /api/tasks/:taskId/ai/summarize-comments
 */
export const summarizeComments = async (req, res, next) => {
    try {
        const { taskId } = req.params;
        
        const comments = await prisma.comment.findMany({
            where: { taskId },
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        });

        if (comments.length === 0) {
            return successResponse(res, { summary: 'No comments to summarize.' });
        }

        const commentThread = comments.map(c => `${c.author.name}: ${c.text}`).join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
            You are a project management assistant. Summarize the following task comment thread into a concise paragraph (maximum 3-4 sentences). 
            Focus on the main points discussed, any decisions made, and pending actions.
            
            Comment Thread:
            ${commentThread}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text().trim();

        return successResponse(res, { summary }, 'Comments summarized');
    } catch (err) {
        console.error('AI Summarization Error:', err);
        return errorResponse(res, 'Failed to summarize comments', 500);
    }
};

/**
 * Generates a full project and tasks from a text description.
 * POST /api/workspaces/:slug/projects/ai/generate
 */
export const generateProjectFromPrompt = async (req, res, next) => {
    try {
        const { prompt: userPrompt } = req.body;
        const workspaceId = req.workspace.id; // from requireWorkspace middleware
        const userId = req.user.id;

        if (!userPrompt) return errorResponse(res, 'Prompt is required', 400);

        const model = genAI.getGenerativeModel({ 
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const systemPrompt = `
            You are an expert Agile Project Manager. The user will give you a project idea.
            Your job is to generate a JSON response representing a new project board and a backlog of 5 to 8 specific, actionable tasks.
            
            Strictly return a valid JSON object matching this schema:
            {
                "name": "A short, punchy title for the project",
                "description": "A 1-2 sentence description",
                "color": "A hex color code representing the theme (e.g. #3b82f6)",
                "tasks": [
                    {
                        "title": "Clear task title",
                        "description": "Detailed acceptance criteria or context",
                        "priority": "low" | "medium" | "high" | "urgent",
                        "status": "todo" | "in_progress" | "done"
                    }
                ]
            }

            Rule 1: Distribute the tasks meaningfully. Do NOT put everything in 'todo'. Put some in 'in_progress' and maybe 1 or 2 in 'done' to make the board look active, simulating a project in motion.
            Rule 2: Provide technical or substantive details in the task descriptions.
            
            User Idea: "${userPrompt}"
        `;

        const result = await model.generateContent(systemPrompt);
        const responseData = result.response.text();
        
        let parsedData;
        try {
            parsedData = JSON.parse(responseData);
        } catch (e) {
            console.error("Failed to parse AI JSON output:", responseData);
            return errorResponse(res, 'Failed to generate project structure', 500);
        }

        // Run in a transaction to ensure both project and tasks are created
        const newProject = await prisma.$transaction(async (tx) => {
            const project = await tx.project.create({
                data: {
                    name: parsedData.name,
                    description: parsedData.description,
                    color: parsedData.color || '#6366f1',
                    workspaceId,
                    ownerId: userId,
                    members: {
                        create: [{ userId, role: 'owner' }]
                    }
                }
            });

            if (parsedData.tasks && parsedData.tasks.length > 0) {
                const tasksToCreate = parsedData.tasks.map((t, index) => ({
                    projectId: project.id,
                    title: t.title,
                    description: t.description || '',
                    priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority) ? t.priority : 'medium',
                    status: ['todo', 'in_progress', 'done', 'in_review'].includes(t.status) ? t.status : 'todo',
                    createdById: userId,
                    position: index + 1
                }));

                await tx.task.createMany({
                    data: tasksToCreate
                });
            }

            return project;
        });

        return successResponse(res, newProject, 'Project generated successfully', 201);
    } catch (err) {
        console.error('AI Generate Project Error:', err);
        return errorResponse(res, 'Failed to generate project', 500);
    }
};
