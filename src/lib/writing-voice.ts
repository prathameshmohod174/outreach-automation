export type WritingVoiceProfile = {
  profileName: string;
  identity: string;
  tone: string;
  personality: string[];
  writingRules: string[];
  avoid: string[];
  preferredClosing: string[];
  targetLength: string;
};

export const DEFAULT_WRITING_VOICE: WritingVoiceProfile = {
  profileName: "Prathamesh — Natural Professional",
  identity: "Filmmaker and visual storyteller working across cinematography, videography, photography and video editing under Random Hours.",
  tone: "Natural, conversational, professional, respectful and understated.",
  personality: ["Professional", "Sincere", "Humble", "Observant", "Curious", "Collaborative", "Practical"],
  writingRules: [
    "Sound like a real person writing individually to another creative professional.",
    "Express interest without exaggerating enthusiasm.",
    "Be confident about actual skills but humble about experience.",
    "Use specific observations from the recipient's verified work.",
    "Explain the reason for reaching out early.",
    "Use clear medium-length sentences and familiar vocabulary.",
    "Keep paragraphs short and vary openings and closings naturally.",
    "Prefer direct, sincere language over polished marketing copy."
  ],
  avoid: [
    "Generic AI phrases and corporate jargon",
    "Excessive adjectives or exaggerated praise",
    "Overly enthusiastic sales language",
    "Fake familiarity or claims of having watched work without evidence",
    "Invented experience, job openings or relationships",
    "Forced poetic language and repetitive templates"
  ],
  preferredClosing: [
    "I'd appreciate the opportunity to discuss any suitable openings.",
    "I'd be glad to connect and discuss a possible collaboration."
  ],
  targetLength: "90–150 words"
};
