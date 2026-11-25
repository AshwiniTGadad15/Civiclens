import { GoogleGenAI, Type } from '@google/genai';
import type { StructuredAiResponse } from '../types/civic.ts';
import { getDb } from './store.ts';

const LANGUAGE_MAP: Record<string, string> = {
  en: 'English',
  kn: 'Kannada (ಕನ್ನಡ)',
  hi: 'Hindi (हिन्दी)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  ml: 'Malayalam (മലയാളം)',
  mr: 'Marathi (मराठी)',
  bn: 'Bengali (বাংলা)',
};

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please configure it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateCivicAiAnswer(params: {
  question: string;
  localityContext?: string;
  language?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}): Promise<StructuredAiResponse> {
  const ai = getGeminiClient();
  const db = getDb();
  const langCode = params.language && LANGUAGE_MAP[params.language] ? params.language : 'en';
  const languageName = LANGUAGE_MAP[langCode];
  const locality = params.localityContext?.trim() || 'Bengaluru, Karnataka (India)';

  const matchingDepts = db.departments
    .filter(
      (d) =>
        d.state === 'All India' ||
        locality.toLowerCase().includes(d.city.toLowerCase()) ||
        locality.toLowerCase().includes(d.state.toLowerCase())
    )
    .slice(0, 6)
    .map((d) => `- ${d.name} (${d.shortName}): ${d.description} | Official Website: ${d.officialWebsite} | Portal: ${d.complaintPortal}`)
    .join('\n');

  const matchingProjects = db.projects
    .filter(
      (p) =>
        locality.toLowerCase().includes(p.city.toLowerCase()) ||
        locality.toLowerCase().includes(p.locality.toLowerCase())
    )
    .slice(0, 4)
    .map((p) => `- ${p.name} (${p.status}, ${p.departmentName}) — Source: ${p.sourceUrl}`)
    .join('\n');

  const systemInstruction = `You are CivicLens AI, an intelligent, trustworthy civic information assistant for citizens across India.

Core Principles:
1. Respond ENTIRELY in ${languageName} (keep official acronyms like BBMP, BWSSB, BESCOM, CPGRAMS, MoHUA and URLs readable).
2. Be clear, neutral, non-partisan, factual, and citizen-friendly.
3. NEVER invent fake government phone numbers, fake ticket numbers, fake budgets, or unverified laws. Only cite real official Indian government portals (e.g., https://bbmp.gov.in, https://bwssb.karnataka.gov.in, https://bescom.karnataka.gov.in, https://english.bmrc.co.in, https://pgportal.gov.in, https://mohua.gov.in, https://portal.mcgm.gov.in, https://mcdonline.nic.in, https://www.ghmc.gov.in, https://chennaicorporation.gov.in, https://rtionline.gov.in).
4. Explicitly distinguish verified official facts from general civic explanations and note if local ward-specific confirmation should be verified on the official portal.
5. Never claim that CivicLens has automatically filed an official government complaint on the user's behalf.

Active Locality Context: ${locality}

Reference Official Departments in CivicLens Directory:
${matchingDepts || 'Standard Indian Municipal Corporation / Urban Local Body & CPGRAMS (https://pgportal.gov.in)'}

Documented Projects near Context:
${matchingProjects || 'No localized project records matched; advise user to verify state/municipal urban development portals.'}`;

  const historyText = (params.history ?? [])
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'Citizen' : 'CivicLens AI'}: ${m.content}`)
    .join('\n');

  const prompt = `${historyText ? `Recent conversation:\n${historyText}\n\n` : ''}Citizen question (${locality}): ${params.question}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          directAnswer: {
            type: Type.STRING,
            description: 'Concise 2-3 sentence direct answer to the citizen question.',
          },
          explanation: {
            type: Type.STRING,
            description: 'Clear, accessible civic explanation of how the system or issue works in India.',
          },
          possibleCauses: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 to 4 realistic technical or administrative causes.',
          },
          citizenImpact: {
            type: Type.STRING,
            description: 'How this civic issue or policy affects daily life, safety, or public services.',
          },
          likelyDepartment: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              jurisdiction: { type: Type.STRING },
              confidenceNote: { type: Type.STRING },
            },
            required: ['name', 'jurisdiction', 'confidenceNote'],
          },
          recommendedSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 to 5 practical, lawful steps the citizen can take next.',
          },
          sources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                label: { type: Type.STRING },
              },
              required: ['title', 'url', 'label'],
            },
            description: 'Authoritative Indian government portal URLs only (https://...).',
          },
          certaintyNote: {
            type: Type.STRING,
            description: 'Explicit note distinguishing verified official facts, general civic explanations, and AI-generated guidance.',
          },
        },
        required: [
          'directAnswer',
          'explanation',
          'possibleCauses',
          'citizenImpact',
          'likelyDepartment',
          'recommendedSteps',
          'sources',
          'certaintyNote',
        ],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('CivicLens AI returned an empty response. Please retry your question.');
  }

  const parsed = JSON.parse(rawText) as Omit<StructuredAiResponse, 'languageName'>;
  const safeSources = (parsed.sources ?? [])
    .filter((s) => typeof s.url === 'string' && /^https?:\/\//i.test(s.url))
    .map((s) => ({
      title: s.title,
      url: s.url,
      label:
        s.label === 'Officially Published or Confirmed' || s.label === 'Independently Verified'
          ? s.label
          : ('AI Generated' as const),
    }));

  return {
    directAnswer: parsed.directAnswer,
    explanation: parsed.explanation,
    possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses : [],
    citizenImpact: parsed.citizenImpact,
    likelyDepartment: parsed.likelyDepartment ?? {
      name: 'Local Municipal Corporation / Urban Local Body',
      jurisdiction: locality,
      confidenceNote: 'Verify exact ward jurisdiction on your city municipal portal.',
    },
    recommendedSteps: Array.isArray(parsed.recommendedSteps) ? parsed.recommendedSteps : [],
    sources: safeSources,
    certaintyNote:
      parsed.certaintyNote ||
      'AI Generated explanation based on general Indian municipal frameworks. Verify official notices and helplines directly on government portals.',
    languageName,
  };
}
