const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateInternshipEmail = async (student, opportunity) => {
  const prompt = `You are a professional email writer. Generate a personalized, professional internship application email from a student to an HR manager.

STUDENT PROFILE:
- Name: ${student.full_name}
- Email: ${student.email}
- Phone: ${student.phone || 'Not provided'}
- University: ${student.university}
- Level: ${student.level}
- Field of Study: ${student.field_of_study}

OPPORTUNITY:
- Position: ${opportunity.title}
- Company: ${opportunity.company_name}
- Location: ${opportunity.location}

Generate ONLY the email body (200-250 words).`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 450,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI error:', error);
    throw new Error('Failed to generate email');
  }
};

const generateEmailSubject = async (type, data) => {
  const prompt = `Generate a professional email subject line (under 60 characters). Respond with ONLY the subject line.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 60,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    return `Application - ${data.student_name || 'Student'}`;
  }
};

module.exports = {
  generateInternshipEmail,
  generateEmailSubject,
};
