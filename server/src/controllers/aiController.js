import { GoogleGenerativeAI } from "@google/generative-ai";
import { successResponse, errorResponse } from '../utils/helpers.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Suggests a priority for a task based on title and description.
 * POST /api/tasks/ai/suggest-priority
 */
export const suggestPriority = async (req, res, next) => {
    try {
        const { title, description } = req.body;
        if (!title) return errorResponse(res, 'Title is required', 400);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            You are a project management assistant. Based on the following task details, suggest a priority level: "low", "medium", "high", or "urgent".
            Respond with ONLY the priority word in lowercase.

            Task Title: ${title}
            Task Description: ${description || 'No description provided'}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const priority = response.text().trim().toLowerCase();

        // Validate that it's one of the expected values
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        const finalPriority = validPriorities.includes(priority) ? priority : 'medium';

        return successResponse(res, { priority: finalPriority }, 'Priority suggested');
    } catch (err) {
        console.error('AI Suggestion Error:', err);
        // Fallback if AI fails
        return successResponse(res, { priority: 'medium' }, 'Fallback priority used');
    }
};
